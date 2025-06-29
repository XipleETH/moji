import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './contractAddresses';

// Importar ABI del contrato
let LOTTO_MOJI_CORE_ABI: any[] = [];
try {
  const abiData = require('./contract-abi-fuji-17utc.json');
  LOTTO_MOJI_CORE_ABI = abiData.abi || abiData;
} catch (error) {
  console.warn('[BlockchainVerification] No se pudo cargar ABI específico, usando ABI básico');
  LOTTO_MOJI_CORE_ABI = [
    "function getMainPoolBalances() view returns (uint256, uint256, uint256, uint256)",
    "function getReserveBalances() view returns (uint256, uint256, uint256)",
    "function getCurrentDay() view returns (uint256)",
    "function DRAW_INTERVAL() view returns (uint256)",
    "function drawTimeUTC() view returns (uint256)",
    "function lastDrawTime() view returns (uint256)",
    "function automationActive() view returns (bool)",
    "function gameActive() view returns (bool)",
    "function ticketCounter() view returns (uint256)",
    "function totalDrawsExecuted() view returns (uint256)",
    "function emergencyPause() view returns (bool)",
    "function getDailyPoolInfo(uint256) view returns (uint256, uint256, uint256, bool, bool, uint8[4])"
  ];
}

// Tipos para los datos de blockchain
export interface MainPools {
  firstPrizeAccumulated: bigint;
  secondPrizeAccumulated: bigint;
  thirdPrizeAccumulated: bigint;
  developmentAccumulated: bigint;
}

export interface ReservePools {
  firstPrizeReserve: bigint;
  secondPrizeReserve: bigint;
  thirdPrizeReserve: bigint;
}

export interface DailyPoolInfo {
  totalCollected: bigint;
  mainPoolPortion: bigint;
  reservePortion: bigint;
  distributed: boolean;
  drawn: boolean;
  winningNumbers: number[];
}

export interface BlockchainPoolData {
  mainPools: MainPools;
  reserves: ReservePools;
  currentGameDay: bigint;
  drawInterval: bigint;
  drawTimeUTC: bigint;
  lastDrawTime: bigint;
  automationActive: boolean;
  gameActive: boolean;
  emergencyPause: boolean;
  ticketCounter: bigint;
  totalDraws: bigint;
  dailyPool: DailyPoolInfo | null;
  totals: {
    mainTotal: bigint;
    reserveTotal: bigint;
    dailyTotal: bigint;
  };
  rpcProvider: string;
  blockNumber: bigint;
  timestamp: number;
}

interface ProviderConfig {
  url: string;
  name: string;
  timeout: number;
}

// Múltiples proveedores RPC para Avalanche Fuji con redundancia
const RPC_PROVIDERS: ProviderConfig[] = [
  { url: 'https://api.avax-test.network/ext/bc/C/rpc', name: 'Avalanche Official', timeout: 10000 },
  { url: 'https://avalanche-fuji-c-chain.publicnode.com', name: 'PublicNode', timeout: 8000 },
  { url: 'https://rpc.ankr.com/avalanche_fuji', name: 'Ankr', timeout: 12000 },
  { url: 'https://avalanche-fuji.blockpi.network/v1/rpc/public', name: 'BlockPI', timeout: 10000 },
  { url: 'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc', name: 'Blast API', timeout: 15000 }
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
  
  throw new Error('No se pudo conectar a ningún proveedor RPC de Avalanche Fuji');
}

/**
 * Verifica y obtiene datos completos del blockchain
 */
