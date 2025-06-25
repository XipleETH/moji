import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './contractAddresses';

// ABI completo basado en el contrato LottoMojiCore.sol
const LOTTO_MOJI_CORE_ABI = [
  "function mainPools() view returns (uint256 firstPrizeAccumulated, uint256 secondPrizeAccumulated, uint256 thirdPrizeAccumulated, uint256 developmentAccumulated)",
  "function reserves() view returns (uint256 firstPrizeReserve1, uint256 secondPrizeReserve2, uint256 thirdPrizeReserve3)",
  "function dailyPools(uint256) view returns (uint256 totalCollected, uint256 mainPoolPortion, uint256 reservePortion, uint256 firstPrizeDaily, uint256 secondPrizeDaily, uint256 thirdPrizeDaily, uint256 developmentDaily, bool distributed, uint256 distributionTime, bool drawn, bool reservesSent)",
  "function getCurrentDay() view returns (uint256)",
  "function DRAW_INTERVAL() view returns (uint256)",
  "function drawTimeUTC() view returns (uint256)",
  "function lastDrawTime() view returns (uint256)",
  "function checkUpkeep(bytes) view returns (bool upkeepNeeded, bytes performData)",
  "function automationActive() view returns (bool)",
  "function gameActive() view returns (bool)",
  "function TICKET_PRICE() view returns (uint256)",
  "function ticketCounter() view returns (uint256)",
  "function totalDrawsExecuted() view returns (uint256)",
  "function totalReservesProcessed() view returns (uint256)",
  "function emergencyPause() view returns (bool)",
  "function usdcToken() view returns (address)"
];

interface BlockchainPoolData {
  mainPools: {
    firstPrize: string;
    secondPrize: string;
    thirdPrize: string;
    development: string;
    total: string;
  };
  reserves: {
    firstPrize: string;
    secondPrize: string;
    thirdPrize: string;
    total: string;
  };
  dailyPool: {
    totalCollected: string;
    mainPortion: string;
    reservePortion: string;
    distributed: boolean;
    drawn: boolean;
  };
  contractInfo: {
    currentGameDay: string;
    ticketPrice: string;
    ticketCounter: string;
    totalDraws: string;
    gameActive: boolean;
    automationActive: boolean;
    emergencyPause: boolean;
  };
  totals: {
    systemTotal: string;
    mainTotal: string;
    reserveTotal: string;
    dailyTotal: string;
  };
  timestamp: number;
  blockNumber: string;
}

interface ProviderConfig {
  url: string;
  name: string;
  timeout: number;
}

// Múltiples proveedores RPC para redundancia
const RPC_PROVIDERS: ProviderConfig[] = [
  { url: 'https://sepolia.base.org', name: 'Base Official', timeout: 10000 },
  { url: 'https://base-sepolia.g.alchemy.com/v2/demo', name: 'Alchemy Demo', timeout: 8000 },
  { url: 'https://base-sepolia-rpc.publicnode.com', name: 'PublicNode', timeout: 12000 },
  { url: 'https://base-sepolia.blockpi.network/v1/rpc/public', name: 'BlockPI', timeout: 10000 }
];

/**
 * Crea un provider con failover automático
 */
async function createRobustProvider(): Promise<{ provider: ethers.JsonRpcProvider; providerName: string }> {
  for (const config of RPC_PROVIDERS) {
    try {
      console.log(`[BlockchainVerification] Probando provider: ${config.name}`);
      const provider = new ethers.JsonRpcProvider(config.url, undefined, {
        staticNetwork: true,
        batchMaxCount: 10
      });

      // Test de conectividad rápido
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), config.timeout)
        )
      ]);

      console.log(`[BlockchainVerification] ✅ ${config.name} conectado - Bloque: ${blockNumber}`);
      return { provider, providerName: config.name };
    } catch (error) {
      console.warn(`[BlockchainVerification] ❌ ${config.name} falló:`, error);
    }
  }
  
  throw new Error('No se pudo conectar a ningún proveedor RPC');
}

/**
 * Verifica y obtiene datos completos del blockchain
 */
