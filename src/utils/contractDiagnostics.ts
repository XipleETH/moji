import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './contractAddresses';

// Extended ABI for deep contract investigation
const EXTENDED_CONTRACT_ABI = [
  "function mainPools() view returns (uint256 firstPrizeAccumulated, uint256 secondPrizeAccumulated, uint256 thirdPrizeAccumulated, uint256 developmentAccumulated)",
  "function reserves() view returns (uint256 firstPrizeReserve, uint256 secondPrizeReserve, uint256 thirdPrizeReserve)",
  "function dailyPools(uint256) view returns (uint256 totalCollected, uint256 mainPoolPortion, uint256 reservePortion, uint256 firstPrizeDaily, uint256 secondPrizeDaily, uint256 thirdPrizeDaily, uint256 developmentDaily, bool distributed, uint256 distributionTime, bool drawn, bool reservesSent)",
  "function getCurrentDay() view returns (uint256)",
  "function TICKET_PRICE() view returns (uint256)",
  "function ticketCounter() view returns (uint256)",
  "function totalDrawsExecuted() view returns (uint256)",
  "function totalReservesProcessed() view returns (uint256)",
  "function gameActive() view returns (bool)",
  "function automationActive() view returns (bool)",
  "function emergencyPause() view returns (bool)",
  "function lastDrawTime() view returns (uint256)",
  "function drawTimeUTC() view returns (uint256)",
  "function DRAW_INTERVAL() view returns (uint256)",
  "function usdcToken() view returns (address)",
  "function getGameDayTickets(uint256) view returns (uint256[] memory)",
  "function getUserTickets(address) view returns (uint256[] memory)",
  "function getTicketInfo(uint256) view returns (address ticketOwner, uint8[4] numbers, uint256 gameDay, bool isActive, uint8 matches)"
];

// USDC Token ABI for balance checking
const USDC_TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)"
];

/**
 * Creates a robust provider connection
 */
async function createDiagnosticProvider(): Promise<ethers.JsonRpcProvider> {
  const providers = [
    'https://api.avax-test.network/ext/bc/C/rpc',
    'https://base-sepolia.g.alchemy.com/v2/demo',
    'https://base-sepolia-rpc.publicnode.com'
  ];
  
  for (const url of providers) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber(); // Test connection
      return provider;
    } catch (error) {
      console.warn(`Provider ${url} failed, trying next...`);
    }
  }
  
  throw new Error('No RPC providers available');
}

/**
 * Comprehensive contract diagnostics
 */
