import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './contractAddresses';

interface TimingData {
  current: {
    utc: string;
    saoPaulo: string;
    colombia: string;
    timestamp: number;
  };
  contract: {
    currentGameDay: string;
    drawTimeUTC: number;
    lastDrawTime: number;
    nextDrawTime: number;
    timeToNextDraw: number;
  };
  frontend: {
    gameDay: string;
    calculatedNextMidnight: string;
    timeToNextMidnight: number;
  };
  mismatch: {
    gameDayMismatch: boolean;
    timeDifference: number;
    explanation: string;
  };
}

/**
 * Diagnose timing mismatch between frontend and contract
 */
export async function diagnoseTimingMismatch(): Promise<TimingData> {
  console.log('\n🕐 DIAGNÓSTICO DE TIMING FRONTEND vs CONTRATO');
  console.log('='.repeat(50));
  
  try {
    // Get current times
    const now = new Date();
    const utcTime = now.toISOString();
    const saoPauloTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(now);
    
    const colombiaTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(now);
    
    const saoPauloFormatted = `${saoPauloTime.find(p => p.type === 'year')?.value}-${saoPauloTime.find(p => p.type === 'month')?.value}-${saoPauloTime.find(p => p.type === 'day')?.value} ${saoPauloTime.find(p => p.type === 'hour')?.value}:${saoPauloTime.find(p => p.type === 'minute')?.value}:${saoPauloTime.find(p => p.type === 'second')?.value}`;
    
    const colombiaFormatted = `${colombiaTime.find(p => p.type === 'year')?.value}-${colombiaTime.find(p => p.type === 'month')?.value}-${colombiaTime.find(p => p.type === 'day')?.value} ${colombiaTime.find(p => p.type === 'hour')?.value}:${colombiaTime.find(p => p.type === 'minute')?.value}:${colombiaTime.find(p => p.type === 'second')?.value}`;
    
    // Connect to contract
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, [
      "function getCurrentDay() view returns (uint256)",
      "function drawTimeUTC() view returns (uint256)",
      "function lastDrawTime() view returns (uint256)",
      "function DRAW_INTERVAL() view returns (uint256)"
    ], provider);
    
    // Get contract timing data
    const [currentGameDay, drawTimeUTC, lastDrawTime, drawInterval] = await Promise.all([
      contract.getCurrentDay(),
      contract.drawTimeUTC(),
      contract.lastDrawTime(),
      contract.DRAW_INTERVAL()
    ]);
    
    const contractGameDay = Number(currentGameDay);
    const drawTimeHours = Number(drawTimeUTC) / 3600; // Convert to hours
    const lastDraw = Number(lastDrawTime);
    const interval = Number(drawInterval);
    
    // Calculate next draw time based on contract logic
    const nextDrawTime = lastDraw + interval;
    const timeToNextDraw = Math.max(0, nextDrawTime - Math.floor(now.getTime() / 1000));
    
    // Get frontend game day calculation
    const frontendGameDay = saoPauloTime.find(p => p.type === 'year')?.value + '-' +
                           saoPauloTime.find(p => p.type === 'month')?.value + '-' +
                           saoPauloTime.find(p => p.type === 'day')?.value;
    
    // Calculate next midnight São Paulo
    const nextMidnightSP = new Date(saoPauloFormatted);
    nextMidnightSP.setDate(nextMidnightSP.getDate() + 1);
    nextMidnightSP.setHours(0, 0, 0, 0);
    const timeToNextMidnight = Math.max(0, nextMidnightSP.getTime() - now.getTime()) / 1000;
    
    // Analyze mismatch
    const gameDayMismatch = contractGameDay.toString() !== frontendGameDay.replace(/-/g, '');
    const timeDifference = timeToNextDraw - timeToNextMidnight;
    
    let explanation = '';
    if (gameDayMismatch) {
      if (timeDifference > 0) {
        explanation = `Frontend avanza al próximo día ${Math.abs(timeDifference / 3600).toFixed(1)} horas ANTES que el contrato`;
      } else {
        explanation = `Contrato avanza al próximo día ${Math.abs(timeDifference / 3600).toFixed(1)} horas ANTES que el frontend`;
      }
    } else {
      explanation = 'Frontend y contrato están sincronizados';
    }
    
    const result: TimingData = {
      current: {
        utc: utcTime,
        saoPaulo: saoPauloFormatted,
        colombia: colombiaFormatted,
        timestamp: Math.floor(now.getTime() / 1000)
      },
      contract: {
        currentGameDay: contractGameDay.toString(),
        drawTimeUTC: drawTimeHours,
        lastDrawTime: lastDraw,
        nextDrawTime: nextDrawTime,
        timeToNextDraw: timeToNextDraw
      },
      frontend: {
        gameDay: frontendGameDay,
        calculatedNextMidnight: nextMidnightSP.toISOString(),
        timeToNextMidnight: timeToNextMidnight
      },
      mismatch: {
        gameDayMismatch,
        timeDifference,
        explanation
      }
    };
    
    // Log detailed analysis
    console.log('📅 TIEMPOS ACTUALES:');
    console.log(`- UTC: ${result.current.utc}`);
    console.log(`- São Paulo: ${result.current.saoPaulo}`);
    console.log(`- Colombia: ${result.current.colombia}`);
    
    console.log('\n🔗 CONTRATO:');
    console.log(`- Game Day: ${result.contract.currentGameDay}`);
    console.log(`- Draw Time: ${result.contract.drawTimeUTC}:00 UTC`);
    console.log(`- Próximo sorteo: ${new Date(result.contract.nextDrawTime * 1000).toISOString()}`);
    console.log(`- Tiempo hasta sorteo: ${Math.floor(result.contract.timeToNextDraw / 3600)}h ${Math.floor((result.contract.timeToNextDraw % 3600) / 60)}m`);
    
    console.log('\n💻 FRONTEND:');
    console.log(`- Game Day: ${result.frontend.gameDay}`);
    console.log(`- Próxima medianoche SP: ${result.frontend.calculatedNextMidnight}`);
    console.log(`- Tiempo hasta medianoche: ${Math.floor(result.frontend.timeToNextMidnight / 3600)}h ${Math.floor((result.frontend.timeToNextMidnight % 3600) / 60)}m`);
    
    console.log('\n⚠️ ANÁLISIS DE DISCREPANCIA:');
    console.log(`- Game Days coinciden: ${result.mismatch.gameDayMismatch ? '❌ NO' : '✅ SÍ'}`);
    console.log(`- Diferencia de tiempo: ${Math.abs(result.mismatch.timeDifference / 3600).toFixed(1)} horas`);
    console.log(`- Explicación: ${result.mismatch.explanation}`);
    
    if (result.mismatch.gameDayMismatch) {
      console.log('\n🚨 PROBLEMA IDENTIFICADO:');
      console.log('El frontend y el contrato están usando diferentes sistemas de cálculo de día de juego.');
      console.log('Esto causa que las pools aparenten "resetearse" antes del sorteo real.');
      
      console.log('\n💡 SOLUCIÓN RECOMENDADA:');
      console.log('1. Usar el getCurrentDay() del contrato en lugar del cálculo de timezone');
      console.log('2. Sincronizar toda la UI con el timing del contrato');
      console.log('3. Mostrar pools agregadas hasta que el contrato ejecute el sorteo');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error diagnosticando timing:', error);
    throw error;
  }
}