export async function verifyBlockchainPools(): Promise<BlockchainPoolData> {
  console.log('\n🔍 VERIFICACIÓN COMPLETA DE BLOCKCHAIN');
  console.log('=====================================');
  
  try {
    // Crear provider robusto
    const { provider, providerName } = await createRobustProvider();
    console.log(`📡 Usando provider: ${providerName}`);
    
    // Crear contrato
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.LOTTO_MOJI_CORE,
      LOTTO_MOJI_CORE_ABI,
      provider
    );
    
    console.log(`📋 Contrato: ${CONTRACT_ADDRESSES.LOTTO_MOJI_CORE}`);
    
    // Obtener datos en paralelo con timeouts
    const timeout = 15000; // 15 segundos
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout en llamadas al contrato')), timeout);
    });
    
    console.log('📞 Ejecutando llamadas al contrato...');
    
    const [
      mainPools,
      reserves,
      currentGameDay,
      ticketPrice,
      ticketCounter,
      totalDraws,
      gameActive,
      automationActive,
      emergencyPause,
      drawInterval,
      drawTimeUTC,
      lastDrawTime,
      blockNumber
    ] = await Promise.race([
      Promise.all([
        contract.mainPools(),
        contract.reserves(),
        contract.getCurrentDay(),
        contract.TICKET_PRICE(),
        contract.ticketCounter(),
        contract.totalDrawsExecuted(),
        contract.gameActive(),
        contract.automationActive(),
        contract.emergencyPause(),
        contract.DRAW_INTERVAL(),
        contract.drawTimeUTC(),
        contract.lastDrawTime(),
        provider.getBlockNumber()
      ]),
      timeoutPromise
    ]);
    
    console.log('📊 Datos básicos obtenidos exitosamente');
    
    // Obtener daily pool del día actual
    let dailyPool;
    try {
      dailyPool = await Promise.race([
        contract.dailyPools(currentGameDay),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout daily pool')), 5000)
        )
      ]);
    } catch (error) {
      console.warn('⚠️ Error obteniendo daily pool, usando valores por defecto:', error);
      dailyPool = {
        totalCollected: 0,
        mainPoolPortion: 0,
        reservePortion: 0,
        firstPrizeDaily: 0,
        secondPrizeDaily: 0,
        thirdPrizeDaily: 0,
        developmentDaily: 0,
        distributed: false,
        distributionTime: 0,
        drawn: false,
        reservesSent: false
      };
    }
    
    // Procesar y formatear datos
    const processedData: BlockchainPoolData = {
      mainPools: {
        firstPrize: ethers.formatUnits(mainPools.firstPrizeAccumulated, 6),
        secondPrize: ethers.formatUnits(mainPools.secondPrizeAccumulated, 6),
        thirdPrize: ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6),
        development: ethers.formatUnits(mainPools.developmentAccumulated, 6),
        total: '0' // Se calculará después
      },
      reserves: {
        firstPrize: ethers.formatUnits(reserves.firstPrizeReserve1, 6),
        secondPrize: ethers.formatUnits(reserves.secondPrizeReserve2, 6),
        thirdPrize: ethers.formatUnits(reserves.thirdPrizeReserve3, 6),
        total: '0' // Se calculará después
      },
      dailyPool: {
        totalCollected: ethers.formatUnits(dailyPool.totalCollected, 6),
        mainPortion: ethers.formatUnits(dailyPool.mainPoolPortion, 6),
        reservePortion: ethers.formatUnits(dailyPool.reservePortion, 6),
        distributed: dailyPool.distributed,
        drawn: dailyPool.drawn
      },
      contractInfo: {
        currentGameDay: currentGameDay.toString(),
        ticketPrice: ethers.formatUnits(ticketPrice, 6),
        ticketCounter: ticketCounter.toString(),
        totalDraws: totalDraws.toString(),
        gameActive,
        automationActive,
        emergencyPause
      },
      totals: {
        systemTotal: '0', // Se calculará después
        mainTotal: '0',
        reserveTotal: '0',
        dailyTotal: '0'
      },
      timestamp: Date.now(),
      blockNumber: blockNumber.toString()
    };
    
    // Calcular totales
    const mainTotal = 
      Number(processedData.mainPools.firstPrize) +
      Number(processedData.mainPools.secondPrize) +
      Number(processedData.mainPools.thirdPrize) +
      Number(processedData.mainPools.development);
    
    const reserveTotal = 
      Number(processedData.reserves.firstPrize) +
      Number(processedData.reserves.secondPrize) +
      Number(processedData.reserves.thirdPrize);
    
    const dailyTotal = Number(processedData.dailyPool.totalCollected);
    const systemTotal = mainTotal + reserveTotal + dailyTotal;
    
    // Actualizar totales
    processedData.mainPools.total = mainTotal.toFixed(6);
    processedData.reserves.total = reserveTotal.toFixed(6);
    processedData.totals.mainTotal = mainTotal.toFixed(2);
    processedData.totals.reserveTotal = reserveTotal.toFixed(2);
    processedData.totals.dailyTotal = dailyTotal.toFixed(2);
    processedData.totals.systemTotal = systemTotal.toFixed(2);
    
    // Log detallado de resultados
    console.log('\n💰 DATOS VERIFICADOS DEL BLOCKCHAIN');
    console.log('===================================');
    console.log(`🏦 Main Pools (Accumulated):`);
    console.log(`  - First Prize: ${processedData.mainPools.firstPrize} USDC`);
    console.log(`  - Second Prize: ${processedData.mainPools.secondPrize} USDC`);
    console.log(`  - Third Prize: ${processedData.mainPools.thirdPrize} USDC`);
    console.log(`  - Development: ${processedData.mainPools.development} USDC`);
    console.log(`  - TOTAL MAIN: ${processedData.totals.mainTotal} USDC`);
    
    console.log(`\n🏛️ Reserve Pools:`);
    console.log(`  - First Prize Reserve: ${processedData.reserves.firstPrize} USDC`);
    console.log(`  - Second Prize Reserve: ${processedData.reserves.secondPrize} USDC`);
    console.log(`  - Third Prize Reserve: ${processedData.reserves.thirdPrize} USDC`);
    console.log(`  - TOTAL RESERVES: ${processedData.totals.reserveTotal} USDC`);
    
    console.log(`\n📅 Today's Pool (Game Day ${processedData.contractInfo.currentGameDay}):`);
    console.log(`  - Total Collected: ${processedData.dailyPool.totalCollected} USDC`);
    console.log(`  - Main Portion (80%): ${processedData.dailyPool.mainPortion} USDC`);
    console.log(`  - Reserve Portion (20%): ${processedData.dailyPool.reservePortion} USDC`);
    console.log(`  - Distributed: ${processedData.dailyPool.distributed ? 'Yes' : 'No'}`);
    console.log(`  - Drawn: ${processedData.dailyPool.drawn ? 'Yes' : 'No'}`);
    
    console.log(`\n📊 Contract Status:`);
    console.log(`  - Ticket Price: ${processedData.contractInfo.ticketPrice} USDC`);
    console.log(`  - Total Tickets Sold: ${processedData.contractInfo.ticketCounter}`);
    console.log(`  - Total Draws: ${processedData.contractInfo.totalDraws}`);
    console.log(`  - Game Active: ${processedData.contractInfo.gameActive ? 'Yes' : 'No'}`);
    console.log(`  - Automation Active: ${processedData.contractInfo.automationActive ? 'Yes' : 'No'}`);
    console.log(`  - Emergency Pause: ${processedData.contractInfo.emergencyPause ? 'Yes' : 'No'}`);
    
    console.log(`\n💎 TOTAL SYSTEM: ${processedData.totals.systemTotal} USDC`);
    console.log(`📦 Block Number: ${processedData.blockNumber}`);
    console.log(`🕐 Timestamp: ${new Date(processedData.timestamp).toLocaleString()}`);
    
    return processedData;
    
  } catch (error) {
    console.error('\n❌ ERROR EN VERIFICACIÓN DE BLOCKCHAIN');
    console.error('=====================================');
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Fuerza la sincronización de pools con el blockchain
 */
export async function forcePoolSync(): Promise<void> {
  console.log('\n🔄 FORZANDO SINCRONIZACIÓN CON BLOCKCHAIN');
  console.log('========================================');
  
  try {
    // Obtener datos reales del blockchain
    const blockchainData = await verifyBlockchainPools();
    
    // Actualizar localStorage con datos reales
    const cacheKey = 'lottoMoji_poolsCache';
    const cacheData = {
      data: {
        mainPools: {
          firstPrizeAccumulated: blockchainData.mainPools.firstPrize,
          secondPrizeAccumulated: blockchainData.mainPools.secondPrize,
          thirdPrizeAccumulated: blockchainData.mainPools.thirdPrize,
          developmentAccumulated: blockchainData.mainPools.development
        },
        reserves: {
          firstPrizeReserve1: blockchainData.reserves.firstPrize,
          secondPrizeReserve2: blockchainData.reserves.secondPrize,
          thirdPrizeReserve3: blockchainData.reserves.thirdPrize
        },
        dailyPool: {
          totalCollected: blockchainData.dailyPool.totalCollected,
          mainPoolPortion: blockchainData.dailyPool.mainPortion,
          reservePortion: blockchainData.dailyPool.reservePortion,
          firstPrizeDaily: '0',
          secondPrizeDaily: '0',
          thirdPrizeDaily: '0',
          developmentDaily: '0',
          distributed: blockchainData.dailyPool.distributed,
          distributionTime: '0',
          drawn: blockchainData.dailyPool.drawn,
          reservesSent: false
        },
        currentGameDay: blockchainData.contractInfo.currentGameDay,
        timeToNextDraw: 0,
        automationActive: blockchainData.contractInfo.automationActive,
        gameActive: blockchainData.contractInfo.gameActive,
        upkeepNeeded: false,
        totalUSDC: blockchainData.totals.mainTotal,
        reserveTotalUSDC: blockchainData.totals.reserveTotal,
        loading: false,
        error: null,
        lastSyncTime: blockchainData.timestamp,
        syncAttempts: 0
      },
      timestamp: blockchainData.timestamp
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    
    // Disparar evento personalizado para notificar a los componentes
    const syncEvent = new CustomEvent('blockchainPoolsSync', {
      detail: blockchainData
    });
    window.dispatchEvent(syncEvent);
    
    console.log('\n✅ SINCRONIZACIÓN COMPLETADA');
    console.log('============================');
    console.log(`💰 Main Pools: ${blockchainData.totals.mainTotal} USDC`);
    console.log(`🏛️ Reserves: ${blockchainData.totals.reserveTotal} USDC`);
    console.log(`📅 Today: ${blockchainData.totals.dailyTotal} USDC`);
    console.log(`💎 TOTAL: ${blockchainData.totals.systemTotal} USDC`);
    
    // Forzar refresh de la página si es necesario
    try {
      // Intentar acceder al hook de pools si está disponible globalmente
      if ((window as any).refreshPools) {
        console.log('🔄 Refrescando pools via hook global...');
        (window as any).refreshPools();
      }
      
      // Intentar encontrar botón de refresh en la UI
      const refreshButton = document.querySelector('[data-testid="refresh-pools"]') as HTMLButtonElement;
      if (refreshButton) {
        console.log('🔄 Activando botón de refresh en UI...');
        refreshButton.click();
      } else {
        console.log('⚠️ No se encontró botón de refresh en UI');
      }
    } catch (error) {
      console.log('❌ No se pudo acceder al hook de pools');
    }
    
    // Mostrar información del cache
    console.log('\n💾 Cache Info:');
    console.log(`- Edad del cache: ${Math.round((Date.now() - blockchainData.timestamp) / 1000)} segundos`);
    console.log(`- Total USDC: ${blockchainData.totals.mainTotal}`);
    console.log(`- Reserve USDC: ${blockchainData.totals.reserveTotal}`);
    
  } catch (error) {
    console.error('❌ Error en sincronización forzada:', error);
    throw error;
  }
}

/**
 * Monitorea los pools por un período determinado
 */
export async function monitorPools(durationMinutes: number = 10): Promise<void> {
  console.log(`\n👁️ MONITOREANDO POOLS POR ${durationMinutes} MINUTOS`);
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  const endTime = startTime + (durationMinutes * 60 * 1000);
  let checkCount = 0;
  
  const monitor = async () => {
    try {
      checkCount++;
      const now = Date.now();
      const elapsed = Math.round((now - startTime) / 1000);
      const remaining = Math.round((endTime - now) / 1000);
      
      console.log(`\n📊 CHECK #${checkCount} - Elapsed: ${elapsed}s, Remaining: ${remaining}s`);
      console.log('-'.repeat(40));
      
      const data = await verifyBlockchainPools();
      
      // Verificar si hay cambios significativos
      const previousData = localStorage.getItem('lottoMoji_poolsCache');
      if (previousData) {
        const prev = JSON.parse(previousData);
        const currentTotal = Number(data.totals.systemTotal);
        const previousTotal = Number(prev.data?.totalUSDC || 0) + Number(prev.data?.reserveTotalUSDC || 0);
        
        if (Math.abs(currentTotal - previousTotal) > 0.01) {
          console.log('🚨 CAMBIO DETECTADO EN POOLS!');
          console.log(`Previous Total: ${previousTotal.toFixed(2)} USDC`);
          console.log(`Current Total: ${currentTotal.toFixed(2)} USDC`);
          console.log(`Difference: ${(currentTotal - previousTotal).toFixed(2)} USDC`);
        }
      }
      
      if (now < endTime) {
        setTimeout(monitor, 30000); // Check cada 30 segundos
      } else {
        console.log('\n✅ MONITOREO COMPLETADO');
        console.log(`Total checks realizados: ${checkCount}`);
      }
      
    } catch (error) {
      console.error(`❌ Error en check #${checkCount}:`, error);
      if (Date.now() < endTime) {
        setTimeout(monitor, 60000); // Retry en 60 segundos si hay error
      }
    }
  };
  
  await monitor();
}

/**
 * Diagnóstica problemas de reset de pools
 */
export async function diagnosePoolResetIssue(): Promise<void> {
  console.log('\n🔬 DIAGNÓSTICO DE RESET DE POOLS');
  console.log('================================');
  
  try {
    // Obtener datos actuales
    const data = await verifyBlockchainPools();
    
    // Análisis de timezone
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const saoPaulo = new Date(utc.getTime() - (3 * 3600000)); // UTC-3
    const colombia = new Date(utc.getTime() - (5 * 3600000)); // UTC-5
    
    console.log('\n🌍 ANÁLISIS DE TIMEZONE:');
    console.log(`UTC: ${utc.toISOString()}`);
    console.log(`São Paulo (UTC-3): ${saoPaulo.toLocaleString()}`);
    console.log(`Colombia (UTC-5): ${colombia.toLocaleString()}`);
    
    // Análisis del contrato
    console.log('\n📋 ANÁLISIS DEL CONTRATO:');
    console.log(`Game Day: ${data.contractInfo.currentGameDay}`);
    console.log(`Ticket Price: ${data.contractInfo.ticketPrice} USDC`);
    console.log(`Total Tickets: ${data.contractInfo.ticketCounter}`);
    
    // Calcular tickets esperados vs reales
    const expectedRevenue = Number(data.contractInfo.ticketCounter) * Number(data.contractInfo.ticketPrice);
    const actualRevenue = Number(data.totals.systemTotal);
    
    console.log('\n💰 ANÁLISIS DE REVENUE:');
    console.log(`Expected Revenue: ${expectedRevenue.toFixed(2)} USDC`);
    console.log(`Actual Revenue: ${actualRevenue.toFixed(2)} USDC`);
    console.log(`Difference: ${(actualRevenue - expectedRevenue).toFixed(2)} USDC`);
    
    if (Math.abs(actualRevenue - expectedRevenue) > 0.1) {
      console.log('🚨 DISCREPANCIA DETECTADA EN REVENUE!');
    }
    
    // Verificar si estamos en ventana problemática (16:00 Colombia)
    const colombiaHour = colombia.getHours();
    const colombiaMinute = colombia.getMinutes();
    
    if (colombiaHour === 16) {
      console.log('\n⚠️ VENTANA PROBLEMÁTICA DETECTADA!');
      console.log('Estamos en las 16:00 hora Colombia (ventana de reset reportada)');
      console.log(`Minuto actual: ${colombiaMinute}`);
    }
    
    // Verificar estado del cache
    const cache = localStorage.getItem('lottoMoji_poolsCache');
    if (cache) {
      const cacheData = JSON.parse(cache);
      const cacheAge = Math.round((Date.now() - cacheData.timestamp) / 1000);
      console.log('\n💾 ESTADO DEL CACHE:');
      console.log(`Edad: ${cacheAge} segundos`);
      console.log(`Cache Total: ${Number(cacheData.data?.totalUSDC || 0) + Number(cacheData.data?.reserveTotalUSDC || 0)} USDC`);
      console.log(`Blockchain Total: ${data.totals.systemTotal} USDC`);
    }
    
    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

/**
 * Función de debug para mostrar helpers disponibles
 */
export function debugPools(): void {
  console.log('\n🛠️ BLOCKCHAIN VERIFICATION TOOLS');
  console.log('================================');
  console.log('Funciones disponibles:');
  console.log('• verifyBlockchainPools() - Verificar datos del blockchain');
  console.log('• forcePoolSync() - Forzar sincronización');
  console.log('• monitorPools(minutes) - Monitorear pools por X minutos');
  console.log('• diagnosePoolResetIssue() - Diagnosticar problema de reset');
  console.log('• debugPools() - Mostrar esta ayuda');
  console.log('\nEjemplos:');
  console.log('await verifyBlockchainPools()');
  console.log('await forcePoolSync()');
  console.log('await monitorPools(5)');
  console.log('await diagnosePoolResetIssue()');
}

// Exponer funciones globalmente para debug en consola
if (typeof window !== 'undefined') {
  (window as any).verifyBlockchainPools = verifyBlockchainPools;
  (window as any).forcePoolSync = forcePoolSync;
  (window as any).monitorPools = monitorPools;
  (window as any).diagnosePoolResetIssue = diagnosePoolResetIssue;
  (window as any).debugPools = debugPools;
} 