export async function diagnoseContractIssues() {
  console.log('\n🔬 DIAGNÓSTICO COMPLETO DEL CONTRATO');
  console.log('====================================');
  
  try {
    const provider = await createDiagnosticProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, EXTENDED_CONTRACT_ABI, provider);
    
    // Get basic contract state
    const [
      ticketPrice,
      ticketCounter,
      currentGameDay,
      totalDraws,
      usdcTokenAddress
    ] = await Promise.all([
      contract.TICKET_PRICE(),
      contract.ticketCounter(),
      contract.getCurrentDay(),
      contract.totalDrawsExecuted(),
      contract.usdcToken()
    ]);
    
    console.log('📊 ESTADO BÁSICO:');
    console.log(`- Precio por ticket: ${ethers.formatUnits(ticketPrice, 6)} USDC`);
    console.log(`- Tickets vendidos: ${ticketCounter.toString()}`);
    console.log(`- Día actual: ${currentGameDay.toString()}`);
    console.log(`- Sorteos ejecutados: ${totalDraws.toString()}`);
    console.log(`- Token USDC: ${usdcTokenAddress}`);
    
    // Check contract's USDC balance
    const usdcContract = new ethers.Contract(usdcTokenAddress, USDC_TOKEN_ABI, provider);
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE);
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log('\n💰 BALANCE DEL CONTRATO:');
    console.log(`- Balance USDC real: ${contractBalanceFormatted} USDC`);
    
    // Calculate expected revenue
    const expectedRevenue = Number(ticketCounter) * Number(ethers.formatUnits(ticketPrice, 6));
    const missingAmount = expectedRevenue - Number(contractBalanceFormatted);
    
    console.log(`- Revenue esperado: ${expectedRevenue.toFixed(2)} USDC`);
    console.log(`- Cantidad faltante: ${missingAmount.toFixed(2)} USDC`);
    
    if (missingAmount > 0.1) {
      console.log('🚨 PROBLEMA DETECTADO: Falta USDC en el contrato!');
    }
    
    // Analyze tickets by game day
    console.log('\n🎫 ANÁLISIS DE TICKETS:');
    const ticketsPerDay: Record<string, number> = {};
    const recentTickets: any[] = [];
    
    // Sample recent tickets (last 10)
    const startTicket = Math.max(1, Number(ticketCounter) - 9);
    for (let i = startTicket; i <= Number(ticketCounter); i++) {
      try {
        const ticketInfo = await contract.getTicketInfo(i);
        const gameDay = ticketInfo.gameDay.toString();
        
        ticketsPerDay[gameDay] = (ticketsPerDay[gameDay] || 0) + 1;
        
        if (recentTickets.length < 10) {
          recentTickets.push({
            id: i,
            owner: ticketInfo.ticketOwner,
            gameDay: gameDay,
            isActive: ticketInfo.isActive,
            numbers: ticketInfo.numbers
          });
        }
      } catch (error) {
        console.warn(`Error obteniendo ticket ${i}:`, error);
      }
    }
    
    console.log('📅 Tickets por día:');
    Object.entries(ticketsPerDay).forEach(([day, count]) => {
      console.log(`  - Día ${day}: ${count} tickets`);
    });
    
    // Analyze daily pools
    console.log('\n🏊 ANÁLISIS DE POOLS DIARIAS:');
    const currentDayPool = await contract.dailyPools(currentGameDay);
    
    console.log(`Pool del día actual (${currentGameDay}):`);
    console.log(`  - Total recolectado: ${ethers.formatUnits(currentDayPool.totalCollected, 6)} USDC`);
    console.log(`  - Porción principal: ${ethers.formatUnits(currentDayPool.mainPoolPortion, 6)} USDC`);
    console.log(`  - Porción de reserva: ${ethers.formatUnits(currentDayPool.reservePortion, 6)} USDC`);
    console.log(`  - Distribuido: ${currentDayPool.distributed ? 'Sí' : 'No'}`);
    console.log(`  - Sorteado: ${currentDayPool.drawn ? 'Sí' : 'No'}`);
    
    // Check previous days
    const previousDays: any[] = [];
    for (let i = 1; i <= 5; i++) {
      const dayToCheck = Number(currentGameDay) - i;
      try {
        const dayPool = await contract.dailyPools(dayToCheck);
        if (Number(dayPool.totalCollected) > 0) {
          previousDays.push({
            day: dayToCheck,
            totalCollected: ethers.formatUnits(dayPool.totalCollected, 6),
            distributed: dayPool.distributed,
            drawn: dayPool.drawn
          });
        }
      } catch (error) {
        // Skip if error
      }
    }
    
    if (previousDays.length > 0) {
      console.log('\n📆 DÍAS ANTERIORES CON ACTIVIDAD:');
      previousDays.forEach(day => {
        console.log(`  - Día ${day.day}: ${day.totalCollected} USDC (Distribuido: ${day.distributed ? 'Sí' : 'No'}, Sorteado: ${day.drawn ? 'Sí' : 'No'})`);
      });
    }
    
    // System health analysis
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (missingAmount > 0.1) {
      issues.push(`Faltan ${missingAmount.toFixed(2)} USDC en el contrato`);
      recommendations.push('Investigar transacciones de USDC del contrato');
    }
    
    if (Number(totalDraws) === 0 && Number(ticketCounter) > 0) {
      issues.push('No se han ejecutado sorteos a pesar de tener tickets');
      recommendations.push('Verificar sistema de automatización Chainlink');
    }
    
    const todayCollected = Number(ethers.formatUnits(currentDayPool.totalCollected, 6));
    const todayExpected = ticketsPerDay[currentGameDay.toString()] * Number(ethers.formatUnits(ticketPrice, 6)) || 0;
    
    if (Math.abs(todayCollected - todayExpected) > 0.1) {
      issues.push(`Pool de hoy no coincide: esperado ${todayExpected.toFixed(2)}, actual ${todayCollected.toFixed(2)}`);
      recommendations.push('Verificar lógica de actualización de pools diarias');
    }
    
    const isHealthy = issues.length === 0;
    
    console.log('\n🏥 SALUD DEL SISTEMA:');
    console.log(`Estado: ${isHealthy ? '✅ Saludable' : '❌ Problemas detectados'}`);
    
    if (issues.length > 0) {
      console.log('\n🚨 PROBLEMAS ENCONTRADOS:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
      
      console.log('\n💡 RECOMENDACIONES:');
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    throw error;
  }
}