export async function verifyBlockchainPools(): Promise<BlockchainPoolData> {
  console.log('\n🔍 VERIFICACIÓN COMPLETA DE BLOCKCHAIN - AVALANCHE FUJI');
  console.log('======================================================');
  
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
    console.log(`🏔️ Red: Avalanche Fuji (Chain ID: ${CONTRACT_ADDRESSES.CHAIN_ID})`);
    
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
        contract.getMainPoolBalances(),
        contract.getReserveBalances(),
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
    let dailyPool: DailyPoolInfo | null = null;
    try {
      const dailyPoolData = await contract.getDailyPoolInfo(currentGameDay);
      dailyPool = {
        totalCollected: dailyPoolData[0],
        mainPoolPortion: dailyPoolData[1],
        reservePortion: dailyPoolData[2],
        distributed: dailyPoolData[3],
        drawn: dailyPoolData[4],
        winningNumbers: Array.from(dailyPoolData[5])
      };
      console.log('📅 Información del pool diario obtenida');
    } catch (dailyError) {
      console.warn('⚠️ No se pudo obtener información del pool diario:', dailyError);
      dailyPool = {
        totalCollected: 0n,
        mainPoolPortion: 0n,
        reservePortion: 0n,
        distributed: false,
        drawn: false,
        winningNumbers: [0, 0, 0, 0]
      };
    }

    // Estructurar datos
    const blockchainData: BlockchainPoolData = {
      mainPools: {
        firstPrizeAccumulated: mainPools[0],
        secondPrizeAccumulated: mainPools[1],
        thirdPrizeAccumulated: mainPools[2],
        developmentAccumulated: mainPools[3]
      },
      reserves: {
        firstPrizeReserve: reserves[0],
        secondPrizeReserve: reserves[1],
        thirdPrizeReserve: reserves[2]
      },
      currentGameDay,
      drawInterval,
      drawTimeUTC,
      lastDrawTime,
      automationActive,
      gameActive,
      emergencyPause,
      ticketCounter,
      totalDraws,
      dailyPool,
      totals: {
        mainTotal: mainPools[0] + mainPools[1] + mainPools[2] + mainPools[3],
        reserveTotal: reserves[0] + reserves[1] + reserves[2],
        dailyTotal: dailyPool?.totalCollected || 0n
      },
      rpcProvider: providerName,
      blockNumber,
      timestamp: Date.now()
    };

    // Log de resultados
    console.log('\n✅ VERIFICACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=====================================');
    console.log(`🎮 Juego Activo: ${blockchainData.gameActive}`);
    console.log(`🤖 Automation Activa: ${blockchainData.automationActive}`);
    console.log(`📅 Día del Juego: ${blockchainData.currentGameDay}`);
    console.log(`🎫 Tickets Vendidos: ${blockchainData.ticketCounter}`);
    console.log(`🎯 Sorteos Ejecutados: ${blockchainData.totalDraws}`);
    console.log(`📡 Proveedor RPC: ${blockchainData.rpcProvider}`);
    console.log(`🔗 Bloque: ${blockchainData.blockNumber}`);

    return blockchainData;

  } catch (error) {
    console.error('\n❌ ERROR EN VERIFICACIÓN DE BLOCKCHAIN');
    console.error('=====================================');
    console.error('Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Timeout')) {
        console.error('💡 Sugerencia: Los RPCs de Avalanche Fuji pueden estar lentos. Intenta de nuevo.');
      } else if (error.message.includes('CALL_EXCEPTION')) {
        console.error('💡 Sugerencia: Verifica que el contrato esté desplegado correctamente.');
      } else if (error.message.includes('NETWORK_ERROR')) {
        console.error('💡 Sugerencia: Problemas de conectividad. Verifica tu conexión a internet.');
      }
    }
    
    throw error;
  }
}

// Función legacy para compatibilidad con versiones anteriores
export async function getPoolBalances() {
  try {
    const data = await verifyBlockchainPools();
    return {
      mainPools: data.mainPools,
      reserves: data.reserves,
      totals: data.totals
    };
  } catch (error) {
    console.error('[getPoolBalances] Error:', error);
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
          firstPrizeAccumulated: blockchainData.mainPools.firstPrizeAccumulated,
          secondPrizeAccumulated: blockchainData.mainPools.secondPrizeAccumulated,
          thirdPrizeAccumulated: blockchainData.mainPools.thirdPrizeAccumulated,
          developmentAccumulated: blockchainData.mainPools.developmentAccumulated
        },
        reserves: {
          firstPrizeReserve: blockchainData.reserves.firstPrizeReserve,
          secondPrizeReserve: blockchainData.reserves.secondPrizeReserve,
          thirdPrizeReserve: blockchainData.reserves.thirdPrizeReserve
        },
        dailyPool: {
          totalCollected: blockchainData.dailyPool.totalCollected,
          mainPoolPortion: blockchainData.dailyPool.mainPoolPortion,
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
        currentGameDay: blockchainData.currentGameDay,
        timeToNextDraw: 0,
        automationActive: blockchainData.automationActive,
        gameActive: blockchainData.gameActive,
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
    console.log(`Game Day: ${data.currentGameDay}`);
    console.log(`Ticket Price: ${data.totals.mainTotal} USDC`);
    console.log(`Total Tickets: ${data.ticketCounter}`);
    
    // Calcular tickets esperados vs reales
    const expectedRevenue = Number(data.ticketCounter) * Number(data.totals.mainTotal);
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