/**
 * Fix timing by using contract's game day calculation
 */
export async function getContractGameDay(): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, [
      "function getCurrentDay() view returns (uint256)"
    ], provider);
    
    const currentGameDay = await contract.getCurrentDay();
    return Number(currentGameDay).toString();
  } catch (error) {
    console.error('Error getting contract game day:', error);
    // Fallback to frontend calculation
    const now = new Date();
    const saoPauloTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);
    
    return `${saoPauloTime.find(p => p.type === 'year')?.value}-${saoPauloTime.find(p => p.type === 'month')?.value}-${saoPauloTime.find(p => p.type === 'day')?.value}`;
  }
}

/**
 * Check if we're in the problematic window where frontend thinks it's a new day but contract doesn't
 */
export async function isInTimingMismatchWindow(): Promise<boolean> {
  try {
    const timing = await diagnoseTimingMismatch();
    return timing.mismatch.gameDayMismatch && timing.mismatch.timeDifference > 0;
  } catch (error) {
    console.warn('Error checking timing mismatch window:', error);
    return false;
  }
}

// Export functions globally for console access
if (typeof window !== 'undefined') {
  (window as any).diagnoseTimingMismatch = diagnoseTimingMismatch;
  (window as any).getContractGameDay = getContractGameDay;
  (window as any).isInTimingMismatchWindow = isInTimingMismatchWindow;
}