/**
 * Quick health check
 */
export async function quickHealthCheck(): Promise<void> {
  console.log('\n⚡ CHEQUEO RÁPIDO DE SALUD');
  console.log('==========================');
  
  try {
    const provider = await createDiagnosticProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, EXTENDED_CONTRACT_ABI, provider);
    const usdcContract = new ethers.Contract('0x036CbD53842c5426634e7929541eC2318f3dCF7e', USDC_TOKEN_ABI, provider);
    
    const [ticketCounter, ticketPrice, contractBalance] = await Promise.all([
      contract.ticketCounter(),
      contract.TICKET_PRICE(),
      usdcContract.balanceOf(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE)
    ]);
    
    const expectedRevenue = Number(ticketCounter) * Number(ethers.formatUnits(ticketPrice, 6));
    const actualBalance = Number(ethers.formatUnits(contractBalance, 6));
    const difference = expectedRevenue - actualBalance;
    
    console.log(`🎫 Tickets vendidos: ${ticketCounter.toString()}`);
    console.log(`💰 Revenue esperado: ${expectedRevenue.toFixed(2)} USDC`);
    console.log(`🏦 Balance real: ${actualBalance.toFixed(2)} USDC`);
    console.log(`📊 Diferencia: ${difference.toFixed(2)} USDC`);
    
    if (Math.abs(difference) > 0.1) {
      console.log('🚨 PROBLEMA: El balance no coincide con los tickets vendidos');
    } else {
      console.log('✅ Balance correcto');
    }
    
  } catch (error) {
    console.error('❌ Error en chequeo rápido:', error);
  }
}

/**
 * Investigate missing USDC
 */
export async function investigateMissingUSDC(): Promise<void> {
  console.log('\n🕵️ INVESTIGANDO USDC FALTANTE');
  console.log('==============================');
  
  try {
    const diagnostics = await diagnoseContractIssues();
    
    console.log('\n🔍 POSIBLES CAUSAS:');
    console.log('1. Tickets vendidos en contrato anterior');
    console.log('2. USDC transferido a otra dirección');
    console.log('3. Error en lógica de actualización de pools');
    console.log('4. Problema con eventos de compra de tickets');
    
    console.log('\n🔧 ACCIONES RECOMENDADAS:');
    console.log('1. Verificar historial de transacciones del contrato');
    console.log('2. Comprobar si hay contratos legacy con USDC');
    console.log('3. Revisar eventos TicketPurchased en el blockchain');
    console.log('4. Verificar función de actualización de pools');
    
  } catch (error) {
    console.error('❌ Error investigando USDC faltante:', error);
  }
}
