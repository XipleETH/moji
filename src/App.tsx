import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';

import { HybridTicketSystem } from './components/HybridTicketSystem';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { WalletConnector } from './components/WalletConnector';
import { WalletProvider } from './contexts/WalletContext';
import { Trophy, UserCircle, Zap, Terminal, WalletIcon, Ticket as TicketIcon, History } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMiniKit, useNotification, useViewProfile } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { useAuth } from './components/AuthProvider';
import { useWallet } from './contexts/WalletContext';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { ContractWinnerResults } from './components/ContractWinnerResults';
import { TicketHistoryModal } from './components/TicketHistoryModal';
import { WalletInfo } from './components/WalletInfo';
import { PrizePoolSummary, PrizePoolDisplay } from './components/PrizePoolDisplay';
import { EnhancedPrizePoolDisplay } from './components/EnhancedPrizePoolDisplay';
import { ContractPoolsDisplay } from './components/ContractPoolsDisplay';
import { BlockchainTicketsDisplay } from './components/BlockchainTicketsDisplay';
import { resetUserTokens, canUserBuyTicket } from './firebase/tokens';
import { getCurrentUser } from './firebase/auth';
import { debugPrizePool, distributePrizePool } from './firebase/prizePools';
import { initializeDailyPool, checkPoolsHealth } from './utils/initializePools';
import { distributeHistoricalPrizes } from './firebase/distributeHistoricalPrizes';
import { EmojiDebugger } from './components/EmojiDebugger';
import { BlockchainDebugPanel } from './components/BlockchainDebugPanel';

// Función global para debuggear tokens
(window as any).debugTokens = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[debugTokens] No hay usuario conectado');
      return;
    }
    
    console.log('[debugTokens] Usuario actual:', user.id);
    
    const result = await canUserBuyTicket(user.id);
    console.log('[debugTokens] Resultado de canUserBuyTicket:', result);
    
    return result;
  } catch (error) {
    console.error('[debugTokens] Error:', error);
  }
};

// Función global para resetear tokens
(window as any).resetTokens = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[resetTokens] No hay usuario conectado');
      return;
    }
    
    console.log('[resetTokens] Reseteando tokens para usuario:', user.id);
    
    const result = await resetUserTokens(user.id);
    console.log('[resetTokens] Resultado:', result);
    
    // Verificar después del reset
    const check = await canUserBuyTicket(user.id);
    console.log('[resetTokens] Verificación después del reset:', check);
    
    return result;
  } catch (error) {
    console.error('[resetTokens] Error:', error);
  }
};

// Funciones globales para debuggear pools de premios
(window as any).debugPrizePool = debugPrizePool;
(window as any).distributePrizePool = distributePrizePool;
(window as any).initializeDailyPool = initializeDailyPool;
(window as any).checkPoolsHealth = checkPoolsHealth;

// Función global para probar la acumulación de pools
(window as any).testPoolAccumulation = async () => {
  try {
    const { getAccumulatedPools } = await import('./firebase/prizePools');
    const { getCurrentGameDaySaoPaulo } = await import('./utils/timezone');
    
    const currentDay = getCurrentGameDaySaoPaulo();
    console.log('📊 Probando acumulación de pools para el día:', currentDay);
    
    const accumulatedPools = await getAccumulatedPools(currentDay);
    console.log('✨ Pools acumuladas encontradas:', accumulatedPools);
    
    return accumulatedPools;
  } catch (error) {
    console.error('[testPoolAccumulation] Error:', error);
  }
};

// Función global para simular un día sin ganadores (solo para testing)
(window as any).simulateNoWinnersDay = async (gameDay) => {
  if (!gameDay) {
    console.error('[simulateNoWinnersDay] Debes especificar un día (YYYY-MM-DD)');
    return;
  }
  
  try {
    const { db } = await import('./firebase/config');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    
    console.log('🎭 Simulando día sin ganadores para:', gameDay);
    
    // Crear resultado sin ganadores
    const gameResult = {
      id: `sim-${gameDay}`,
      gameDay: gameDay,
      timestamp: serverTimestamp(),
      winningNumbers: ['🎲', '🎯', '🎪'],
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: [],
      prizesDistributed: true,
      prizeTransactions: []
    };
    
    await setDoc(doc(db, 'game_results', `sim-${gameDay}`), gameResult);
    
    // Crear pool distribuida para ese día
    const prizePool = {
      gameDay: gameDay,
      totalTokensCollected: 100,
      poolsDistributed: true,
      pools: {
        firstPrize: 64,
        firstPrizeReserve: 16,
        secondPrize: 8,
        secondPrizeReserve: 2,
        thirdPrize: 4,
        thirdPrizeReserve: 1,
        development: 5
      },
      finalPools: {
        firstPrize: 64,
        secondPrize: 8,
        thirdPrize: 4
      },
      reserves: {
        firstPrizeActivated: false,
        secondPrizeActivated: false,
        thirdPrizeActivated: false
      },
      accumulatedFromPreviousDays: {
        firstPrize: 0,
        secondPrize: 0,
        thirdPrize: 0,
        totalDaysAccumulated: 0
      },
      lastUpdated: serverTimestamp()
    };
    
    await setDoc(doc(db, 'prize_pools', gameDay), prizePool);
    
    console.log('✅ Día sin ganadores simulado exitosamente');
    console.log('- Resultado del juego creado sin ganadores');
    console.log('- Pool distribuida creada con tokens que deberían acumularse');
    
    return { gameResult, prizePool };
  } catch (error) {
    console.error('[simulateNoWinnersDay] Error:', error);
  }
};

// Función global para forzar actualización de pool
(window as any).forcePoolUpdate = async () => {
  try {
    const { addTokensToPool } = await import('./firebase/prizePools');
    const { getCurrentUser } = await import('./firebase/auth');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('[forcePoolUpdate] No hay usuario conectado');
      return;
    }
    
    console.log('[forcePoolUpdate] Forzando actualización de pool con 1 token...');
    const result = await addTokensToPool(user.id, user.walletAddress, 1, 'debug-ticket-' + Date.now());
    console.log('[forcePoolUpdate] Resultado:', result);
    
    return result;
  } catch (error) {
    console.error('[forcePoolUpdate] Error:', error);
  }
};

// Función global para ver estado actual de pool
(window as any).getCurrentPoolState = async () => {
  try {
    const { getDailyPrizePool } = await import('./firebase/prizePools');
    const { getCurrentGameDaySaoPaulo, getTimeUntilNextDrawSaoPaulo } = await import('./utils/timezone');
    
    const currentDay = getCurrentGameDaySaoPaulo();
    const timeUntilDraw = getTimeUntilNextDrawSaoPaulo();
    const timeUntilDistribution = timeUntilDraw > 5 * 60 ? (timeUntilDraw - 5 * 60) : 0;
    
    console.log('🕐 Información de tiempo:');
    console.log('- Día actual (SP):', currentDay);
    console.log('- Tiempo hasta sorteo:', Math.floor(timeUntilDraw / 3600) + 'h ' + Math.floor((timeUntilDraw % 3600) / 60) + 'm ' + (timeUntilDraw % 60) + 's');
    console.log('- Tiempo hasta distribución:', timeUntilDistribution > 0 ? Math.floor(timeUntilDistribution / 3600) + 'h ' + Math.floor((timeUntilDistribution % 3600) / 60) + 'm ' + (timeUntilDistribution % 60) + 's' : 'Pool cerrada para distribución');
    console.log('- Pool debe estar cerrada:', timeUntilDraw <= 5 * 60 ? 'SÍ' : 'NO');
    
    const pool = await getDailyPrizePool(currentDay);
    
    console.log('🏆 Estado de la pool:');
    console.log('- Total tokens:', pool.totalTokensCollected);
    console.log('- Pool distribuida:', pool.poolsDistributed ? 'SÍ' : 'NO');
    console.log('- Puede agregar tokens:', !pool.poolsDistributed ? 'SÍ' : 'NO');
    console.log('- Pools acumuladas:', pool.accumulatedFromPreviousDays);
    console.log('- Pools finales:', pool.finalPools);
    
    if (pool.distributionTimestamp) {
      console.log('- Distribuida en:', new Date(pool.distributionTimestamp).toLocaleString());
    }
    
    return pool;
  } catch (error) {
    console.error('[getCurrentPoolState] Error:', error);
  }
};

// Función global para verificar permisos de escritura en Firebase
(window as any).testFirebaseWrite = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { getCurrentGameDaySaoPaulo } = await import('./utils/timezone');
    
    const currentDay = getCurrentGameDaySaoPaulo();
    console.log('🔥 Probando escritura en Firebase...');
    
    // Intentar escribir en la colección de test
    const testRef = doc(db, 'test_collection', 'test_' + Date.now());
    await setDoc(testRef, {
      message: 'Test de escritura',
      timestamp: serverTimestamp(),
      currentDay: currentDay
    });
    
    console.log('✅ Escritura en Firebase exitosa');
    
    // Intentar escribir directamente en prize_pools
    const poolRef = doc(db, 'prize_pools', 'test_' + currentDay);
    await setDoc(poolRef, {
      gameDay: currentDay,
      totalTokensCollected: 1,
      poolsDistributed: false,
      testEntry: true,
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Escritura en prize_pools exitosa');
    
    return true;
  } catch (error) {
    console.error('❌ Error en escritura de Firebase:', error);
    return false;
  }
};

// Función global para debuggear zona horaria
(window as any).debugTimezone = () => {
  try {
    const now = new Date();
    const utc = new Date(now.getTime());
    
    // Simular cálculo del backend
    const saoPauloOffset = -3;
    const saoPauloTime = new Date(now.getTime() + (saoPauloOffset * 60 * 60 * 1000));
    const month = saoPauloTime.getUTCMonth();
    const isDaylightSaving = month >= 9 || month <= 1;
    if (isDaylightSaving) {
      saoPauloTime.setUTCHours(saoPauloTime.getUTCHours() + 1);
    }
    
    const backendGameDay = `${saoPauloTime.getUTCFullYear()}-${String(saoPauloTime.getUTCMonth() + 1).padStart(2, '0')}-${String(saoPauloTime.getUTCDate()).padStart(2, '0')}`;
    
    console.log('🕐 Debug Timezone:');
    console.log('- Hora local del navegador:', now.toLocaleString());
    console.log('- UTC:', utc.toISOString());
    console.log('- São Paulo calculado (backend):', saoPauloTime.toISOString());
    console.log('- GameDay del backend:', backendGameDay);
    console.log('- En horario de verano:', isDaylightSaving ? 'SÍ' : 'NO');
    console.log('- Mes actual (0-11):', month);
    
    // Importar función del frontend
    import('./firebase/tokens').then(({ getCurrentGameDay }) => {
      const frontendGameDay = getCurrentGameDay();
      console.log('- GameDay del frontend:', frontendGameDay);
      console.log('- ¿Coinciden?', backendGameDay === frontendGameDay ? '✅ SÍ' : '❌ NO');
    });
    
    return {
      local: now.toLocaleString(),
      utc: utc.toISOString(),
      saoPaulo: saoPauloTime.toISOString(),
      backendGameDay,
      isDaylightSaving
    };
  } catch (error) {
    console.error('[debugTimezone] Error:', error);
  }
};

// Función para consultar tickets manualmente
const checkUserTicketsFunction = async () => {
  try {
    const { getCurrentUser } = await import('./firebase/auth');
    const { db } = await import('./firebase/config');
    const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
    const { getCurrentGameDay } = await import('./firebase/tokens');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('[checkUserTickets] ❌ No hay usuario conectado');
      return;
    }
    
    const currentGameDay = getCurrentGameDay();
    console.log(`[checkUserTickets] 🔍 Buscando tickets para usuario ${user.id} en día ${currentGameDay}`);
    
    // Consulta directa a Firebase
    const ticketsQuery = query(
      collection(db, 'player_tickets'),
      where('userId', '==', user.id),
      where('gameDay', '==', currentGameDay),
      where('isActive', '==', true),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(ticketsQuery);
    
    console.log(`[checkUserTickets] 📊 Resultados encontrados: ${snapshot.size} tickets`);
    
    if (snapshot.size === 0) {
      // Buscar sin filtro de gameDay para ver si hay tickets de otros días
      console.log('[checkUserTickets] 🔍 Buscando tickets de cualquier día...');
      
      const allTicketsQuery = query(
        collection(db, 'player_tickets'),
        where('userId', '==', user.id),
        where('isActive', '==', true),
        orderBy('timestamp', 'desc')
      );
      
      const allSnapshot = await getDocs(allTicketsQuery);
      console.log(`[checkUserTickets] 📊 Total tickets del usuario (todos los días): ${allSnapshot.size}`);
      
      allSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`[checkUserTickets] 🎫 Ticket ${index + 1}:`, {
          id: doc.id,
          gameDay: data.gameDay,
          timestamp: new Date(data.timestamp?.toMillis() || 0).toLocaleString(),
          userId: data.userId,
          isActive: data.isActive,
          numbers: data.numbers?.length || 0
        });
      });
    } else {
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`[checkUserTickets] 🎫 Ticket del día actual ${index + 1}:`, {
          id: doc.id,
          gameDay: data.gameDay,
          timestamp: new Date(data.timestamp?.toMillis() || 0).toLocaleString(),
          userId: data.userId,
          isActive: data.isActive,
          numbers: data.numbers
        });
      });
    }
    
    return {
      user: user.id,
      currentGameDay,
      todayTickets: snapshot.size
    };
  } catch (error) {
    console.error('[checkUserTickets] Error:', error);
  }
};

// Registrar función globalmente
(window as any).checkUserTickets = checkUserTicketsFunction;

// Función simple para debug inmediato
(window as any).debugInfo = () => {
  console.log('🚀 Debug Info:');
  console.log('- Función checkUserTickets disponible:', typeof (window as any).checkUserTickets);
  console.log('- Función debugTimezone disponible:', typeof (window as any).debugTimezone);
  
  // Mostrar información de autenticación
  getCurrentUser().then(user => {
    console.log('- Usuario actual:', user ? `${user.id} (${user.walletAddress})` : 'No conectado');
  }).catch(err => {
    console.log('- Error obteniendo usuario:', err);
  });
  
  // Mostrar gameDay actual
  import('./firebase/tokens').then(({ getCurrentGameDay }) => {
    console.log('- GameDay actual:', getCurrentGameDay());
  });
  
  return 'Debug info mostrado en consola';
};

// Función simple para calcular tiempo hasta medianoche (sin imports)
(window as any).simpleTimerCheck = () => {
  try {
    const now = new Date();
    
    // Calcular medianoche local
    const localMidnight = new Date(now);
    localMidnight.setDate(localMidnight.getDate() + 1);
    localMidnight.setHours(0, 0, 0, 0);
    const localSeconds = Math.floor((localMidnight.getTime() - now.getTime()) / 1000);
    
    // Calcular medianoche São Paulo aproximada (UTC-3)
    const saoPauloOffset = -3;
    const utcNow = new Date(now.getTime());
    const saoPauloNow = new Date(utcNow.getTime() + (saoPauloOffset * 60 * 60 * 1000));
    
    const saoPauloMidnight = new Date(saoPauloNow);
    saoPauloMidnight.setUTCDate(saoPauloMidnight.getUTCDate() + 1);
    saoPauloMidnight.setUTCHours(0, 0, 0, 0);
    
    const saoPauloMidnightUTC = new Date(saoPauloMidnight.getTime() - (saoPauloOffset * 60 * 60 * 1000));
    const saoPauloSeconds = Math.floor((saoPauloMidnightUTC.getTime() - now.getTime()) / 1000);
    
    console.log('⏰ Cálculos de timer:');
    console.log('- Hora actual (local):', now.toLocaleString());
    console.log('- Hora actual (UTC):', now.toISOString());
    console.log('- Aprox. SP:', new Date(now.getTime() + (saoPauloOffset * 60 * 60 * 1000)).toISOString());
    console.log('- Medianoche local en:', localSeconds, 'segundos');
    console.log('- Medianoche SP en:', saoPauloSeconds, 'segundos');
    console.log('- Diferencia:', Math.abs(localSeconds - saoPauloSeconds), 'segundos');
    
    return {
      local: {
        seconds: localSeconds,
        formatted: Math.floor(localSeconds / 3600) + 'h ' + Math.floor((localSeconds % 3600) / 60) + 'm ' + (localSeconds % 60) + 's'
      },
      saoPaulo: {
        seconds: saoPauloSeconds,
        formatted: Math.floor(saoPauloSeconds / 3600) + 'h ' + Math.floor((saoPauloSeconds % 3600) / 60) + 'm ' + (saoPauloSeconds % 60) + 's'
      },
      difference: Math.abs(localSeconds - saoPauloSeconds)
    };
    
  } catch (error) {
    console.error('[simpleTimerCheck] Error:', error);
    return { error: error.message };
  }
};

// Función para verificar estado del sorteo
(window as any).checkDrawStatus = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { collection, query, where, orderBy, limit, getDocs, doc, getDoc } = await import('firebase/firestore');
    const { getCurrentGameDay } = await import('./firebase/tokens');
    
    const currentGameDay = getCurrentGameDay();
    console.log(`[checkDrawStatus] 🔍 Verificando estado del sorteo para el día: ${currentGameDay}`);
    
    // Verificar si ya hay resultado para hoy
    const resultQuery = query(
      collection(db, 'game_results'),
      where('gameDay', '==', currentGameDay),
      limit(1)
    );
    
    const resultSnapshot = await getDocs(resultQuery);
    
    if (resultSnapshot.size > 0) {
      const result = resultSnapshot.docs[0].data();
      console.log(`[checkDrawStatus] ✅ Resultado ya existe para ${currentGameDay}:`, {
        id: resultSnapshot.docs[0].id,
        winningNumbers: result.winningNumbers,
        timestamp: result.timestamp?.toDate?.() || 'No timestamp'
      });
      return { status: 'completed', result: result };
    }
    
    // Verificar control de sorteo
    const drawControlRef = doc(db, 'draw_control', currentGameDay);
    const drawControlDoc = await getDoc(drawControlRef);
    
    if (drawControlDoc.exists()) {
      const controlData = drawControlDoc.data();
      console.log(`[checkDrawStatus] 📊 Control de sorteo encontrado:`, {
        inProgress: controlData.inProgress,
        completed: controlData.completed,
        startedAt: controlData.startedAt,
        processId: controlData.processId
      });
      return { status: 'in_progress', control: controlData };
    }
    
    console.log(`[checkDrawStatus] ❌ No hay resultado ni control para ${currentGameDay}`);
    return { status: 'pending', gameDay: currentGameDay };
    
  } catch (error) {
    console.error('[checkDrawStatus] Error:', error);
    return { status: 'error', error };
  }
};

// Función para triggear sorteo manualmente
(window as any).triggerDraw = async () => {
  try {
    const { functions } = await import('./firebase/config');
    const { httpsCallable } = await import('firebase/functions');
    
    console.log('[triggerDraw] 🎲 Triggereando sorteo manual...');
    
    const triggerGameDraw = httpsCallable(functions, 'triggerGameDraw');
    const result = await triggerGameDraw();
    
    console.log('[triggerDraw] ✅ Sorteo triggereado exitosamente:', result.data);
    return result.data;
    
  } catch (error) {
    console.error('[triggerDraw] ❌ Error triggereando sorteo:', error);
    return { error: error.message };
  }
};

// Función para verificar el estado del timer
(window as any).checkTimerStatus = async () => {
  try {
    const { getTimeUntilNextDrawSaoPaulo } = await import('./utils/timezone');
    const timeUntil = getTimeUntilNextDrawSaoPaulo();
    
    console.log('[checkTimerStatus] ⏰ Estado del timer:');
    console.log('- Segundos hasta próximo sorteo:', timeUntil);
    console.log('- Tiempo formateado:', Math.floor(timeUntil / 3600) + 'h ' + Math.floor((timeUntil % 3600) / 60) + 'm ' + (timeUntil % 60) + 's');
    console.log('- Medianoche pasada:', timeUntil <= 0 ? 'SÍ' : 'NO');
    
    return {
      secondsUntilDraw: timeUntil,
      midnightPassed: timeUntil <= 0,
      formatted: Math.floor(timeUntil / 3600) + 'h ' + Math.floor((timeUntil % 3600) / 60) + 'm ' + (timeUntil % 60) + 's'
    };
    
  } catch (error) {
    console.error('[checkTimerStatus] Error:', error);
    
    // Fallback manual
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntil = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
    
    console.log('[checkTimerStatus] ⏰ Fallback - Segundos hasta medianoche local:', timeUntil);
    
    return {
      secondsUntilDraw: timeUntil,
      midnightPassed: timeUntil <= 0,
      fallback: true
    };
  }
};

// Función para diagnosticar el timer en detalle
(window as any).diagnoseTimer = async () => {
  try {
    const { 
      getCurrentDateSaoPaulo, 
      getNextMidnightSaoPaulo, 
      getTimeUntilNextDrawSaoPaulo,
      getSaoPauloOffset,
      formatTimeSaoPaulo,
      getCurrentGameDaySaoPaulo
    } = await import('./utils/timezone');
    
    const now = new Date();
    const saoPauloNow = getCurrentDateSaoPaulo();
    const nextMidnight = getNextMidnightSaoPaulo();
    const timeUntil = getTimeUntilNextDrawSaoPaulo();
    const offset = getSaoPauloOffset();
    const gameDay = getCurrentGameDaySaoPaulo();
    
    console.log('🔍 Diagnóstico completo del timer:');
    console.table({
      'Hora local (navegador)': now.toLocaleString(),
      'Hora São Paulo': formatTimeSaoPaulo(now),
      'Game Day (SP)': gameDay,
      'Offset SP (horas)': offset,
      'Próxima medianoche (UTC)': nextMidnight.toISOString(),
      'Próxima medianoche (SP)': formatTimeSaoPaulo(nextMidnight),
      'Segundos hasta sorteo': timeUntil,
      'Tiempo formateado': Math.floor(timeUntil / 3600) + 'h ' + Math.floor((timeUntil % 3600) / 60) + 'm ' + (timeUntil % 60) + 's',
      'Estado': timeUntil <= 0 ? '🔴 Medianoche pasada' : '🟢 Contando'
    });
    
    // Verificar consistencia
    const timeDiff = nextMidnight.getTime() - now.getTime();
    const manualCalculation = Math.floor(timeDiff / 1000);
    
    if (Math.abs(timeUntil - manualCalculation) > 1) {
      console.warn('⚠️ Inconsistencia detectada:');
      console.log('- Función getTimeUntilNextDrawSaoPaulo():', timeUntil);
      console.log('- Cálculo manual:', manualCalculation);
      console.log('- Diferencia:', Math.abs(timeUntil - manualCalculation), 'segundos');
    }
    
    return {
      now: now.toISOString(),
      saoPauloNow: saoPauloNow.toISOString(),
      nextMidnight: nextMidnight.toISOString(),
      timeUntil,
      offset,
      gameDay,
      isConsistent: Math.abs(timeUntil - manualCalculation) <= 1
    };
    
  } catch (error) {
    console.error('[diagnoseTimer] Error:', error);
    return { error: error.message };
  }
};

// Función para resetear tokens del usuario actual (para pruebas masivas)
(window as any).resetMyTokens = async () => {
  try {
    const { getCurrentUser } = await import('./firebase/auth');
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('❌ No hay usuario conectado');
      return;
    }
    
    const { resetUserTokens } = await import('./firebase/tokens');
    await resetUserTokens(user.id);
    console.log('✅ Tokens reseteados exitosamente a 1000');
    
    // Recargar página para actualizar la UI
    window.location.reload();
  } catch (error) {
    console.error('❌ Error reseteando tokens:', error);
  }
};

// Debug functions para desarrollador
// Función para revisar manualmente los ganadores
(window as any).debugWinners = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { doc, getDoc, query, collection, where, getDocs, orderBy, limit } = await import('firebase/firestore');
    const { checkWin } = await import('./utils/gameLogic');
    const { getCurrentGameDay } = await import('./firebase/tokens');
    
    const currentGameDay = getCurrentGameDay();
    console.log(`[debugWinners] 🔍 Verificando ganadores para el día: ${currentGameDay}`);
    
    // 1. Obtener números ganadores actuales
    const gameStateRef = doc(db, 'game_state', 'current_game_state');
    const gameStateDoc = await getDoc(gameStateRef);
    
    if (!gameStateDoc.exists()) {
      console.log('[debugWinners] ❌ No hay estado de juego');
      return;
    }
    
    const winningNumbers = gameStateDoc.data().winningNumbers;
    console.log(`[debugWinners] 🎯 Números ganadores:`, winningNumbers);
    
    // 2. Obtener todos los tickets del día (sin orderBy para evitar el índice)
    const ticketsQuery = query(
      collection(db, 'player_tickets'),
      where('gameDay', '==', currentGameDay),
      where('isActive', '==', true),
      limit(500) // Aumentar límite para debug
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`[debugWinners] 🎫 Encontrados ${tickets.length} tickets para el día ${currentGameDay}`);
    
    if (tickets.length === 0) {
      console.log('[debugWinners] ⚠️ No hay tickets para verificar');
      return;
    }
    
    // 3. Verificar cada ticket
    const results = {
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: [],
      noWin: []
    };
    
    tickets.forEach((ticket, index) => {
      if (!ticket.numbers || !Array.isArray(ticket.numbers)) {
        console.log(`[debugWinners] ⚠️ Ticket ${ticket.id} sin números válidos:`, ticket.numbers);
        return;
      }
      
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      console.log(`[debugWinners] Ticket ${index + 1}/${tickets.length}:`, {
        id: ticket.id.substring(0, 8),
        numbers: ticket.numbers,
        winningNumbers: winningNumbers,
        winStatus: winStatus,
        gameDay: ticket.gameDay
      });
      
      if (winStatus.firstPrize) results.firstPrize.push(ticket);
      else if (winStatus.secondPrize) results.secondPrize.push(ticket);
      else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
      else if (winStatus.freePrize) results.freePrize.push(ticket);
      else results.noWin.push(ticket);
    });
    
    // 4. Mostrar resultados
    console.log('[debugWinners] 📊 Resultados de verificación:');
    console.log(`- Primer premio: ${results.firstPrize.length} ganadores`);
    console.log(`- Segundo premio: ${results.secondPrize.length} ganadores`);
    console.log(`- Tercer premio: ${results.thirdPrize.length} ganadores`);
    console.log(`- Ticket gratis: ${results.freePrize.length} ganadores`);
    console.log(`- Sin premio: ${results.noWin.length} tickets`);
    
    // 5. Verificar algunos ejemplos de tickets que no ganaron
    if (results.noWin.length > 0) {
      console.log('[debugWinners] 🔍 Ejemplos de tickets sin premio:');
      results.noWin.slice(0, 5).forEach((ticket, i) => {
        const winStatus = checkWin(ticket.numbers, winningNumbers);
        console.log(`Ejemplo ${i + 1}:`, {
          ticketNumbers: ticket.numbers,
          winningNumbers: winningNumbers,
          detailedCheck: winStatus
        });
      });
    }
    
    // 6. Verificar si hay algún resultado guardado
    const resultsQuery = query(
      collection(db, 'game_results'),
      where('dayKey', '==', currentGameDay),
      limit(1)
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    if (!resultsSnapshot.empty) {
      const savedResult = resultsSnapshot.docs[0].data();
      console.log('[debugWinners] 💾 Resultado guardado en la base de datos:');
      console.log(`- Primer premio: ${savedResult.firstPrize?.length || 0} ganadores`);
      console.log(`- Segundo premio: ${savedResult.secondPrize?.length || 0} ganadores`);
      console.log(`- Tercer premio: ${savedResult.thirdPrize?.length || 0} ganadores`);
      console.log(`- Ticket gratis: ${savedResult.freePrize?.length || 0} ganadores`);
    } else {
      console.log('[debugWinners] ❌ No hay resultado guardado para este día');
    }
    
    return results;
    
  } catch (error) {
    console.error('[debugWinners] ❌ Error:', error);
    return null;
  }
};

// Función simple para verificar tickets sin usar índices complejos
(window as any).simpleDebugWinners = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { doc, getDoc, query, collection, where, getDocs } = await import('firebase/firestore');
    const { checkWin } = await import('./utils/gameLogic');
    const { getCurrentGameDay } = await import('./firebase/tokens');
    
    const currentGameDay = getCurrentGameDay();
    console.log(`[simpleDebugWinners] 🔍 Verificando día: ${currentGameDay}`);
    
    // 1. Obtener números ganadores
    const gameStateRef = doc(db, 'game_state', 'current_game_state');
    const gameStateDoc = await getDoc(gameStateRef);
    
    if (!gameStateDoc.exists()) {
      console.log('[simpleDebugWinners] ❌ No hay estado de juego');
      return;
    }
    
    const winningNumbers = gameStateDoc.data().winningNumbers;
    console.log(`[simpleDebugWinners] 🎯 Números ganadores:`, winningNumbers);
    
    // 2. Obtener tickets solo por gameDay
    const ticketsQuery = query(
      collection(db, 'player_tickets'),
      where('gameDay', '==', currentGameDay)
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const allTickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 3. Filtrar tickets activos manualmente
    const activeTickets = allTickets.filter(ticket => ticket.isActive === true);
    
    console.log(`[simpleDebugWinners] 📊 Estadísticas:`);
    console.log(`- Total tickets del día: ${allTickets.length}`);
    console.log(`- Tickets activos: ${activeTickets.length}`);
    console.log(`- Tickets inactivos: ${allTickets.length - activeTickets.length}`);
    
    if (activeTickets.length === 0) {
      console.log('[simpleDebugWinners] ⚠️ No hay tickets activos para verificar');
      return;
    }
    
    // 4. Verificar ganadores con una muestra de tickets
    const sampleSize = Math.min(activeTickets.length, 50);
    const sampleTickets = activeTickets.slice(0, sampleSize);
    
    const results = {
      firstPrize: 0,
      secondPrize: 0,
      thirdPrize: 0,
      freePrize: 0,
      noWin: 0
    };
    
    console.log(`[simpleDebugWinners] 🎫 Verificando muestra de ${sampleSize} tickets:`);
    
    sampleTickets.forEach((ticket, index) => {
      if (!ticket.numbers || !Array.isArray(ticket.numbers)) {
        console.log(`⚠️ Ticket ${ticket.id.substring(0, 8)} sin números válidos`);
        return;
      }
      
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      if (index < 5) { // Mostrar detalles de los primeros 5
        console.log(`Ticket ${index + 1}: ${ticket.numbers.join('')} vs ${winningNumbers.join('')} = `, winStatus);
      }
      
      if (winStatus.firstPrize) results.firstPrize++;
      else if (winStatus.secondPrize) results.secondPrize++;
      else if (winStatus.thirdPrize) results.thirdPrize++;
      else if (winStatus.freePrize) results.freePrize++;
      else results.noWin++;
    });
    
    console.log(`[simpleDebugWinners] 📊 Resultados en muestra de ${sampleSize} tickets:`);
    console.log(`- Primer premio: ${results.firstPrize}`);
    console.log(`- Segundo premio: ${results.secondPrize}`);
    console.log(`- Tercer premio: ${results.thirdPrize}`);
    console.log(`- Ticket gratis: ${results.freePrize}`);
    console.log(`- Sin premio: ${results.noWin}`);
    
    // 5. Proyección a todos los tickets
    const totalActiveTickets = activeTickets.length;
    if (sampleSize < totalActiveTickets) {
      const factor = totalActiveTickets / sampleSize;
      console.log(`[simpleDebugWinners] 📈 Proyección estimada para ${totalActiveTickets} tickets:`);
      console.log(`- Primer premio: ~${Math.round(results.firstPrize * factor)}`);
      console.log(`- Segundo premio: ~${Math.round(results.secondPrize * factor)}`);
      console.log(`- Tercer premio: ~${Math.round(results.thirdPrize * factor)}`);
      console.log(`- Ticket gratis: ~${Math.round(results.freePrize * factor)}`);
    }
    
    return { results, totalActiveTickets, sampleSize };
    
  } catch (error) {
    console.error('[simpleDebugWinners] ❌ Error:', error);
    return null;
  }
};

// Función para investigar qué gameDays tienen tickets
(window as any).investigateGameDays = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, getDocs, orderBy, limit } = await import('firebase/firestore');
    const { getCurrentGameDay } = await import('./firebase/tokens');
    
    const currentGameDay = getCurrentGameDay();
    console.log(`[investigateGameDays] 🔍 Día calculado por frontend: ${currentGameDay}`);
    
    // 1. Obtener los tickets más recientes sin filtrar por gameDay
    const recentTicketsQuery = query(
      collection(db, 'player_tickets'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const recentTicketsSnapshot = await getDocs(recentTicketsQuery);
    const recentTickets = recentTicketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`[investigateGameDays] 📊 Encontrados ${recentTickets.length} tickets recientes`);
    
    // 2. Agrupar tickets por gameDay
    const ticketsByGameDay = {};
    recentTickets.forEach(ticket => {
      const gameDay = ticket.gameDay || 'undefined';
      if (!ticketsByGameDay[gameDay]) {
        ticketsByGameDay[gameDay] = [];
      }
      ticketsByGameDay[gameDay].push(ticket);
    });
    
    console.log(`[investigateGameDays] 📅 Tickets agrupados por gameDay:`);
    Object.keys(ticketsByGameDay).forEach(gameDay => {
      const count = ticketsByGameDay[gameDay].length;
      const isCurrentDay = gameDay === currentGameDay;
      console.log(`- ${gameDay}: ${count} tickets ${isCurrentDay ? '👈 DÍA ACTUAL' : ''}`);
    });
    
    // 3. Mostrar algunos ejemplos de tickets recientes
    console.log(`[investigateGameDays] 🎫 Primeros 10 tickets recientes:`);
    recentTickets.slice(0, 10).forEach((ticket, index) => {
      const date = ticket.timestamp ? new Date(ticket.timestamp.seconds * 1000) : new Date(ticket.timestamp);
      console.log(`${index + 1}. ID: ${ticket.id.substring(0, 8)}, GameDay: ${ticket.gameDay}, Fecha: ${date.toLocaleString()}, Activo: ${ticket.isActive}`);
    });
    
    // 4. Verificar si hay resultados de sorteo guardados
    const resultsQuery = query(
      collection(db, 'game_results'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    const results = resultsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`[investigateGameDays] 🏆 Últimos ${results.length} resultados de sorteo:`);
    results.forEach((result, index) => {
      const date = result.timestamp ? new Date(result.timestamp.seconds * 1000) : new Date();
      console.log(`${index + 1}. GameDay: ${result.dayKey}, Fecha: ${date.toLocaleString()}, Ganadores: F:${result.firstPrize?.length || 0} S:${result.secondPrize?.length || 0} T:${result.thirdPrize?.length || 0} G:${result.freePrize?.length || 0}`);
    });
    
    return {
      currentGameDay,
      ticketsByGameDay,
      totalTickets: recentTickets.length,
      recentResults: results
    };
    
  } catch (error) {
    console.error('[investigateGameDays] ❌ Error:', error);
    return null;
  }
};

// Función para verificar ganadores de una fecha específica
(window as any).checkWinnersForDate = async (targetDate = '2025-06-09') => {
  try {
    const { db } = await import('./firebase/config');
    const { doc, getDoc, query, collection, where, getDocs } = await import('firebase/firestore');
    const { checkWin } = await import('./utils/gameLogic');
    
    console.log(`[checkWinnersForDate] 🔍 Verificando ganadores para la fecha: ${targetDate}`);
    
    // 1. Buscar el resultado del sorteo de esa fecha
    const resultsQuery = query(
      collection(db, 'game_results'),
      where('dayKey', '==', targetDate)
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    
    if (resultsSnapshot.empty) {
      console.log(`[checkWinnersForDate] ❌ No se encontró resultado de sorteo para ${targetDate}`);
      return;
    }
    
    const gameResult = resultsSnapshot.docs[0].data();
    const winningNumbers = gameResult.winningNumbers;
    
    console.log(`[checkWinnersForDate] 🎯 Números ganadores del ${targetDate}:`, winningNumbers);
    console.log(`[checkWinnersForDate] 💾 Ganadores guardados en el resultado:`);
    console.log(`- Primer premio: ${gameResult.firstPrize?.length || 0} ganadores`);
    console.log(`- Segundo premio: ${gameResult.secondPrize?.length || 0} ganadores`);
    console.log(`- Tercer premio: ${gameResult.thirdPrize?.length || 0} ganadores`);
    console.log(`- Ticket gratis: ${gameResult.freePrize?.length || 0} ganadores`);
    
    // 2. Obtener tickets de esa fecha
    const ticketsQuery = query(
      collection(db, 'player_tickets'),
      where('gameDay', '==', targetDate)
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const allTickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const activeTickets = allTickets.filter(ticket => ticket.isActive === true);
    
    console.log(`[checkWinnersForDate] 📊 Estadísticas de tickets del ${targetDate}:`);
    console.log(`- Total tickets: ${allTickets.length}`);
    console.log(`- Tickets activos: ${activeTickets.length}`);
    
    if (activeTickets.length === 0) {
      console.log(`[checkWinnersForDate] ⚠️ No hay tickets activos para verificar en ${targetDate}`);
      return;
    }
    
    // 3. Verificar TODOS los tickets de ese día
    const results = {
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: [],
      noWin: []
    };
    
    console.log(`[checkWinnersForDate] 🎫 Verificando TODOS los ${activeTickets.length} tickets del ${targetDate}...`);
    
    activeTickets.forEach((ticket, index) => {
      if (!ticket.numbers || !Array.isArray(ticket.numbers)) {
        console.log(`⚠️ Ticket ${ticket.id.substring(0, 8)} sin números válidos`);
        return;
      }
      
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      if (winStatus.firstPrize) results.firstPrize.push(ticket);
      else if (winStatus.secondPrize) results.secondPrize.push(ticket);
      else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
      else if (winStatus.freePrize) results.freePrize.push(ticket);
      else results.noWin.push(ticket);
      
      // Mostrar progreso cada 100 tickets
      if ((index + 1) % 100 === 0) {
        console.log(`Procesados ${index + 1}/${activeTickets.length} tickets...`);
      }
    });
    
    console.log(`[checkWinnersForDate] 🏆 RESULTADOS RECALCULADOS para ${targetDate}:`);
    console.log(`- Primer premio: ${results.firstPrize.length} ganadores`);
    console.log(`- Segundo premio: ${results.secondPrize.length} ganadores`);
    console.log(`- Tercer premio: ${results.thirdPrize.length} ganadores`);
    console.log(`- Ticket gratis: ${results.freePrize.length} ganadores`);
    console.log(`- Sin premio: ${results.noWin.length} tickets`);
    
    // 4. Comparar con los resultados guardados
    console.log(`[checkWinnersForDate] 📊 COMPARACIÓN:`);
    console.log(`Primer premio: Guardado ${gameResult.firstPrize?.length || 0} vs Calculado ${results.firstPrize.length} ${gameResult.firstPrize?.length === results.firstPrize.length ? '✅' : '❌'}`);
    console.log(`Segundo premio: Guardado ${gameResult.secondPrize?.length || 0} vs Calculado ${results.secondPrize.length} ${gameResult.secondPrize?.length === results.secondPrize.length ? '✅' : '❌'}`);
    console.log(`Tercer premio: Guardado ${gameResult.thirdPrize?.length || 0} vs Calculado ${results.thirdPrize.length} ${gameResult.thirdPrize?.length === results.thirdPrize.length ? '✅' : '❌'}`);
    console.log(`Ticket gratis: Guardado ${gameResult.freePrize?.length || 0} vs Calculado ${results.freePrize.length} ${gameResult.freePrize?.length === results.freePrize.length ? '✅' : '❌'}`);
    
    // 5. Mostrar algunos ejemplos de ganadores encontrados
    if (results.firstPrize.length > 0) {
      console.log(`[checkWinnersForDate] 🥇 Ejemplos de PRIMER PREMIO:`);
      results.firstPrize.slice(0, 5).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId}`);
      });
    }
    
    if (results.secondPrize.length > 0) {
      console.log(`[checkWinnersForDate] 🥈 Ejemplos de SEGUNDO PREMIO:`);
      results.secondPrize.slice(0, 5).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId}`);
      });
    }
    
    return {
      targetDate,
      winningNumbers,
      savedResults: {
        firstPrize: gameResult.firstPrize?.length || 0,
        secondPrize: gameResult.secondPrize?.length || 0,
        thirdPrize: gameResult.thirdPrize?.length || 0,
        freePrize: gameResult.freePrize?.length || 0
      },
      calculatedResults: {
        firstPrize: results.firstPrize.length,
        secondPrize: results.secondPrize.length,
        thirdPrize: results.thirdPrize.length,
        freePrize: results.freePrize.length
      },
      totalTickets: activeTickets.length,
      winners: results
    };
    
  } catch (error) {
    console.error('[checkWinnersForDate] ❌ Error:', error);
    return null;
  }
};

// Función para comparar días con ganadores vs sin ganadores
(window as any).compareWinningDays = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs } = await import('firebase/firestore');
    
    console.log(`[compareWinningDays] 🔍 Comparando días con ganadores vs sin ganadores...`);
    
    // Días para comparar
    const daysWithWinners = ['2025-6-7', '2025-6-6'];
    const daysWithoutWinners = ['2025-06-09', '2025-06-08', '2025-06-10'];
    
    for (const dayKey of [...daysWithWinners, ...daysWithoutWinners]) {
      console.log(`\n[compareWinningDays] 📅 Analizando día: ${dayKey}`);
      
      // Obtener resultado del sorteo
      const resultsQuery = query(
        collection(db, 'game_results'),
        where('dayKey', '==', dayKey)
      );
      
      const resultsSnapshot = await getDocs(resultsQuery);
      
      if (resultsSnapshot.empty) {
        console.log(`❌ No hay resultado para ${dayKey}`);
        continue;
      }
      
      const gameResult = resultsSnapshot.docs[0].data();
      const winningNumbers = gameResult.winningNumbers;
      
      // Contar tickets de ese día
      const ticketsQuery = query(
        collection(db, 'player_tickets'),
        where('gameDay', '==', dayKey)
      );
      
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const totalTickets = ticketsSnapshot.size;
      
      // Información del día
      const hasWinners = daysWithWinners.includes(dayKey);
      const totalWinners = (gameResult.firstPrize?.length || 0) + 
                          (gameResult.secondPrize?.length || 0) + 
                          (gameResult.thirdPrize?.length || 0) + 
                          (gameResult.freePrize?.length || 0);
      
      console.log(`${hasWinners ? '🏆' : '💔'} ${dayKey}:`);
      console.log(`   Números ganadores: ${winningNumbers?.join('') || 'N/A'}`);
      console.log(`   Total tickets: ${totalTickets}`);
      console.log(`   Ganadores: F:${gameResult.firstPrize?.length || 0} S:${gameResult.secondPrize?.length || 0} T:${gameResult.thirdPrize?.length || 0} G:${gameResult.freePrize?.length || 0} (Total: ${totalWinners})`);
      
      // Analizar características de los números ganadores
      if (winningNumbers && Array.isArray(winningNumbers)) {
        const uniqueEmojis = [...new Set(winningNumbers)];
        const hasRepeats = uniqueEmojis.length !== winningNumbers.length;
        const repeatCount = winningNumbers.length - uniqueEmojis.length;
        
        console.log(`   Emojis únicos: ${uniqueEmojis.length}/4 ${hasRepeats ? `(${repeatCount} repetidos)` : '(sin repetidos)'}`);
        
        if (hasRepeats) {
          // Mostrar cuáles se repiten
          const counts = {};
          winningNumbers.forEach(emoji => {
            counts[emoji] = (counts[emoji] || 0) + 1;
          });
          const repeated = Object.entries(counts).filter(([emoji, count]) => count > 1);
          console.log(`   Repetidos: ${repeated.map(([emoji, count]) => `${emoji}×${count}`).join(', ')}`);
        }
      }
    }
    
    // Análisis de patrones
    console.log(`\n[compareWinningDays] 📊 ANÁLISIS DE PATRONES:`);
    console.log(`🏆 Días CON ganadores: Probablemente tenían números con menos repeticiones`);
    console.log(`💔 Días SIN ganadores: Probablemente tienen muchos emojis repetidos que dificultan ganar`);
    
  } catch (error) {
    console.error('[compareWinningDays] ❌ Error:', error);
    return null;
  }
};

// Función para ver todos los tickets del usuario en todas las fechas
(window as any).getAllMyTickets = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs, orderBy } = await import('firebase/firestore');
    const { getCurrentUser } = await import('./firebase/auth');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('[getAllMyTickets] ❌ No hay usuario logueado');
      return;
    }
    
    console.log(`[getAllMyTickets] 🔍 Buscando TODOS los tickets del usuario: ${user.id}`);
    
    // Obtener TODOS los tickets del usuario sin filtro de fecha
    const ticketsQuery = query(
      collection(db, 'player_tickets'),
      where('userId', '==', user.id),
      orderBy('timestamp', 'desc')
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const allTickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`[getAllMyTickets] 📊 Total de tickets encontrados: ${allTickets.length}`);
    
    // Agrupar por gameDay
    const ticketsByDay = {};
    allTickets.forEach(ticket => {
      const gameDay = ticket.gameDay || 'undefined';
      if (!ticketsByDay[gameDay]) {
        ticketsByDay[gameDay] = [];
      }
      ticketsByDay[gameDay].push(ticket);
    });
    
    console.log(`[getAllMyTickets] 📅 Tickets por día:`);
    Object.entries(ticketsByDay)
      .sort(([a], [b]) => b.localeCompare(a)) // Ordenar por fecha descendente
      .forEach(([gameDay, tickets]) => {
        const activeTickets = tickets.filter(t => t.isActive);
        console.log(`- ${gameDay}: ${tickets.length} tickets (${activeTickets.length} activos)`);
      });
    
    const totalActive = allTickets.filter(t => t.isActive).length;
    console.log(`[getAllMyTickets] 🎫 Total tickets activos: ${totalActive}`);
    
    return { allTickets, ticketsByDay, totalActive };
    
  } catch (error) {
    console.error('[getAllMyTickets] ❌ Error:', error);
    return null;
  }
};

// Función para investigar usuarios específicos y sus tickets
(window as any).investigateUserTickets = async (walletAddress) => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs, orderBy } = await import('firebase/firestore');
    
    if (!walletAddress) {
      console.log('[investigateUserTickets] ❌ Proporciona una wallet address');
      console.log('Ejemplo: investigateUserTickets("0xeb10C0D7804bb7B318D5059B04aaf3a038b1e0F2")');
      return;
    }
    
    console.log(`[investigateUserTickets] 🔍 Investigando usuario: ${walletAddress}`);
    
    // 1. Buscar tickets por walletAddress en player_tickets
    console.log(`\n1️⃣ Buscando en colección 'player_tickets':`);
    
    const ticketsByWalletQuery = query(
      collection(db, 'player_tickets'),
      where('walletAddress', '==', walletAddress),
      orderBy('timestamp', 'desc')
    );
    
    const ticketsByWalletSnapshot = await getDocs(ticketsByWalletQuery);
    const ticketsByWallet = ticketsByWalletSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Tickets encontrados en player_tickets: ${ticketsByWallet.length}`);
    
    if (ticketsByWallet.length > 0) {
      // Agrupar por gameDay
      const byGameDay = {};
      ticketsByWallet.forEach(ticket => {
        const day = ticket.gameDay || 'undefined';
        if (!byGameDay[day]) byGameDay[day] = [];
        byGameDay[day].push(ticket);
      });
      
      console.log('📅 Distribución por gameDay:');
      Object.entries(byGameDay).forEach(([day, tickets]) => {
        console.log(`   ${day}: ${tickets.length} tickets`);
      });
      
      // Mostrar algunos ejemplos
      console.log('🎫 Últimos 5 tickets en BD:');
      ticketsByWallet.slice(0, 5).forEach((ticket, i) => {
        const date = ticket.timestamp ? new Date(ticket.timestamp.seconds * 1000) : new Date();
        console.log(`   ${i+1}. ID: ${ticket.id.substring(0, 8)}, GameDay: ${ticket.gameDay}, Fecha: ${date.toLocaleString()}, Activo: ${ticket.isActive}`);
      });
    }
    
    // 2. Buscar por userId si existe
    if (ticketsByWallet.length > 0) {
      const userId = ticketsByWallet[0].userId;
      if (userId) {
        console.log(`\n2️⃣ Buscando por userId '${userId}' en player_tickets:`);
        
        const ticketsByUserQuery = query(
          collection(db, 'player_tickets'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc')
        );
        
        const ticketsByUserSnapshot = await getDocs(ticketsByUserQuery);
        console.log(`📊 Tickets por userId: ${ticketsByUserSnapshot.size}`);
      }
    }
    
    // 3. Buscar en otras posibles colecciones
    console.log(`\n3️⃣ Buscando en otras colecciones:`);
    
    const otherCollections = ['tickets', 'user_tickets', 'daily_tickets'];
    
    for (const collectionName of otherCollections) {
      try {
        const otherQuery = query(
          collection(db, collectionName),
          where('walletAddress', '==', walletAddress)
        );
        
        const otherSnapshot = await getDocs(otherQuery);
        console.log(`📊 Tickets en '${collectionName}': ${otherSnapshot.size}`);
        
        if (otherSnapshot.size > 0) {
          console.log(`   ⚠️ ¡Encontrados tickets en '${collectionName}'!`);
        }
      } catch (error) {
        console.log(`   ❌ Colección '${collectionName}' no existe o error: ${error.message}`);
      }
    }
    
    // 4. Verificar qué muestra el frontend vs BD
    console.log(`\n4️⃣ COMPARACIÓN FRONTEND vs BASE DE DATOS:`);
    console.log(`Frontend reporta:`);
    console.log(`   - Usuario 0xeb10C0D7804bb7B318D5059B04aaf3a038b1e0F2: 189 tickets del 10 de junio`);
    console.log(`   - Usuario 0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0: 449 tickets del 10 de junio`);
    console.log(`Base de datos encontró:`);
    console.log(`   - ${walletAddress}: ${ticketsByWallet.length} tickets totales`);
    
    return {
      walletAddress,
      ticketsInDB: ticketsByWallet.length,
      ticketsData: ticketsByWallet
    };
    
  } catch (error) {
    console.error('[investigateUserTickets] ❌ Error:', error);
    return null;
  }
};

// Función para comparar lo que muestra el frontend vs la BD
(window as any).compareFrontendVsDB = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs } = await import('firebase/firestore');
    
    console.log(`[compareFrontendVsDB] 🔍 Comparando frontend vs base de datos...`);
    
    // Usuarios reportados con problemas
    const problematicUsers = [
      '0xeb10C0D7804bb7B318D5059B04aaf3a038b1e0F2',
      '0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0'
    ];
    
    for (const walletAddress of problematicUsers) {
      console.log(`\n🔍 Verificando usuario: ${walletAddress}`);
      
      // Contar tickets del 9 de junio
      const tickets9Query = query(
        collection(db, 'player_tickets'),
        where('walletAddress', '==', walletAddress),
        where('gameDay', '==', '2025-06-09')
      );
      
      const tickets9Snapshot = await getDocs(tickets9Query);
      
      // Contar tickets del 10 de junio
      const tickets10Query = query(
        collection(db, 'player_tickets'),
        where('walletAddress', '==', walletAddress),
        where('gameDay', '==', '2025-06-10')
      );
      
      const tickets10Snapshot = await getDocs(tickets10Query);
      
      // Contar TODOS los tickets
      const allTicketsQuery = query(
        collection(db, 'player_tickets'),
        where('walletAddress', '==', walletAddress)
      );
      
      const allTicketsSnapshot = await getDocs(allTicketsQuery);
      
      console.log(`📊 Resultados para ${walletAddress.substring(0, 8)}...:`);
      console.log(`   - Día 9: ${tickets9Snapshot.size} tickets en BD`);
      console.log(`   - Día 10: ${tickets10Snapshot.size} tickets en BD`);
      console.log(`   - Total: ${allTicketsSnapshot.size} tickets en BD`);
      
      // Analizar si hay discrepancia
      const expectedDay10 = walletAddress === '0xeb10C0D7804bb7B318D5059B04aaf3a038b1e0F2' ? 189 : 449;
      const actualDay10 = tickets10Snapshot.size;
      
      if (actualDay10 !== expectedDay10) {
        console.log(`   ⚠️ DISCREPANCIA: Frontend reporta ${expectedDay10}, BD tiene ${actualDay10}`);
      } else {
        console.log(`   ✅ COINCIDE: Frontend y BD reportan ${actualDay10} tickets`);
      }
    }
    
    // Verificar totales generales
    console.log(`\n📊 VERIFICACIÓN GENERAL:`);
    
    const totalTickets9Query = query(
      collection(db, 'player_tickets'),
      where('gameDay', '==', '2025-06-09')
    );
    
    const totalTickets9Snapshot = await getDocs(totalTickets9Query);
    
    const totalTickets10Query = query(
      collection(db, 'player_tickets'),
      where('gameDay', '==', '2025-06-10')
    );
    
    const totalTickets10Snapshot = await getDocs(totalTickets10Query);
    
    console.log(`Total tickets día 9 en BD: ${totalTickets9Snapshot.size}`);
    console.log(`Total tickets día 10 en BD: ${totalTickets10Snapshot.size}`);
    
  } catch (error) {
    console.error('[compareFrontendVsDB] ❌ Error:', error);
    return null;
  }
};

// Función simple para investigar usuarios sin índices
(window as any).simpleUserInvestigation = async (walletAddress) => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs } = await import('firebase/firestore');
    
    if (!walletAddress) {
      console.log('[simpleUserInvestigation] ❌ Proporciona una wallet address');
      return;
    }
    
    console.log(`[simpleUserInvestigation] 🔍 Investigando: ${walletAddress}`);
    
    // Buscar sin orderBy para evitar problemas de índice
    const ticketsQuery = query(
      collection(db, 'player_tickets'),
      where('walletAddress', '==', walletAddress)
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Total tickets encontrados: ${tickets.length}`);
    
    if (tickets.length === 0) {
      console.log(`❌ NO HAY TICKETS en la BD para ${walletAddress}`);
      console.log(`🔍 Esto significa que los tickets mostrados en el frontend NUNCA se guardaron`);
      return { tickets: [], issue: 'NO_TICKETS_IN_DB' };
    }
    
    // Agrupar por gameDay
    const byGameDay = {};
    tickets.forEach(ticket => {
      const day = ticket.gameDay || 'undefined';
      if (!byGameDay[day]) byGameDay[day] = [];
      byGameDay[day].push(ticket);
    });
    
    console.log(`📅 Tickets por gameDay:`);
    Object.entries(byGameDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([day, dayTickets]) => {
        console.log(`   ${day}: ${dayTickets.length} tickets`);
      });
    
    // Mostrar fechas de los últimos tickets para ver el patrón
    const sortedTickets = tickets.sort((a, b) => {
      const timeA = a.timestamp?.seconds || a.timestamp || 0;
      const timeB = b.timestamp?.seconds || b.timestamp || 0;
      return timeB - timeA;
    });
    
    console.log(`🎫 Últimos 10 tickets (por timestamp):`);
    sortedTickets.slice(0, 10).forEach((ticket, i) => {
      const timestamp = ticket.timestamp?.seconds ? 
        new Date(ticket.timestamp.seconds * 1000) : 
        new Date(ticket.timestamp || 0);
      
      console.log(`   ${i+1}. GameDay: ${ticket.gameDay}, Fecha real: ${timestamp.toLocaleString()}, ID: ${ticket.id.substring(0, 8)}`);
    });
    
    return { 
      tickets, 
      byGameDay, 
      totalTickets: tickets.length,
      issue: tickets.length > 0 ? 'WRONG_GAMEDAY' : 'NO_TICKETS_IN_DB'
    };
    
  } catch (error) {
    console.error('[simpleUserInvestigation] ❌ Error:', error);
    return null;
  }
};

// Función para buscar tickets temporales o en memoria
(window as any).checkTemporaryTickets = async () => {
  try {
    console.log(`[checkTemporaryTickets] 🔍 Verificando tickets temporales/en memoria...`);
    
    // 1. Verificar el estado local del hook useGameState
    const { useGameState } = await import('./hooks/useGameState');
    console.log('🔍 Intentando acceder al estado local del juego...');
    
    // 2. Verificar localStorage
    console.log('🔍 Verificando localStorage:');
    const localStorageKeys = Object.keys(localStorage).filter(key => 
      key.includes('ticket') || key.includes('game') || key.includes('moji')
    );
    
    if (localStorageKeys.length > 0) {
      console.log('📱 Datos en localStorage:');
      localStorageKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`   ${key}: ${value?.substring(0, 100)}...`);
      });
    } else {
      console.log('📱 No hay datos relevantes en localStorage');
    }
    
    // 3. Verificar sessionStorage  
    console.log('🔍 Verificando sessionStorage:');
    const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('ticket') || key.includes('game') || key.includes('moji')
    );
    
    if (sessionStorageKeys.length > 0) {
      console.log('📱 Datos en sessionStorage:');
      sessionStorageKeys.forEach(key => {
        const value = sessionStorage.getItem(key);
        console.log(`   ${key}: ${value?.substring(0, 100)}...`);
      });
    } else {
      console.log('📱 No hay datos relevantes en sessionStorage');
    }
    
    // 4. Verificar si hay tickets con ID temporal
    const { db } = await import('./firebase/config');
    const { query, collection, getDocs } = await import('firebase/firestore');
    
    const tempTicketsQuery = query(collection(db, 'player_tickets'));
    const tempTicketsSnapshot = await getDocs(tempTicketsQuery);
    
    const tempTickets = [];
    tempTicketsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (doc.id.startsWith('temp-') || data.isTemporary) {
        tempTickets.push({ id: doc.id, ...data });
      }
    });
    
    if (tempTickets.length > 0) {
      console.log(`🔍 Encontrados ${tempTickets.length} tickets temporales en BD`);
      tempTickets.forEach(ticket => {
        console.log(`   Temp ticket: ${ticket.id}, GameDay: ${ticket.gameDay}`);
      });
    } else {
      console.log('🔍 No hay tickets temporales en BD');
    }
    
  } catch (error) {
    console.error('[checkTemporaryTickets] ❌ Error:', error);
    return null;
  }
};

// Función para verificar ganadores incluyendo tickets con gameDay undefined
(window as any).checkAllTicketsForWinners = async (targetDate = '2025-06-09') => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs } = await import('firebase/firestore');
    const { checkWin } = await import('./utils/gameLogic');
    
    console.log(`[checkAllTicketsForWinners] 🔍 Verificando TODOS los tickets para ${targetDate}...`);
    
    // 1. Obtener números ganadores de esa fecha
    const resultsQuery = query(
      collection(db, 'game_results'),
      where('dayKey', '==', targetDate)
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    
    if (resultsSnapshot.empty) {
      console.log(`❌ No hay resultado para ${targetDate}`);
      return;
    }
    
    const gameResult = resultsSnapshot.docs[0].data();
    const winningNumbers = gameResult.winningNumbers;
    
    console.log(`🎯 Números ganadores del ${targetDate}: ${winningNumbers.join('')}`);
    
    // 2. Obtener TODOS los tickets de la BD (incluyendo undefined gameDay)
    const allTicketsQuery = query(collection(db, 'player_tickets'));
    const allTicketsSnapshot = await getDocs(allTicketsQuery);
    const allTickets = allTicketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Total tickets en toda la BD: ${allTickets.length}`);
    
    // 3. Filtrar tickets relevantes por fecha aproximada
    const targetDateObj = new Date(targetDate + 'T00:00:00');
    const dayBefore = new Date(targetDateObj.getTime() - 24 * 60 * 60 * 1000);
    const dayAfter = new Date(targetDateObj.getTime() + 24 * 60 * 60 * 1000);
    
    const relevantTickets = allTickets.filter(ticket => {
      // Incluir tickets con gameDay exacto
      if (ticket.gameDay === targetDate) return true;
      
      // Incluir tickets con gameDay undefined pero fecha relevante
      if (ticket.gameDay === undefined || ticket.gameDay === null) {
        const ticketDate = ticket.timestamp?.seconds ? 
          new Date(ticket.timestamp.seconds * 1000) : 
          new Date(ticket.timestamp || 0);
        
        return ticketDate >= dayBefore && ticketDate <= dayAfter;
      }
      
      return false;
    });
    
    console.log(`🎫 Tickets relevantes para verificar: ${relevantTickets.length}`);
    console.log(`   - Con gameDay correcto: ${relevantTickets.filter(t => t.gameDay === targetDate).length}`);
    console.log(`   - Con gameDay undefined: ${relevantTickets.filter(t => !t.gameDay).length}`);
    
    // 4. Verificar ganadores en TODOS los tickets relevantes
    const results = {
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: [],
      noWin: []
    };
    
    console.log(`🔍 Verificando ${relevantTickets.length} tickets...`);
    
    relevantTickets.forEach((ticket, index) => {
      if (!ticket.numbers || !Array.isArray(ticket.numbers)) return;
      
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      if (winStatus.firstPrize) results.firstPrize.push(ticket);
      else if (winStatus.secondPrize) results.secondPrize.push(ticket);
      else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
      else if (winStatus.freePrize) results.freePrize.push(ticket);
      else results.noWin.push(ticket);
      
      if ((index + 1) % 500 === 0) {
        console.log(`Procesados ${index + 1}/${relevantTickets.length}...`);
      }
    });
    
    console.log(`\n[checkAllTicketsForWinners] 🏆 GANADORES REALES (incluyendo gameDay undefined):`);
    console.log(`- Primer premio: ${results.firstPrize.length} ganadores`);
    console.log(`- Segundo premio: ${results.secondPrize.length} ganadores`);
    console.log(`- Tercer premio: ${results.thirdPrize.length} ganadores`);
    console.log(`- Ticket gratis: ${results.freePrize.length} ganadores`);
    
    // 5. Mostrar algunos ejemplos de ganadores
    if (results.firstPrize.length > 0) {
      console.log(`\n🥇 Ejemplos de PRIMER PREMIO:`);
      results.firstPrize.slice(0, 3).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId || 'N/A'}, GameDay: ${ticket.gameDay || 'undefined'}`);
      });
    }
    
    if (results.secondPrize.length > 0) {
      console.log(`\n🥈 Ejemplos de SEGUNDO PREMIO:`);
      results.secondPrize.slice(0, 3).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId || 'N/A'}, GameDay: ${ticket.gameDay || 'undefined'}`);
      });
    }
    
    if (results.thirdPrize.length > 0) {
      console.log(`\n🥉 Ejemplos de TERCER PREMIO:`);
      results.thirdPrize.slice(0, 3).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId || 'N/A'}, GameDay: ${ticket.gameDay || 'undefined'}`);
      });
    }
    
    if (results.freePrize.length > 0) {
      console.log(`\n🎟️ Ejemplos de TICKET GRATIS:`);
      results.freePrize.slice(0, 3).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId || 'N/A'}, GameDay: ${ticket.gameDay || 'undefined'}`);
      });
    }
    
    // 6. Comparar con los resultados oficiales guardados
    console.log(`\n📊 COMPARACIÓN CON RESULTADOS OFICIALES:`);
    console.log(`Oficial: F:${gameResult.firstPrize?.length || 0} S:${gameResult.secondPrize?.length || 0} T:${gameResult.thirdPrize?.length || 0} G:${gameResult.freePrize?.length || 0}`);
    console.log(`Real: F:${results.firstPrize.length} S:${results.secondPrize.length} T:${results.thirdPrize.length} G:${results.freePrize.length}`);
    
    const totalOfficial = (gameResult.firstPrize?.length || 0) + (gameResult.secondPrize?.length || 0) + (gameResult.thirdPrize?.length || 0) + (gameResult.freePrize?.length || 0);
    const totalReal = results.firstPrize.length + results.secondPrize.length + results.thirdPrize.length + results.freePrize.length;
    
    if (totalReal > totalOfficial) {
      console.log(`🚨 ¡HAY ${totalReal - totalOfficial} GANADORES NO DETECTADOS!`);
    }
    
    return {
      winningNumbers,
      officialResults: {
        firstPrize: gameResult.firstPrize?.length || 0,
        secondPrize: gameResult.secondPrize?.length || 0,
        thirdPrize: gameResult.thirdPrize?.length || 0,
        freePrize: gameResult.freePrize?.length || 0
      },
      actualResults: {
        firstPrize: results.firstPrize.length,
        secondPrize: results.secondPrize.length,
        thirdPrize: results.thirdPrize.length,
        freePrize: results.freePrize.length
      },
      totalTicketsChecked: relevantTickets.length,
      winnersFound: results
    };
    
  } catch (error) {
    console.error('[checkAllTicketsForWinners] ❌ Error:', error);
    return null;
  }
};

// Función para verificar ganadores incluyendo tickets con gameDay undefined
(window as any).checkAllTicketsForWinners = async (targetDate = '2025-06-09') => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs } = await import('firebase/firestore');
    const { checkWin } = await import('./utils/gameLogic');
    
    console.log(`[checkAllTicketsForWinners] 🔍 Verificando TODOS los tickets para ${targetDate}...`);
    
    // 1. Obtener números ganadores de esa fecha
    const resultsQuery = query(
      collection(db, 'game_results'),
      where('dayKey', '==', targetDate)
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    
    if (resultsSnapshot.empty) {
      console.log(`❌ No hay resultado para ${targetDate}`);
      return;
    }
    
    const gameResult = resultsSnapshot.docs[0].data();
    const winningNumbers = gameResult.winningNumbers;
    
    console.log(`🎯 Números ganadores del ${targetDate}: ${winningNumbers.join('')}`);
    
    // 2. Obtener TODOS los tickets de la BD (incluyendo undefined gameDay)
    const allTicketsQuery = query(collection(db, 'player_tickets'));
    const allTicketsSnapshot = await getDocs(allTicketsQuery);
    const allTickets = allTicketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Total tickets en toda la BD: ${allTickets.length}`);
    
    // 3. Filtrar tickets relevantes por fecha aproximada
    const targetDateObj = new Date(targetDate + 'T00:00:00');
    const dayBefore = new Date(targetDateObj.getTime() - 24 * 60 * 60 * 1000);
    const dayAfter = new Date(targetDateObj.getTime() + 24 * 60 * 60 * 1000);
    
    const relevantTickets = allTickets.filter(ticket => {
      // Incluir tickets con gameDay exacto
      if (ticket.gameDay === targetDate) return true;
      
      // Incluir tickets con gameDay undefined pero fecha relevante
      if (ticket.gameDay === undefined || ticket.gameDay === null) {
        const ticketDate = ticket.timestamp?.seconds ? 
          new Date(ticket.timestamp.seconds * 1000) : 
          new Date(ticket.timestamp || 0);
        
        return ticketDate >= dayBefore && ticketDate <= dayAfter;
      }
      
      return false;
    });
    
    console.log(`🎫 Tickets relevantes para verificar: ${relevantTickets.length}`);
    console.log(`   - Con gameDay correcto: ${relevantTickets.filter(t => t.gameDay === targetDate).length}`);
    console.log(`   - Con gameDay undefined: ${relevantTickets.filter(t => !t.gameDay).length}`);
    
    // 4. Verificar ganadores en TODOS los tickets relevantes
    const results = {
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: [],
      noWin: []
    };
    
    console.log(`🔍 Verificando ${relevantTickets.length} tickets...`);
    
    relevantTickets.forEach((ticket, index) => {
      if (!ticket.numbers || !Array.isArray(ticket.numbers)) return;
      
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      if (winStatus.firstPrize) results.firstPrize.push(ticket);
      else if (winStatus.secondPrize) results.secondPrize.push(ticket);
      else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
      else if (winStatus.freePrize) results.freePrize.push(ticket);
      else results.noWin.push(ticket);
      
      if ((index + 1) % 500 === 0) {
        console.log(`Procesados ${index + 1}/${relevantTickets.length}...`);
      }
    });
    
    console.log(`\n[checkAllTicketsForWinners] 🏆 GANADORES REALES (incluyendo gameDay undefined):`);
    console.log(`- Primer premio: ${results.firstPrize.length} ganadores`);
    console.log(`- Segundo premio: ${results.secondPrize.length} ganadores`);
    console.log(`- Tercer premio: ${results.thirdPrize.length} ganadores`);
    console.log(`- Ticket gratis: ${results.freePrize.length} ganadores`);
    
    // 5. Mostrar algunos ejemplos de ganadores
    if (results.firstPrize.length > 0) {
      console.log(`\n🥇 Ejemplos de PRIMER PREMIO:`);
      results.firstPrize.slice(0, 3).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId || 'N/A'}, GameDay: ${ticket.gameDay || 'undefined'}`);
      });
    }
    
    if (results.secondPrize.length > 0) {
      console.log(`\n🥈 Ejemplos de SEGUNDO PREMIO:`);
      results.secondPrize.slice(0, 3).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId || 'N/A'}, GameDay: ${ticket.gameDay || 'undefined'}`);
      });
    }
    
    if (results.thirdPrize.length > 0) {
      console.log(`\n🥉 Ejemplos de TERCER PREMIO:`);
      results.thirdPrize.slice(0, 3).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId || 'N/A'}, GameDay: ${ticket.gameDay || 'undefined'}`);
      });
    }
    
    if (results.freePrize.length > 0) {
      console.log(`\n🎟️ Ejemplos de TICKET GRATIS:`);
      results.freePrize.slice(0, 3).forEach((ticket, i) => {
        console.log(`${i + 1}. ${ticket.numbers.join('')} vs ${winningNumbers.join('')} - Usuario: ${ticket.userId || 'N/A'}, GameDay: ${ticket.gameDay || 'undefined'}`);
      });
    }
    
    // 6. Comparar con los resultados oficiales guardados
    console.log(`\n📊 COMPARACIÓN CON RESULTADOS OFICIALES:`);
    console.log(`Oficial: F:${gameResult.firstPrize?.length || 0} S:${gameResult.secondPrize?.length || 0} T:${gameResult.thirdPrize?.length || 0} G:${gameResult.freePrize?.length || 0}`);
    console.log(`Real: F:${results.firstPrize.length} S:${results.secondPrize.length} T:${results.thirdPrize.length} G:${results.freePrize.length}`);
    
    const totalOfficial = (gameResult.firstPrize?.length || 0) + (gameResult.secondPrize?.length || 0) + (gameResult.thirdPrize?.length || 0) + (gameResult.freePrize?.length || 0);
    const totalReal = results.firstPrize.length + results.secondPrize.length + results.thirdPrize.length + results.freePrize.length;
    
    if (totalReal > totalOfficial) {
      console.log(`🚨 ¡HAY ${totalReal - totalOfficial} GANADORES NO DETECTADOS!`);
    }
    
    return {
      winningNumbers,
      officialResults: {
        firstPrize: gameResult.firstPrize?.length || 0,
        secondPrize: gameResult.secondPrize?.length || 0,
        thirdPrize: gameResult.thirdPrize?.length || 0,
        freePrize: gameResult.freePrize?.length || 0
      },
      actualResults: {
        firstPrize: results.firstPrize.length,
        secondPrize: results.secondPrize.length,
        thirdPrize: results.thirdPrize.length,
        freePrize: results.freePrize.length
      },
      totalTicketsChecked: relevantTickets.length,
      winnersFound: results
    };
    
  } catch (error) {
    console.error('[checkAllTicketsForWinners] ❌ Error:', error);
    return null;
  }
  };

// Función para verificar discrepancia de conteo tokens vs tickets
(window as any).checkTokensVsTickets = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs } = await import('firebase/firestore');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`[checkTokensVsTickets] 🔍 Verificando conteo para ${today}...`);
    
    // 1. Contar tokens del día - corregir búsqueda
    const tokensQuery = query(
      collection(db, 'daily_tokens'),
      where('date', '==', today)
    );
    const tokensSnapshot = await getDocs(tokensQuery);
    const totalTokens = tokensSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.tokensUsed || 0);
    }, 0);
    
    console.log(`💰 Total tokens del día (${today}): ${totalTokens}`);
    console.log(`📊 Documentos de tokens encontrados: ${tokensSnapshot.docs.length}`);
    
    // 2. Contar tickets del día
    const ticketsQuery = query(
      collection(db, 'player_tickets'),
      where('gameDay', '==', today)
    );
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const totalTickets = ticketsSnapshot.docs.length;
    
    console.log(`🎫 Total tickets del día (${today}): ${totalTickets}`);
    
    // 3. Agrupar por usuario
    const userStats = {};
    
    // Procesar tokens por usuario
    tokensSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      if (!userStats[userId]) {
        userStats[userId] = { tokens: 0, tickets: 0 };
      }
      userStats[userId].tokens += (data.tokensUsed || 0);
    });
    
    // Procesar tickets por usuario
    ticketsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      if (!userStats[userId]) {
        userStats[userId] = { tokens: 0, tickets: 0 };
      }
      userStats[userId].tickets += 1;
    });
    
    console.log('\n📋 ANÁLISIS POR USUARIO:');
    console.log('Usuario | Tokens | Tickets | Ratio');
    console.log('----------------------------------------');
    
    let totalUsers = 0;
    let usersWithDiscrepancy = 0;
    
    Object.entries(userStats).forEach(([userId, stats]) => {
      totalUsers++;
      const ratio = stats.tokens > 0 ? (stats.tickets / stats.tokens).toFixed(2) : 'N/A';
      const shortUserId = userId.substring(0, 10) + '...';
      
      console.log(`${shortUserId} | ${stats.tokens} | ${stats.tickets} | ${ratio}`);
      
      if (stats.tickets > stats.tokens * 2) {
        console.log(`  ⚠️  DISCREPANCIA: ${stats.tickets} tickets > ${stats.tokens * 2} esperados`);
        usersWithDiscrepancy++;
      }
    });
    
    console.log('\n📊 RESUMEN:');
    console.log(`Total usuarios activos hoy: ${totalUsers}`);
    console.log(`Total tokens generados: ${totalTokens}`);
    console.log(`Total tickets creados: ${totalTickets}`);
    console.log(`Ratio general: ${totalTokens > 0 ? (totalTickets / totalTokens).toFixed(2) : 'N/A'} tickets/token`);
    console.log(`Usuarios con discrepancias: ${usersWithDiscrepancy}/${totalUsers}`);
    
    if (totalTickets > totalTokens * 2) {
      console.log(`🚨 PROBLEMA: Se crearon ${totalTickets - totalTokens} tickets extra`);
    }
    
    return {
      totalTokens,
      totalTickets,
      totalUsers,
      usersWithDiscrepancy,
      ratio: totalTokens > 0 ? totalTickets / totalTokens : 0,
      userStats
    };
    
  } catch (error) {
    console.error('[checkTokensVsTickets] ❌ Error:', error);
    return null;
  }
};
  
  // Función para revisar manualmente la lógica de verificación
(window as any).testWinLogic = async () => {
  const { checkWin } = await import('./utils/gameLogic');
  
  console.log('[testWinLogic] 🧪 Probando lógica de verificación de premios...');
  
  const testCases = [
    {
      name: 'Primer premio (4 exactos)',
      ticket: ['🌟', '🎈', '🎨', '🌈'],
      winning: ['🌟', '🎈', '🎨', '🌈'],
      expected: { firstPrize: true, secondPrize: false, thirdPrize: false, freePrize: false }
    },
    {
      name: 'Segundo premio (4 cualquier orden)',
      ticket: ['🌈', '🎨', '🎈', '🌟'],
      winning: ['🌟', '🎈', '🎨', '🌈'],
      expected: { firstPrize: false, secondPrize: true, thirdPrize: false, freePrize: false }
    },
    {
      name: 'Tercer premio (3 exactos)',
      ticket: ['🌟', '🎈', '🎨', '🦄'],
      winning: ['🌟', '🎈', '🎨', '🌈'],
      expected: { firstPrize: false, secondPrize: false, thirdPrize: true, freePrize: false }
    },
    {
      name: 'Ticket gratis (3 cualquier orden)',
      ticket: ['🌈', '🦄', '🎈', '🌟'],
      winning: ['🌟', '🎈', '🎨', '🌈'],
      expected: { firstPrize: false, secondPrize: false, thirdPrize: false, freePrize: true }
    },
    {
      name: 'Sin premio',
      ticket: ['🦄', '🍭', '🎪', '🎠'],
      winning: ['🌟', '🎈', '🎨', '🌈'],
      expected: { firstPrize: false, secondPrize: false, thirdPrize: false, freePrize: false }
    }
  ];
  
  testCases.forEach(test => {
    const result = checkWin(test.ticket, test.winning);
    const passed = JSON.stringify(result) === JSON.stringify(test.expected);
    
    console.log(`${passed ? '✅' : '❌'} ${test.name}:`, {
      ticket: test.ticket,
      winning: test.winning,
      result: result,
      expected: test.expected,
      passed: passed
    });
  });
};

// Función para distribuir premios históricos
(window as any).distributeHistoricalPrizes = async (force: boolean = false) => {
  try {
    console.log('Iniciando distribución de premios históricos...');
    const result = await distributeHistoricalPrizes(force);
    console.log('Resultado:', result);
    return result;
  } catch (error) {
    console.error('Error al distribuir premios históricos:', error);
    return { success: false, error };
  }
};

// Función para debuggear tokens ganados
(window as any).debugWonTokens = async () => {
  try {
    const { getCurrentUser } = await import('./firebase/auth');
    const { getUserTokenTransactions, getAvailableWonTokens } = await import('./firebase/tokens');
    const { getAvailableWonTokens: getAvailableWonTokensPrizes } = await import('./firebase/prizes');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ No hay usuario conectado');
      return;
    }
    
    console.log(`🔍 Debuggeando tokens ganados para usuario: ${user.id}`);
    
    // 1. Obtener todas las transacciones
    const transactions = await getUserTokenTransactions(user.id, 100);
    console.log(`📊 Total transacciones encontradas: ${transactions.length}`);
    
    // 2. Filtrar transacciones de premios
    const prizeTransactions = transactions.filter(tx => 
      tx.type === 'prize_first' || 
      tx.type === 'prize_second' || 
      tx.type === 'prize_third' ||
      tx.type === 'prize_received'
    );
    console.log(`🏆 Transacciones de premios: ${prizeTransactions.length}`);
    prizeTransactions.forEach(tx => {
      console.log(`  - ${tx.type}: +${tx.amount} tokens (${tx.gameDay})`);
    });
    
    // 3. Filtrar transacciones de reclamaciones
    const claimedTransactions = transactions.filter(tx => tx.type === 'prize_claimed');
    console.log(`💸 Transacciones de reclamaciones: ${claimedTransactions.length}`);
    claimedTransactions.forEach(tx => {
      console.log(`  - Reclamado: ${tx.amount} tokens`);
    });
    
    // 4. Calcular tokens disponibles
    const totalWon = prizeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalClaimed = claimedTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const available = totalWon - totalClaimed;
    
    console.log(`\n📈 Resumen:`);
    console.log(`  Total ganados: ${totalWon}`);
    console.log(`  Total reclamados: ${totalClaimed}`);
    console.log(`  Disponibles: ${available}`);
    
    // 5. Verificar función de prizes
    const availableFromPrizes = await getAvailableWonTokensPrizes(user.id);
    console.log(`  Disponibles (función prizes): ${availableFromPrizes}`);
    
    return { totalWon, totalClaimed, available, availableFromPrizes, transactions };
    
  } catch (error) {
    console.error('❌ Error debuggeando tokens ganados:', error);
  }
};

// Función para verificar por qué las pools están vacías
(window as any).debugEmptyPools = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs, orderBy } = await import('firebase/firestore');
    
    console.log('🔍 Debuggeando pools vacías...');
    
    const days = ['2025-06-13', '2025-06-12', '2025-06-11', '2025-06-10', '2025-06-09'];
    
    for (const day of days) {
      console.log(`\n📅 Analizando día: ${day}`);
      
      // 1. Verificar tickets del día
      const ticketsQuery = query(
        collection(db, 'player_tickets'),
        where('gameDay', '==', day)
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const tickets = ticketsSnapshot.docs.map(doc => doc.data());
      
      console.log(`  🎫 Tickets encontrados: ${tickets.length}`);
      
      if (tickets.length > 0) {
        const activeTickets = tickets.filter(t => t.isActive);
        const tokenCosts = tickets.map(t => t.tokenCost || 1);
        const totalTokensFromTickets = tokenCosts.reduce((sum, cost) => sum + cost, 0);
        
        console.log(`    - Tickets activos: ${activeTickets.length}`);
        console.log(`    - Total tokens gastados: ${totalTokensFromTickets}`);
      }
      
      // 2. Verificar daily tokens del día
      const dailyTokensQuery = query(
        collection(db, 'daily_tokens'),
        where('date', '==', day)
      );
      const dailyTokensSnapshot = await getDocs(dailyTokensQuery);
      const dailyTokens = dailyTokensSnapshot.docs.map(doc => doc.data());
      
      console.log(`  💰 Registros de daily_tokens: ${dailyTokens.length}`);
      if (dailyTokens.length > 0) {
        const totalUsed = dailyTokens.reduce((sum, dt) => sum + (dt.tokensUsed || 0), 0);
        console.log(`    - Total tokens usados en daily_tokens: ${totalUsed}`);
      }
      
      // 3. Verificar pool del día
      const poolQuery = query(
        collection(db, 'prize_pools'),
        where('gameDay', '==', day)
      );
      const poolSnapshot = await getDocs(poolQuery);
      
      if (poolSnapshot.empty) {
        console.log(`  🏊‍♂️ Pool: No existe`);
      } else {
        const poolData = poolSnapshot.docs[0].data();
        console.log(`  🏊‍♂️ Pool: ${poolData.totalTokensCollected} tokens (distribuida: ${poolData.poolsDistributed})`);
      }
      
      // 4. Verificar ticket purchases del día
      const purchasesQuery = query(
        collection(db, 'ticket_purchases'),
        where('gameDay', '==', day)
      );
      const purchasesSnapshot = await getDocs(purchasesQuery);
      
      console.log(`  🛒 Ticket purchases: ${purchasesSnapshot.size}`);
    }
    
  } catch (error) {
    console.error('❌ Error debuggeando pools vacías:', error);
  }
};

// Función para distribuir pools manualmente
(window as any).forceDistributePools = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { distributePrizePool } = await import('./firebase/prizePools');
    const { query, collection, where, getDocs } = await import('firebase/firestore');
    
    console.log('🚀 Forzando distribución de pools no distribuidas...');
    
    // Obtener todas las pools no distribuidas
    const poolsQuery = query(
      collection(db, 'prize_pools'),
      where('poolsDistributed', '==', false)
    );
    
    const poolsSnapshot = await getDocs(poolsQuery);
    const undistributedPools = poolsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Pools no distribuidas encontradas: ${undistributedPools.length}`);
    
    for (const pool of undistributedPools) {
      if (pool.totalTokensCollected > 0) {
        console.log(`\n🏊‍♂️ Distribuyendo pool del día ${pool.gameDay} (${pool.totalTokensCollected} tokens)`);
        
        try {
          const result = await distributePrizePool(pool.gameDay);
          console.log(`✅ Pool ${pool.gameDay} distribuida:`, result);
        } catch (error) {
          console.error(`❌ Error distribuyendo pool ${pool.gameDay}:`, error);
        }
      } else {
        console.log(`⚠️ Pool ${pool.gameDay} no tiene tokens para distribuir`);
      }
    }
    
    console.log('\n🎉 Distribución de pools completada');
    
    // Ahora ejecutar distribución de premios históricos
    console.log('\n🏆 Ejecutando distribución de premios históricos...');
    const { distributeHistoricalPrizes } = await import('./firebase/distributeHistoricalPrizes');
    const result = await distributeHistoricalPrizes(true);
    console.log('📊 Resultado distribución histórica:', result);
    
    return { success: true, poolsProcessed: undistributedPools.length };
    
  } catch (error) {
    console.error('❌ Error forzando distribución de pools:', error);
    return { success: false, error: error.message };
  }
};

// Función para verificar todos los usuarios que han jugado
(window as any).checkAllUsers = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { query, collection, where, getDocs, orderBy } = await import('firebase/firestore');
    
    console.log('👥 Verificando todos los usuarios que han jugado...');
    
    const days = ['2025-06-13', '2025-06-12', '2025-06-11', '2025-06-10', '2025-06-09'];
    
    for (const day of days) {
      console.log(`\n📅 === DÍA: ${day} ===`);
      
      // 1. Obtener todos los tickets del día
      const ticketsQuery = query(
        collection(db, 'player_tickets'),
        where('gameDay', '==', day)
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const tickets = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 2. Agrupar por usuario
      const userStats = {};
      tickets.forEach(ticket => {
        const userId = ticket.userId;
        if (!userStats[userId]) {
          userStats[userId] = {
            username: ticket.username || 'Anónimo',
            walletAddress: ticket.walletAddress,
            tickets: 0,
            activeTickets: 0,
            tokensSpent: 0
          };
        }
        userStats[userId].tickets++;
        if (ticket.isActive) userStats[userId].activeTickets++;
        userStats[userId].tokensSpent += (ticket.tokenCost || 1);
      });
      
      const uniqueUsers = Object.keys(userStats).length;
      const totalTickets = tickets.length;
      const totalTokens = tickets.reduce((sum, t) => sum + (t.tokenCost || 1), 0);
      
      console.log(`  📊 Resumen del día:`);
      console.log(`    👥 Usuarios únicos: ${uniqueUsers}`);
      console.log(`    🎫 Total tickets: ${totalTickets}`);
      console.log(`    💰 Total tokens gastados: ${totalTokens}`);
      
      // 3. Mostrar top usuarios del día
      const topUsers = Object.entries(userStats)
        .sort(([,a], [,b]) => b.tokensSpent - a.tokensSpent)
        .slice(0, 5);
      
      console.log(`  🏆 Top 5 usuarios por tokens gastados:`);
      topUsers.forEach(([userId, stats], index) => {
        console.log(`    ${index + 1}. ${stats.username} (${userId.substring(0, 20)}...)`);
        console.log(`       💰 ${stats.tokensSpent} tokens | 🎫 ${stats.tickets} tickets`);
      });
      
      // 4. Verificar resultado del sorteo
      const resultsQuery = query(
        collection(db, 'game_results'),
        where('dayKey', '==', day)
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      
      if (!resultsSnapshot.empty) {
        const result = resultsSnapshot.docs[0].data();
        const totalWinners = (result.firstPrize?.length || 0) + 
                           (result.secondPrize?.length || 0) + 
                           (result.thirdPrize?.length || 0) + 
                           (result.freePrize?.length || 0);
        
        console.log(`  🎯 Resultado del sorteo:`);
        console.log(`    🥇 Primer premio: ${result.firstPrize?.length || 0} ganadores`);
        console.log(`    🥈 Segundo premio: ${result.secondPrize?.length || 0} ganadores`);
        console.log(`    🥉 Tercer premio: ${result.thirdPrize?.length || 0} ganadores`);
        console.log(`    🎟️ Premio gratis: ${result.freePrize?.length || 0} ganadores`);
        console.log(`    📊 Total ganadores: ${totalWinners}`);
        console.log(`    🎲 Números ganadores: ${result.winningNumbers?.join('') || 'N/A'}`);
      }
      
      // 5. Verificar pool del día
      const poolsQuery = query(
        collection(db, 'prize_pools'),
        where('gameDay', '==', day)
      );
      const poolsSnapshot = await getDocs(poolsQuery);
      
      if (!poolsSnapshot.empty) {
        const pool = poolsSnapshot.docs[0].data();
        console.log(`  🏊‍♂️ Pool del día:`);
        console.log(`    💰 Total tokens: ${pool.totalTokensCollected}`);
        console.log(`    ✅ Distribuida: ${pool.poolsDistributed ? 'SÍ' : 'NO'}`);
        console.log(`    🥇 Primer premio: ${pool.pools?.firstPrize || 0} tokens`);
        console.log(`    🥈 Segundo premio: ${pool.pools?.secondPrize || 0} tokens`);
        console.log(`    🥉 Tercer premio: ${pool.pools?.thirdPrize || 0} tokens`);
        console.log(`    💼 Desarrollo: ${pool.pools?.development || 0} tokens`);
      }
      
      // 6. Verificar transacciones de premios del día
      const prizeTransactionsQuery = query(
        collection(db, 'token_transactions'),
        where('gameDay', '==', day),
        where('type', 'in', ['prize_first', 'prize_second', 'prize_third'])
      );
      const prizeTransactionsSnapshot = await getDocs(prizeTransactionsQuery);
      
      if (prizeTransactionsSnapshot.size > 0) {
        console.log(`  💎 Premios distribuidos: ${prizeTransactionsSnapshot.size} transacciones`);
        const prizeTransactions = prizeTransactionsSnapshot.docs.map(doc => doc.data());
        const totalPrizeTokens = prizeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        console.log(`    💰 Total tokens en premios: ${totalPrizeTokens}`);
        
        // Agrupar por tipo de premio
        const prizesByType = {};
        prizeTransactions.forEach(tx => {
          if (!prizesByType[tx.type]) prizesByType[tx.type] = 0;
          prizesByType[tx.type] += tx.amount;
        });
        
        Object.entries(prizesByType).forEach(([type, amount]) => {
          const emoji = type === 'prize_first' ? '🥇' : type === 'prize_second' ? '🥈' : '🥉';
          console.log(`    ${emoji} ${type}: ${amount} tokens`);
        });
      } else {
        console.log(`  💎 Premios distribuidos: 0 transacciones`);
      }
    }
    
    // 7. Resumen general de todos los usuarios únicos
    console.log(`\n\n👥 === RESUMEN GENERAL ===`);
    
    const allUsersQuery = query(collection(db, 'player_tickets'));
    const allUsersSnapshot = await getDocs(allUsersQuery);
    const allTickets = allUsersSnapshot.docs.map(doc => doc.data());
    
    const allUsers = {};
    allTickets.forEach(ticket => {
      const userId = ticket.userId;
      if (!allUsers[userId]) {
        allUsers[userId] = {
          username: ticket.username || 'Anónimo',
          totalTickets: 0,
          totalTokens: 0,
          daysPlayed: new Set()
        };
      }
      allUsers[userId].totalTickets++;
      allUsers[userId].totalTokens += (ticket.tokenCost || 1);
      if (ticket.gameDay) allUsers[userId].daysPlayed.add(ticket.gameDay);
    });
    
    const totalUniqueUsers = Object.keys(allUsers).length;
    console.log(`📊 Total usuarios únicos que han jugado: ${totalUniqueUsers}`);
    
    // Top 10 usuarios de todos los tiempos
    const topAllTimeUsers = Object.entries(allUsers)
      .map(([userId, stats]) => ({
        userId,
        ...stats,
        daysPlayed: stats.daysPlayed.size
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 10);
    
    console.log(`\n🏆 Top 10 usuarios de todos los tiempos:`);
    topAllTimeUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.userId.substring(0, 20)}...)`);
      console.log(`   💰 ${user.totalTokens} tokens | 🎫 ${user.totalTickets} tickets | 📅 ${user.daysPlayed} días`);
    });
    
    return { totalUniqueUsers, topAllTimeUsers };
    
  } catch (error) {
    console.error('❌ Error verificando usuarios:', error);
    return { error: error.message };
  }
};

// Función para arreglar pools específicas que se saltaron
(window as any).fixMissingPools = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { distributePrizePool } = await import('./firebase/prizePools');
    const { query, collection, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
    
    console.log('🔧 Arreglando pools específicas que se saltaron...');
    
    // Pools específicas que sabemos que tienen tokens pero no se distribuyeron
    const problematicDays = ['2025-06-10', '2025-06-09', '2025-06-13', '2025-06-11'];
    
    for (const day of problematicDays) {
      console.log(`\n🔍 Verificando día: ${day}`);
      
      // 1. Verificar si la pool existe y tiene tokens
      const poolsQuery = query(
        collection(db, 'prize_pools'),
        where('gameDay', '==', day)
      );
      const poolsSnapshot = await getDocs(poolsQuery);
      
      if (poolsSnapshot.empty) {
        console.log(`⚠️ No existe pool para ${day}`);
        continue;
      }
      
      const poolDoc = poolsSnapshot.docs[0];
      const pool = poolDoc.data();
      
      console.log(`Pool encontrada: ${pool.totalTokensCollected} tokens, distribuida: ${pool.poolsDistributed}`);
      
      if (pool.totalTokensCollected > 0) {
        // 2. Si tiene tokens pero no está distribuida, forzar distribución
        if (!pool.poolsDistributed) {
          console.log(`🚀 Forzando distribución de pool ${day} con ${pool.totalTokensCollected} tokens`);
          
          try {
            const result = await distributePrizePool(day);
            console.log(`✅ Pool ${day} distribuida exitosamente:`, result);
          } catch (error) {
            console.error(`❌ Error distribuyendo pool ${day}:`, error);
          }
        } else {
          console.log(`✅ Pool ${day} ya está distribuida`);
          
          // 3. Verificar si realmente hay transacciones de premios
          const prizeQuery = query(
            collection(db, 'token_transactions'),
            where('gameDay', '==', day),
            where('type', 'in', ['prize_first', 'prize_second', 'prize_third'])
          );
          const prizeSnapshot = await getDocs(prizeQuery);
          
          if (prizeSnapshot.size === 0) {
            console.log(`⚠️ Pool marcada como distribuida pero sin transacciones de premios. Redistribuyendo...`);
            
            // Marcar como no distribuida y redistribuir
            await updateDoc(poolDoc.ref, { poolsDistributed: false });
            
            try {
              const result = await distributePrizePool(day);
              console.log(`✅ Pool ${day} redistribuida:`, result);
            } catch (error) {
              console.error(`❌ Error redistribuyendo pool ${day}:`, error);
            }
          } else {
            console.log(`✅ Pool ${day} tiene ${prizeSnapshot.size} transacciones de premios`);
          }
        }
      } else {
        console.log(`ℹ️ Pool ${day} no tiene tokens para distribuir`);
      }
    }
    
    console.log('\n🎉 Proceso de reparación completado');
    
    // Ejecutar distribución de premios históricos
    console.log('\n🏆 Ejecutando distribución de premios históricos...');
    const { distributeHistoricalPrizes } = await import('./firebase/distributeHistoricalPrizes');
    const result = await distributeHistoricalPrizes(true);
    console.log('📊 Resultado distribución histórica:', result);
    
    return { success: true, daysProcessed: problematicDays.length };
    
  } catch (error) {
    console.error('❌ Error arreglando pools:', error);
    return { success: false, error: error.message };
  }
};

// Función para reparar pools existentes agregando finalPools
(window as any).repairExistingPools = async () => {
  console.log('🔧 Reparando pools existentes agregando finalPools...');
  
  try {
    const { db } = await import('./firebase/config');
    const { collection, getDocs, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    
    const poolsRef = collection(db, 'prize_pools');
    const poolsSnapshot = await getDocs(poolsRef);
    
    const poolsToFix = [];
    
    for (const poolDoc of poolsSnapshot.docs) {
      const poolData = poolDoc.data();
      
      // Si tiene pools distribuidas pero no finalPools, necesita reparación
      if (poolData.poolsDistributed && poolData.pools && !poolData.finalPools) {
        poolsToFix.push({
          id: poolDoc.id,
          data: poolData
        });
      }
    }
    
    console.log(`📊 Encontradas ${poolsToFix.length} pools que necesitan reparación`);
    
    for (const pool of poolsToFix) {
      console.log(`🔨 Reparando pool del día ${pool.id}...`);
      
      const finalPools = {
        first: pool.data.pools.firstPrize || 0,
        second: pool.data.pools.secondPrize || 0,
        third: pool.data.pools.thirdPrize || 0
      };
      
      const poolRef = doc(db, 'prize_pools', pool.id);
      await updateDoc(poolRef, {
        finalPools: finalPools,
        repairedAt: serverTimestamp()
      });
      
      console.log(`✅ Pool ${pool.id} reparada:`, finalPools);
    }
    
    console.log(`🎉 Reparación completada. ${poolsToFix.length} pools reparadas.`);
    return { success: true, poolsRepaired: poolsToFix.length };
    
  } catch (error) {
    console.error('❌ Error reparando pools:', error);
    return { success: false, error: error.message };
  }
};

// Función para inspeccionar la estructura real de una pool
(window as any).inspectPool = async (gameDay) => {
  try {
    const { db } = await import('./firebase/config');
    const { doc, getDoc } = await import('firebase/firestore');
    
    console.log(`🔍 Inspeccionando pool del día ${gameDay}...`);
    
    const poolRef = doc(db, 'prize_pools', gameDay);
    const poolDoc = await getDoc(poolRef);
    
    if (!poolDoc.exists()) {
      console.log(`❌ No existe pool para el día ${gameDay}`);
      return { error: 'Pool not found' };
    }
    
    const poolData = poolDoc.data();
    console.log(`📊 Estructura completa de la pool ${gameDay}:`, poolData);
    
    // Verificar si tiene finalPools
    if (poolData.finalPools) {
      console.log(`✅ finalPools encontrada:`, poolData.finalPools);
    } else {
      console.log(`❌ finalPools NO encontrada`);
      console.log(`📋 pools disponible:`, poolData.pools);
    }
    
    return poolData;
    
  } catch (error) {
    console.error('❌ Error inspeccionando pool:', error);
    return { error: error.message };
  }
};

// Función para forzar distribución de premios específicos
(window as any).forceDistributePrizes = async (gameDay) => {
  try {
    const { db } = await import('./firebase/config');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { distributePrizesToWinners } = await import('./firebase/prizePools');
    
    console.log(`🎯 Forzando distribución de premios para ${gameDay}...`);
    
    // 1. Obtener los resultados del sorteo
    const resultsQuery = query(
      collection(db, 'game_results'),
      where('gameDay', '==', gameDay)
    );
    const resultsSnapshot = await getDocs(resultsQuery);
    
    if (resultsSnapshot.empty) {
      console.log(`❌ No hay resultados de sorteo para ${gameDay}`);
      return { error: 'No game results found' };
    }
    
    const resultDoc = resultsSnapshot.docs[0];
    const result = resultDoc.data();
    
    console.log(`📋 Resultado del sorteo:`, {
      firstPrize: result.firstPrize?.length || 0,
      secondPrize: result.secondPrize?.length || 0,
      thirdPrize: result.thirdPrize?.length || 0
    });
    
    // 2. Distribuir premios si hay ganadores
    const distributions = [];
    
    if (result.firstPrize && result.firstPrize.length > 0) {
      console.log(`🥇 Distribuyendo primer premio a ${result.firstPrize.length} ganadores...`);
      const distribution = await distributePrizesToWinners(gameDay, 'first', result.firstPrize);
      distributions.push({ type: 'first', distribution });
    }
    
    if (result.secondPrize && result.secondPrize.length > 0) {
      console.log(`🥈 Distribuyendo segundo premio a ${result.secondPrize.length} ganadores...`);
      const distribution = await distributePrizesToWinners(gameDay, 'second', result.secondPrize);
      distributions.push({ type: 'second', distribution });
    }
    
    if (result.thirdPrize && result.thirdPrize.length > 0) {
      console.log(`🥉 Distribuyendo tercer premio a ${result.thirdPrize.length} ganadores...`);
      const distribution = await distributePrizesToWinners(gameDay, 'third', result.thirdPrize);
      distributions.push({ type: 'third', distribution });
    }
    
    console.log(`✅ Distribución completada para ${gameDay}:`, distributions);
    return { success: true, distributions };
    
  } catch (error) {
    console.error('❌ Error forzando distribución:', error);
    return { error: error.message };
  }
};

// Función para reparar pools con finalPools en 0
(window as any).repairZeroFinalPools = async () => {
  console.log('🔧 Reparando pools con finalPools en 0...');
  
  try {
    const { db } = await import('./firebase/config');
    const { collection, getDocs, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    
    const poolsRef = collection(db, 'prize_pools');
    const poolsSnapshot = await getDocs(poolsRef);
    
    const poolsToFix = [];
    
    for (const poolDoc of poolsSnapshot.docs) {
      const poolData = poolDoc.data();
      
      // Si tiene finalPools pero todos están en 0, y pools tienen tokens
      if (poolData.finalPools && poolData.pools) {
        const finalPoolsSum = (poolData.finalPools.first || 0) + (poolData.finalPools.second || 0) + (poolData.finalPools.third || 0);
        const poolsSum = (poolData.pools.firstPrize || 0) + (poolData.pools.secondPrize || 0) + (poolData.pools.thirdPrize || 0);
        
        if (finalPoolsSum === 0 && poolsSum > 0) {
          poolsToFix.push({
            id: poolDoc.id,
            data: poolData
          });
        }
      }
    }
    
    console.log(`📊 Encontradas ${poolsToFix.length} pools con finalPools en 0 que necesitan reparación`);
    
    for (const pool of poolsToFix) {
      console.log(`🔨 Reparando pool del día ${pool.id}...`);
      console.log(`   Pools actuales:`, pool.data.pools);
      console.log(`   FinalPools actuales:`, pool.data.finalPools);
      
      const correctedFinalPools = {
        first: pool.data.pools.firstPrize || 0,
        second: pool.data.pools.secondPrize || 0,
        third: pool.data.pools.thirdPrize || 0
      };
      
      const poolRef = doc(db, 'prize_pools', pool.id);
      await updateDoc(poolRef, {
        finalPools: correctedFinalPools,
        repairedAt: serverTimestamp(),
        repairReason: 'Fixed zero finalPools'
      });
      
      console.log(`✅ Pool ${pool.id} reparada con finalPools:`, correctedFinalPools);
    }
    
    console.log(`🎉 Reparación completada. ${poolsToFix.length} pools reparadas.`);
    return { success: true, poolsRepaired: poolsToFix.length };
    
  } catch (error) {
    console.error('❌ Error reparando pools:', error);
    return { success: false, error: error.message };
  }
};

// Función para investigar resultados de sorteo
(window as any).investigateGameResults = async (gameDay) => {
  try {
    const { db } = await import('./firebase/config');
    const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
    
    console.log(`🔍 Investigando resultados de sorteo para ${gameDay}...`);
    
    // Buscar por gameDay
    const resultsQuery = query(
      collection(db, 'game_results'),
      where('gameDay', '==', gameDay)
    );
    const resultsSnapshot = await getDocs(resultsQuery);
    
    console.log(`📊 Resultados encontrados por gameDay: ${resultsSnapshot.size}`);
    
    if (resultsSnapshot.size > 0) {
      resultsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📋 Resultado ${index + 1}:`, {
          id: doc.id,
          gameDay: data.gameDay,
          timestamp: data.timestamp,
          firstPrize: data.firstPrize?.length || 0,
          secondPrize: data.secondPrize?.length || 0,
          thirdPrize: data.thirdPrize?.length || 0,
          freePrize: data.freePrize?.length || 0,
          winningNumbers: data.winningNumbers
        });
      });
    } else {
      console.log('❌ No se encontraron resultados para ese gameDay');
      
      // Buscar todos los resultados para ver qué días existen
      console.log('🔍 Buscando todos los resultados para ver qué días existen...');
      const allResultsQuery = query(
        collection(db, 'game_results'),
        orderBy('timestamp', 'desc')
      );
      const allSnapshot = await getDocs(allResultsQuery);
      
      console.log(`📊 Total resultados en BD: ${allSnapshot.size}`);
      
      const gamesByDay = new Map();
      allSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const day = data.gameDay;
        if (!gamesByDay.has(day)) {
          gamesByDay.set(day, []);
        }
        gamesByDay.get(day).push({
          id: doc.id,
          timestamp: data.timestamp,
          winners: (data.firstPrize?.length || 0) + (data.secondPrize?.length || 0) + (data.thirdPrize?.length || 0)
        });
      });
      
      console.log('📅 Días con resultados disponibles:');
      Array.from(gamesByDay.entries()).forEach(([day, results]) => {
        console.log(`   ${day}: ${results.length} sorteos, ${results.reduce((sum, r) => sum + r.winners, 0)} ganadores totales`);
      });
    }
    
    return { 
      found: resultsSnapshot.size > 0,
      results: resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
    
  } catch (error) {
    console.error('❌ Error investigando resultados:', error);
    return { error: error.message };
  }
};

// Función para diagnosticar el timer híbrido
(window as any).diagnoseHybridTimer = () => {
  try {
    console.log('🔍 Diagnóstico del Timer Híbrido V4:');
    console.log('====================================');
    
    // Intentar acceder a los datos del timer desde el estado global (si está disponible)
    // Esta función será útil para debugging una vez que el componente esté montado
    
    console.log('📋 Instrucciones de uso:');
    console.log('1. Asegúrate de que el componente esté cargado');
    console.log('2. El timer híbrido debería mostrar estado de conexión con el contrato V4');
    console.log('3. Verifica que los logs muestren sincronización cada 60 segundos');
    console.log('4. El indicador visual debería mostrar "Contract V4 Synced" cuando esté conectado');
    
    console.log('⚙️ Configuración esperada para V4:');
    console.log('- Contract Address: 0x6d05B87dCD1d601770E4c04Db2D91F1cAc288C3D');
    console.log('- drawTimeUTC: 3 hours (03:00 UTC = 00:00 São Paulo)');
    console.log('- drawInterval: 24 hours (86400 seconds)');
    console.log('- Timer source: "contract" cuando conectado, "local" como fallback');
    console.log('- V4 Features: Sin mantenimiento, sorteos solo cada 24h');
    
    console.log('🎯 Logs a observar:');
    console.log('- [useContractTimer] Contract data');
    console.log('- [useHybridTimer] Switching timer source');
    console.log('- [useContractTimer] Syncing with contract');
    
    return {
      message: 'Diagnóstico V4 completado. Revisa los logs de la consola.',
      contractVersion: 'V4',
      contractAddress: '0x6d05B87dCD1d601770E4c04Db2D91F1cAc288C3D',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[diagnoseHybridTimer] Error:', error);
    return { error: error.message };
  }
};

// Función específica para verificar sincronización V4
(window as any).verifyV4TimerSync = async () => {
  try {
    console.log('🔄 Verificando Sincronización Timer V4...');
    console.log('=========================================');
    
    // Verificar contrato V4
    const contractData = await (window as any).checkContractDrawTime();
    if (contractData.error) {
      console.error('❌ Error conectando al contrato V4:', contractData.error);
      return { error: contractData.error };
    }
    
    // Verificar frontend vs contrato
    const comparison = await (window as any).compareFrontendVsContract();
    if (comparison.error) {
      console.error('❌ Error comparando frontend vs contrato:', comparison.error);
      return { error: comparison.error };
    }
    
    console.log('✅ Resultados de Sincronización V4:');
    console.log('===================================');
    console.log('📊 Contrato V4 conectado:', !contractData.error);
    console.log('⏰ Diferencia de tiempo:', comparison.difference, 'segundos');
    console.log('🎯 Sincronizado:', comparison.synced ? '✅ SÍ' : '❌ NO');
    console.log('🕐 Próximo sorteo (contrato):', new Date(contractData.nextDrawTime * 1000).toLocaleString());
    
    if (comparison.synced) {
      console.log('🎉 ¡Timer V4 perfectamente sincronizado!');
    } else {
      console.log('⚠️ Timer V4 necesita ajuste. Diferencia:', comparison.difference, 'segundos');
    }
    
    return {
      contractV4: !contractData.error,
      synced: comparison.synced,
      difference: comparison.difference,
      nextDrawTime: contractData.nextDrawTime,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[verifyV4TimerSync] Error:', error);
    return { error: error.message };
  }
};

// Función para verificar la hora exacta del sorteo según el contrato
(window as any).checkContractDrawTime = async () => {
  try {
    const { ethers } = await import('ethers');
    const { CONTRACT_ADDRESSES } = await import('./utils/contractAddresses');
    
    const TIMER_ABI = [
      "function getCurrentDay() view returns (uint256)",
      "function lastDrawTime() view returns (uint256)",
      "function drawTimeUTC() view returns (uint256)",
      "function DRAW_INTERVAL() view returns (uint256)",
      "function checkUpkeep(bytes) view returns (bool upkeepNeeded, bytes performData)"
    ];
    
    console.log('🕐 Verificando hora del sorteo desde el contrato...');
    console.log('================================================');
    
    // Conectar al contrato
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, TIMER_ABI, provider);
    
    // Obtener datos del contrato
    const [
      currentGameDay,
      lastDrawTime,
      drawTimeUTC,
      drawInterval,
      currentTimestamp
    ] = await Promise.all([
      contract.getCurrentDay(),
      contract.lastDrawTime(),
      contract.drawTimeUTC(),
      contract.DRAW_INTERVAL(),
      provider.getBlock('latest').then(block => block.timestamp)
    ]);
    
    const gameDay = Number(currentGameDay);
    const lastDraw = Number(lastDrawTime);
    const drawTime = Number(drawTimeUTC);
    const interval = Number(drawInterval);
    const now = Number(currentTimestamp);
    
    // Calcular próximo sorteo según la lógica del contrato
    const nextDrawTime = lastDraw + interval;
    const timeToNextDraw = nextDrawTime - now;
    
    console.log('📊 Datos del contrato:');
    console.log('- Current Game Day:', gameDay);
    console.log('- Draw Time UTC:', drawTime, 'segundos =', (drawTime / 3600).toFixed(1), 'horas');
    console.log('- Draw Interval:', interval, 'segundos =', (interval / 3600), 'horas');
    console.log('- Last Draw Time:', lastDraw, '=', new Date(lastDraw * 1000).toISOString());
    console.log('- Current Block Time:', now, '=', new Date(now * 1000).toISOString());
    
    console.log('\n⏰ Cálculos del próximo sorteo:');
    console.log('- Next Draw Time:', nextDrawTime, '=', new Date(nextDrawTime * 1000).toISOString());
    console.log('- Time to Next Draw:', timeToNextDraw, 'segundos');
    console.log('- Time to Next Draw:', Math.floor(timeToNextDraw / 3600) + 'h', Math.floor((timeToNextDraw % 3600) / 60) + 'm', (timeToNextDraw % 60) + 's');
    
    // Verificar upkeep
    try {
      const [upkeepNeeded, performData] = await contract.checkUpkeep('0x');
      console.log('\n🔧 Estado de Upkeep:');
      console.log('- Upkeep Needed:', upkeepNeeded);
      console.log('- Perform Data:', performData);
    } catch (upkeepError) {
      console.log('\n⚠️ Error verificando upkeep:', upkeepError.message);
    }
    
    // Comparar con hora de São Paulo
    const nextDrawSP = new Date(nextDrawTime * 1000);
    const options = { 
      timeZone: 'America/Sao_Paulo', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    };
    
    console.log('\n🇧🇷 Próximo sorteo en São Paulo:');
    console.log('- Fecha/Hora SP:', nextDrawSP.toLocaleString('es-BR', options));
    console.log('- ¿Es medianoche SP?:', nextDrawSP.toLocaleString('es-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }));
    
    return {
      currentGameDay: gameDay,
      lastDrawTime: lastDraw,
      drawTimeUTC: drawTime,
      drawInterval: interval,
      nextDrawTime: nextDrawTime,
      timeToNextDraw: timeToNextDraw,
      nextDrawSP: nextDrawSP.toLocaleString('es-BR', options),
      upkeepNeeded: false // se completará si la llamada tiene éxito
    };
    
  } catch (error) {
    console.error('[checkContractDrawTime] Error:', error);
    return { error: error.message };
  }
};

// Función para verificar si la lógica de cálculo del contrato es correcta
(window as any).verifyContractLogic = async () => {
  try {
    console.log('🔍 Verificando lógica de cálculo del contrato...');
    console.log('==============================================');
    
    const contractData = await (window as any).checkContractDrawTime();
    if (contractData.error) {
      console.error('Error obteniendo datos del contrato:', contractData.error);
      return;
    }
    
    console.log('\n📋 Análisis de la lógica:');
    
    // Verificar si drawTimeUTC corresponde a medianoche São Paulo
    const drawTimeUTCHours = contractData.drawTimeUTC / 3600;
    console.log('- drawTimeUTC en horas:', drawTimeUTCHours);
    
    if (drawTimeUTCHours === 3) {
      console.log('✅ drawTimeUTC = 3 horas = 03:00 UTC = 00:00 São Paulo (correcto)');
    } else {
      console.log('⚠️ drawTimeUTC no corresponde a medianoche São Paulo');
      console.log('   Expected: 3 horas (03:00 UTC)');
      console.log('   Actual:', drawTimeUTCHours, 'horas');
    }
    
    // Verificar intervalo
    const intervalHours = contractData.drawInterval / 3600;
    console.log('- Intervalo en horas:', intervalHours);
    
    if (intervalHours === 24) {
      console.log('✅ Intervalo = 24 horas (correcto para sorteos diarios)');
    } else {
      console.log('⚠️ Intervalo no es de 24 horas');
      console.log('   Expected: 24 horas');
      console.log('   Actual:', intervalHours, 'horas');
    }
    
    // Verificar si el próximo sorteo cae en medianoche SP
    const nextDraw = new Date(contractData.nextDrawTime * 1000);
    const spTime = nextDraw.toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    console.log('- Próximo sorteo en SP:', spTime);
    
    if (spTime === '00:00') {
      console.log('✅ Próximo sorteo es a medianoche São Paulo (correcto)');
    } else {
      console.log('⚠️ Próximo sorteo NO es a medianoche São Paulo');
      console.log('   Expected: 00:00');
      console.log('   Actual:', spTime);
    }
    
    return contractData;
    
  } catch (error) {
    console.error('[verifyContractLogic] Error:', error);
    return { error: error.message };
  }
};

// Función para comparar timer del frontend vs contrato
(window as any).compareFrontendVsContract = async () => {
  try {
    console.log('⚖️ Comparando timer frontend vs contrato...');
    console.log('============================================');
    
    // Obtener datos del contrato
    const contractData = await (window as any).checkContractDrawTime();
    if (contractData.error) {
      console.error('Error obteniendo datos del contrato:', contractData.error);
      return;
    }
    
    // Obtener tiempo del frontend (São Paulo)
    const { getTimeUntilNextDrawSaoPaulo } = await import('./utils/timezone');
    const frontendTime = getTimeUntilNextDrawSaoPaulo();
    
    console.log('📊 Comparación:');
    console.log('- Contrato - Tiempo restante:', contractData.timeToNextDraw, 'segundos');
    console.log('- Frontend - Tiempo restante:', frontendTime, 'segundos');
    console.log('- Diferencia:', Math.abs(contractData.timeToNextDraw - frontendTime), 'segundos');
    
    const difference = Math.abs(contractData.timeToNextDraw - frontendTime);
    
    if (difference <= 60) {
      console.log('✅ Frontend y contrato están sincronizados (diferencia ≤ 60s)');
    } else if (difference <= 300) {
      console.log('⚠️ Frontend y contrato tienen diferencia moderada (≤ 5min)');
    } else {
      console.log('❌ Frontend y contrato están desincronizados (> 5min)');
    }
    
    // Convertir tiempos a formato legible
    const formatTime = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h}h ${m}m ${s}s`;
    };
    
    console.log('\n⏰ Tiempos formateados:');
    console.log('- Contrato:', formatTime(contractData.timeToNextDraw));
    console.log('- Frontend:', formatTime(frontendTime));
    
    return {
      contractTime: contractData.timeToNextDraw,
      frontendTime: frontendTime,
      difference: difference,
      synced: difference <= 60
    };
    
  } catch (error) {
    console.error('[compareFrontendVsContract] Error:', error);
    return { error: error.message };
  }
};

// Función para verificar la hora exacta del sorteo según el contrato
(window as any).checkContractDrawTime = async () => {
  try {
    const { ethers } = await import('ethers');
    const { CONTRACT_ADDRESSES } = await import('./utils/contractAddresses');
    
    const TIMER_ABI = [
      "function getCurrentDay() view returns (uint256)",
      "function lastDrawTime() view returns (uint256)",
      "function drawTimeUTC() view returns (uint256)",
      "function DRAW_INTERVAL() view returns (uint256)",
      "function checkUpkeep(bytes) view returns (bool upkeepNeeded, bytes performData)"
    ];
    
    console.log('🕐 Verificando hora del sorteo desde el contrato...');
    console.log('================================================');
    
    // Conectar al contrato
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, TIMER_ABI, provider);
    
    // Obtener datos del contrato
    const [
      currentGameDay,
      lastDrawTime,
      drawTimeUTC,
      drawInterval,
      currentTimestamp
    ] = await Promise.all([
      contract.getCurrentDay(),
      contract.lastDrawTime(),
      contract.drawTimeUTC(),
      contract.DRAW_INTERVAL(),
      provider.getBlock('latest').then(block => block.timestamp)
    ]);
    
    const gameDay = Number(currentGameDay);
    const lastDraw = Number(lastDrawTime);
    const drawTime = Number(drawTimeUTC);
    const interval = Number(drawInterval);
    const now = Number(currentTimestamp);
    
    // Calcular próximo sorteo según la lógica del contrato
    const nextDrawTime = lastDraw + interval;
    const timeToNextDraw = nextDrawTime - now;
    
    console.log('📊 Datos del contrato:');
    console.log('- Current Game Day:', gameDay);
    console.log('- Draw Time UTC:', drawTime, 'segundos =', (drawTime / 3600).toFixed(1), 'horas');
    console.log('- Draw Interval:', interval, 'segundos =', (interval / 3600), 'horas');
    console.log('- Last Draw Time:', lastDraw, '=', new Date(lastDraw * 1000).toISOString());
    console.log('- Current Block Time:', now, '=', new Date(now * 1000).toISOString());
    
    console.log('\n⏰ Cálculos del próximo sorteo:');
    console.log('- Next Draw Time:', nextDrawTime, '=', new Date(nextDrawTime * 1000).toISOString());
    console.log('- Time to Next Draw:', timeToNextDraw, 'segundos');
    console.log('- Time to Next Draw:', Math.floor(timeToNextDraw / 3600) + 'h', Math.floor((timeToNextDraw % 3600) / 60) + 'm', (timeToNextDraw % 60) + 's');
    
    // Verificar upkeep
    try {
      const [upkeepNeeded, performData] = await contract.checkUpkeep('0x');
      console.log('\n🔧 Estado de Upkeep:');
      console.log('- Upkeep Needed:', upkeepNeeded);
      console.log('- Perform Data:', performData);
    } catch (upkeepError) {
      console.log('\n⚠️ Error verificando upkeep:', upkeepError.message);
    }
    
    // Comparar con hora de São Paulo
    const nextDrawSP = new Date(nextDrawTime * 1000);
    const options = { 
      timeZone: 'America/Sao_Paulo', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    };
    
    console.log('\n🇧🇷 Próximo sorteo en São Paulo:');
    console.log('- Fecha/Hora SP:', nextDrawSP.toLocaleString('es-BR', options));
    console.log('- ¿Es medianoche SP?:', nextDrawSP.toLocaleString('es-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }));
    
    return {
      currentGameDay: gameDay,
      lastDrawTime: lastDraw,
      drawTimeUTC: drawTime,
      drawInterval: interval,
      nextDrawTime: nextDrawTime,
      timeToNextDraw: timeToNextDraw,
      nextDrawSP: nextDrawSP.toLocaleString('es-BR', options),
      upkeepNeeded: false // se completará si la llamada tiene éxito
    };
    
  } catch (error) {
    console.error('[checkContractDrawTime] Error:', error);
    return { error: error.message };
  }
};

// Función para verificar si la lógica de cálculo del contrato es correcta
(window as any).verifyContractLogic = async () => {
  try {
    console.log('🔍 Verificando lógica de cálculo del contrato...');
    console.log('==============================================');
    
    const contractData = await (window as any).checkContractDrawTime();
    if (contractData.error) {
      console.error('Error obteniendo datos del contrato:', contractData.error);
      return;
    }
    
    console.log('\n📋 Análisis de la lógica:');
    
    // Verificar si drawTimeUTC corresponde a medianoche São Paulo
    const drawTimeUTCHours = contractData.drawTimeUTC / 3600;
    console.log('- drawTimeUTC en horas:', drawTimeUTCHours);
    
    if (drawTimeUTCHours === 3) {
      console.log('✅ drawTimeUTC = 3 horas = 03:00 UTC = 00:00 São Paulo (correcto)');
    } else {
      console.log('⚠️ drawTimeUTC no corresponde a medianoche São Paulo');
      console.log('   Expected: 3 horas (03:00 UTC)');
      console.log('   Actual:', drawTimeUTCHours, 'horas');
    }
    
    // Verificar intervalo
    const intervalHours = contractData.drawInterval / 3600;
    console.log('- Intervalo en horas:', intervalHours);
    
    if (intervalHours === 24) {
      console.log('✅ Intervalo = 24 horas (correcto para sorteos diarios)');
    } else {
      console.log('⚠️ Intervalo no es de 24 horas');
      console.log('   Expected: 24 horas');
      console.log('   Actual:', intervalHours, 'horas');
    }
    
    // Verificar si el próximo sorteo cae en medianoche SP
    const nextDraw = new Date(contractData.nextDrawTime * 1000);
    const spTime = nextDraw.toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    console.log('- Próximo sorteo en SP:', spTime);
    
    if (spTime === '00:00') {
      console.log('✅ Próximo sorteo es a medianoche São Paulo (correcto)');
    } else {
      console.log('⚠️ Próximo sorteo NO es a medianoche São Paulo');
      console.log('   Expected: 00:00');
      console.log('   Actual:', spTime);
    }
    
    return contractData;
    
  } catch (error) {
    console.error('[verifyContractLogic] Error:', error);
    return { error: error.message };
  }
};

// Función para comparar timer del frontend vs contrato
(window as any).compareFrontendVsContract = async () => {
  try {
    console.log('⚖️ Comparando timer frontend vs contrato...');
    console.log('============================================');
    
    // Obtener datos del contrato
    const contractData = await (window as any).checkContractDrawTime();
    if (contractData.error) {
      console.error('Error obteniendo datos del contrato:', contractData.error);
      return;
    }
    
    // Obtener tiempo del frontend (São Paulo)
    const { getTimeUntilNextDrawSaoPaulo } = await import('./utils/timezone');
    const frontendTime = getTimeUntilNextDrawSaoPaulo();
    
    console.log('📊 Comparación:');
    console.log('- Contrato - Tiempo restante:', contractData.timeToNextDraw, 'segundos');
    console.log('- Frontend - Tiempo restante:', frontendTime, 'segundos');
    console.log('- Diferencia:', Math.abs(contractData.timeToNextDraw - frontendTime), 'segundos');
    
    const difference = Math.abs(contractData.timeToNextDraw - frontendTime);
    
    if (difference <= 60) {
      console.log('✅ Frontend y contrato están sincronizados (diferencia ≤ 60s)');
    } else if (difference <= 300) {
      console.log('⚠️ Frontend y contrato tienen diferencia moderada (≤ 5min)');
    } else {
      console.log('❌ Frontend y contrato están desincronizados (> 5min)');
    }
    
    // Convertir tiempos a formato legible
    const formatTime = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h}h ${m}m ${s}s`;
    };
    
    console.log('\n⏰ Tiempos formateados:');
    console.log('- Contrato:', formatTime(contractData.timeToNextDraw));
    console.log('- Frontend:', formatTime(frontendTime));
    
    return {
      contractTime: contractData.timeToNextDraw,
      frontendTime: frontendTime,
      difference: difference,
      synced: difference <= 60
    };
    
  } catch (error) {
    console.error('[compareFrontendVsContract] Error:', error);
    return { error: error.message };
  }
};

// Función para mostrar el antes y después de la corrección temporal
(window as any).showTimerCorrection = async () => {
  try {
    console.log('⚡ Mostrando corrección temporal del timer...');
    console.log('==============================================');
    
    const { ethers } = await import('ethers');
    const { CONTRACT_ADDRESSES } = await import('./utils/contractAddresses');
    
    const TIMER_ABI = [
      "function getCurrentDay() view returns (uint256)",
      "function lastDrawTime() view returns (uint256)",
      "function drawTimeUTC() view returns (uint256)",
      "function DRAW_INTERVAL() view returns (uint256)"
    ];
    
    // Conectar al contrato
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, TIMER_ABI, provider);
    
    // Obtener datos del contrato
    const [lastDrawTime, drawInterval] = await Promise.all([
      contract.lastDrawTime(),
      contract.DRAW_INTERVAL()
    ]);
    
    const lastDraw = Number(lastDrawTime);
    const interval = Number(drawInterval);
    const now = Math.floor(Date.now() / 1000);
    
    // Calcular el tiempo según el contrato (SIN corrección)
    const contractNextDraw = lastDraw + interval;
    const contractRemaining = Math.max(0, contractNextDraw - now);
    
    // Calcular el tiempo corregido (medianoche São Paulo)
    const currentUTC = new Date(now * 1000);
    const nextMidnightUTC = new Date(currentUTC);
    
    if (currentUTC.getUTCHours() >= 3) {
      nextMidnightUTC.setUTCDate(nextMidnightUTC.getUTCDate() + 1);
    }
    
    nextMidnightUTC.setUTCHours(3, 0, 0, 0);
    const correctedNextDraw = Math.floor(nextMidnightUTC.getTime() / 1000);
    const correctedRemaining = Math.max(0, correctedNextDraw - now);
    
    // Calcular diferencia
    const offsetSeconds = contractNextDraw - correctedNextDraw;
    const offsetMinutes = Math.floor(Math.abs(offsetSeconds) / 60);
    const offsetSecondsRem = Math.abs(offsetSeconds) % 60;
    
    console.log('❌ ANTES (Contrato sin corrección):');
    console.log('- Próximo sorteo:', new Date(contractNextDraw * 1000).toISOString());
    console.log('- En São Paulo:', new Date(contractNextDraw * 1000).toLocaleString('es-BR', { timeZone: 'America/Sao_Paulo', hour12: false }));
    console.log('- Tiempo restante:', Math.floor(contractRemaining / 3600) + 'h', Math.floor((contractRemaining % 3600) / 60) + 'm', (contractRemaining % 60) + 's');
    
    console.log('\n✅ DESPUÉS (Con corrección):');
    console.log('- Próximo sorteo:', new Date(correctedNextDraw * 1000).toISOString());
    console.log('- En São Paulo:', new Date(correctedNextDraw * 1000).toLocaleString('es-BR', { timeZone: 'America/Sao_Paulo', hour12: false }));
    console.log('- Tiempo restante:', Math.floor(correctedRemaining / 3600) + 'h', Math.floor((correctedRemaining % 3600) / 60) + 'm', (correctedRemaining % 60) + 's');
    
    console.log('\n📊 Diferencia corregida:');
    console.log('- Offset del contrato:', offsetMinutes + 'm', offsetSecondsRem + 's', '(' + offsetSeconds + ' segundos)');
    console.log('- Dirección:', offsetSeconds > 0 ? 'Contrato adelantado' : 'Contrato atrasado');
    
    // Verificar si es medianoche
    const contractSPTime = new Date(contractNextDraw * 1000).toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    const correctedSPTime = new Date(correctedNextDraw * 1000).toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    console.log('\n🇧🇷 Verificación medianoche São Paulo:');
    console.log('- Contrato original:', contractSPTime, contractSPTime === '00:00' ? '✅' : '❌');
    console.log('- Con corrección:', correctedSPTime, correctedSPTime === '00:00' ? '✅' : '❌');
    
    return {
      contractTime: contractRemaining,
      correctedTime: correctedRemaining,
      offsetSeconds: offsetSeconds,
      isFixed: correctedSPTime === '00:00'
    };
    
  } catch (error) {
    console.error('[showTimerCorrection] Error:', error);
    return { error: error.message };
  }
};

// Función para verificar sincronización completa del timer V4
(window as any).verifyV4TimerSync = async () => {
  try {
    console.log('🔄 VERIFICANDO SINCRONIZACIÓN TIMER V4');
    console.log('=====================================');
    
    // Obtener datos del contrato directamente
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    const CONTRACT_ADDRESS = "0x1B0B1A24983E51d809FBfAc424946B314fEFA271";
    const ABI = [
      "function getCurrentDay() view returns (uint256)",
      "function lastDrawTime() view returns (uint256)",
      "function drawTimeUTC() view returns (uint256)",
      "function DRAW_INTERVAL() view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    const [gameDay, lastDraw, drawTime, interval] = await Promise.all([
      contract.getCurrentDay(),
      contract.lastDrawTime(),
      contract.drawTimeUTC(),
      contract.DRAW_INTERVAL()
    ]);
    
    const lastDrawNum = Number(lastDraw);
    const intervalNum = Number(interval);
    const nextDraw = lastDrawNum + intervalNum;
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, nextDraw - now);
    
    console.log('📊 DATOS DEL CONTRATO V4:');
    console.log('- Game Day:', Number(gameDay));
    console.log('- Last Draw:', new Date(lastDrawNum * 1000).toISOString());
    console.log('- Next Draw:', new Date(nextDraw * 1000).toISOString());
    console.log('- Draw Time UTC:', Number(drawTime) / 3600 + ' hours');
    console.log('- Interval:', intervalNum / 3600 + ' hours');
    console.log('- Time Remaining:', Math.floor(remaining / 3600) + 'h ' + Math.floor((remaining % 3600) / 60) + 'm ' + (remaining % 60) + 's');
    
    // Verificar en São Paulo
    const nextDrawSP = new Date(nextDraw * 1000).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const hourSP = new Date(nextDraw * 1000).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    console.log('🇧🇷 PRÓXIMO SORTEO (SÃO PAULO):');
    console.log('- Fecha completa:', nextDrawSP);
    console.log('- Hora:', hourSP);
    console.log('- ¿Es medianoche?:', hourSP === '00:00' ? '✅ SÍ' : '❌ NO');
    
    // Forzar actualización del timer frontend
    console.log('🔄 Para forzar actualización del frontend, refresca la página');
    
    return {
      gameDay: Number(gameDay),
      lastDraw: lastDrawNum,
      nextDraw,
      remaining,
      saoPauloTime: nextDrawSP,
      isMidnight: hourSP === '00:00'
    };
    
  } catch (error) {
    console.error('❌ Error verificando timer V4:', error);
  }
};

// Función para forzar resincronización del timer del frontend
(window as any).forceTimerResync = () => {
  console.log('🔄 Forzando resincronización del timer...');
  console.log('💡 Refresca la página para aplicar los cambios del contrato');
  
  // Limpiar localStorage si existe
  try {
    localStorage.removeItem('lastTimerSync');
    localStorage.removeItem('cachedTimerData');
    console.log('✅ Cache del timer limpiado');
  } catch (e) {
    console.log('⚠️ No hay cache para limpiar');
  }
};

// Función para diagnosticar problemas de pools para usuarios en Colombia
(window as any).diagnosePoolResetIssue = async () => {
  try {
    console.log('🔍 DIAGNÓSTICO DE PROBLEMA DE POOLS (COLOMBIA)');
    console.log('='.repeat(50));
    
    const { 
      getUserTimezone, 
      getCurrentDateColombia,
      getCurrentDateSaoPaulo,
      formatTimeColombia,
      formatTimeSaoPaulo,
      debugTimezone
    } = await import('./utils/timezone');
    
    const now = new Date();
    const userTz = getUserTimezone();
    const colombiaTime = getCurrentDateColombia();
    const saoPauloTime = getCurrentDateSaoPaulo();
    
    console.log('👤 INFORMACIÓN DEL USUARIO:');
    console.log('- Timezone detectado:', userTz);
    console.log('- Hora local:', now.toLocaleString());
    console.log('- Hora Colombia:', formatTimeColombia(now));
    console.log('- Hora São Paulo:', formatTimeSaoPaulo(now));
    
    const colombiaHour = colombiaTime.getHours();
    const isNear16 = Math.abs(colombiaHour - 16) <= 1;
    
    console.log('⏰ ANÁLISIS TEMPORAL:');
    console.log('- Hora actual Colombia:', colombiaHour + ':00');
    console.log('- Cerca de las 16:00:', isNear16 ? '⚠️ SÍ' : '✅ NO');
    
    // Información completa de timezone
    console.log('\n🔧 DEBUG COMPLETO:');
    debugTimezone();
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
};

// Función para monitorear pools en tiempo real
(window as any).monitorPools = () => {
  const startTime = Date.now();
  let monitorCount = 0;
  const maxChecks = 120; // 10 minutos máximo
  
  console.log('📊 INICIANDO MONITOREO DE POOLS');
  console.log('- Duración: 10 minutos máximo');
  console.log('- Frecuencia: cada 5 segundos');
  console.log('='.repeat(50));
  
  const monitorInterval = setInterval(async () => {
    monitorCount++;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    try {
      console.log(`\n[${monitorCount}] T+${elapsed}s - Pool Status Check`);
      
      // Obtener datos del hook
      const poolElements = document.querySelectorAll('[data-pool-info]');
      if (poolElements.length > 0) {
        poolElements.forEach(el => {
          const poolType = el.getAttribute('data-pool-type');
          const poolValue = el.textContent || '0';
          console.log(`- ${poolType}: ${poolValue}`);
        });
      } else {
        console.log('- No se encontraron elementos de pool en el DOM');
      }
      
      // Verificar si los pools están en cero sospechosamente
      const mainPoolEl = document.querySelector('[data-pool-type="main-total"]');
      const reservePoolEl = document.querySelector('[data-pool-type="reserve-total"]');
      const dailyPoolEl = document.querySelector('[data-pool-type="daily-total"]');
      
      const mainValue = parseFloat(mainPoolEl?.textContent?.replace(/[^\d.]/g, '') || '0');
      const reserveValue = parseFloat(reservePoolEl?.textContent?.replace(/[^\d.]/g, '') || '0');
      const dailyValue = parseFloat(dailyPoolEl?.textContent?.replace(/[^\d.]/g, '') || '0');
      
      if (mainValue === 0 && reserveValue === 0 && dailyValue === 0) {
        console.warn('⚠️ TODOS LOS POOLS EN CERO - POSIBLE RESET PROBLEMÁTICO');
        
        // Obtener hora Colombia actual
        const { getCurrentDateColombia } = await import('./utils/timezone');
        const colombiaTime = getCurrentDateColombia();
        const hour = colombiaTime.getHours();
        const minute = colombiaTime.getMinutes();
        
        console.warn(`- Hora Colombia: ${hour}:${minute.toString().padStart(2, '0')}`);
        console.warn('- Esto puede indicar el problema de reset a las 16:00');
      }
      
      // Detener después del máximo o si se detecta actividad normal
      if (monitorCount >= maxChecks) {
        clearInterval(monitorInterval);
        console.log('✅ Monitoreo completado (tiempo máximo alcanzado)');
      }
      
    } catch (error) {
      console.error(`❌ Error en check ${monitorCount}:`, error);
    }
  }, 5000); // Cada 5 segundos
  
  // Función para detener manualmente
  (window as any).stopPoolMonitor = () => {
    clearInterval(monitorInterval);
    console.log('🛑 Monitoreo detenido manualmente');
  };
  
  console.log('📝 Para detener el monitoreo manualmente, ejecuta: stopPoolMonitor()');
  
  return monitorInterval;
};

// Función para sincronizar manualmente con blockchain
(window as any).forcePoolSync = async () => {
  try {
    console.log('🔄 FORZANDO SINCRONIZACIÓN CON BLOCKCHAIN');
    console.log('='.repeat(40));
    
    // Buscar el hook de pools y llamar refresh
    const refreshButton = document.querySelector('[data-action="refresh-pools"]');
    if (refreshButton) {
      refreshButton.click();
      console.log('✅ Refresh disparado desde UI');
    } else {
      console.log('⚠️ No se encontró botón de refresh en UI');
      
      // Intentar acceso directo al hook (si está disponible)
      if (window.lottoMojiPoolsRef?.current?.refreshPools) {
        window.lottoMojiPoolsRef.current.refreshPools();
        console.log('✅ Refresh disparado desde referencia directa');
      } else {
        console.log('❌ No se pudo acceder al hook de pools');
      }
    }
    
    // Mostrar estado del localStorage
    const cached = localStorage.getItem('lottoMoji_poolsCache');
    if (cached) {
      const parsedCache = JSON.parse(cached);
      const cacheAge = Date.now() - parsedCache.timestamp;
      console.log('💾 Cache Info:');
      console.log('- Edad del cache:', Math.floor(cacheAge / 1000), 'segundos');
      console.log('- Total USDC:', parsedCache.data.totalUSDC);
      console.log('- Reserve USDC:', parsedCache.data.reserveTotalUSDC);
    } else {
      console.log('❌ No hay cache de pools');
    }
    
  } catch (error) {
    console.error('❌ Error forzando sincronización:', error);
  }
};

// Debug helper disponible globalmente
(window as any).debugPools = () => {
  console.log('🛠️ POOL DEBUG HELPERS');
  console.log('='.repeat(30));
  console.log('diagnosePoolResetIssue() - Diagnosticar problema de reset');
  console.log('monitorPools() - Monitorear pools por 10 minutos');
  console.log('forcePoolSync() - Forzar sincronización con blockchain');
  console.log('stopPoolMonitor() - Detener monitoreo activo');
  console.log('diagnoseContractIssues() - Diagnóstico completo del contrato');
  console.log('quickHealthCheck() - Chequeo rápido de salud');
  console.log('investigateMissingUSDC() - Investigar USDC faltante');
};

// Comprehensive contract diagnostics
(window as any).diagnoseContractIssues = async () => {
  try {
    const { diagnoseContractIssues } = await import('./utils/contractDiagnostics');
    return await diagnoseContractIssues();
  } catch (error) {
    console.error('❌ Error cargando diagnósticos:', error);
  }
};

(window as any).quickHealthCheck = async () => {
  try {
    const { quickHealthCheck } = await import('./utils/contractDiagnostics');
    return await quickHealthCheck();
  } catch (error) {
    console.error('❌ Error en chequeo rápido:', error);
  }
};

(window as any).investigateMissingUSDC = async () => {
  try {
    const { investigateMissingUSDC } = await import('./utils/contractDiagnostics');
    return await investigateMissingUSDC();
  } catch (error) {
    console.error('❌ Error investigando USDC:', error);
  }
};

function AppContent() {
  const { gameState, generateTicket, forceGameDraw, queueStatus, rateLimitStatus, timerInfo } = useGameState();
  const { context } = useMiniKit();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();
  const { user: authUser, isLoading, isFarcasterAvailable, signIn } = useAuth();
  const { user: walletUser, isConnected: isWalletConnected } = useWallet();
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showTicketHistory, setShowTicketHistory] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const hasTriedSignIn = useRef(false);
  
  // Usar wallet user si está disponible, sino usar auth user
  const user = walletUser || authUser;
  
  // Para evitar renderizado constante
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Debug logging para tickets
  useEffect(() => {
    console.log(`[App] 📊 Estado de tickets actualizado: ${gameState.tickets.length} tickets`);
    gameState.tickets.forEach((ticket, index) => {
      console.log(`[App] 🎫 Ticket ${index + 1}:`, {
        id: ticket.id,
        gameDay: ticket.gameDay,
        timestamp: new Date(ticket.timestamp).toLocaleString(),
        isTemp: ticket.id.startsWith('temp-')
      });
    });
  }, [gameState.tickets]);

  // Inicializar Firebase y SDK una sola vez
  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log("SDK inicializado correctamente");
        
        // Inicializar pool de premios del día
        try {
          await initializeDailyPool();
          console.log("Pool de premios inicializada correctamente");
        } catch (poolError) {
          console.error("Error inicializando pool de premios:", poolError);
        }
      } catch (error) {
        console.error("Error inicializando SDK:", error);
      }
    };
    
    initSDK();
  }, []);

  // Intentar inicio de sesión automático si no hay usuario
  useEffect(() => {
    // Solo intentamos una vez y cuando no estamos cargando ya
    if (!user && !isLoading && !hasTriedSignIn.current && !isWalletConnected) {
      console.log("Intentando inicio de sesión automático");
      hasTriedSignIn.current = true;
      signIn().catch(err => console.error("Error en inicio de sesión automático:", err));
    }
    
    // Marcar como carga inicial completada después de un tiempo
    if (!initialLoadComplete) {
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 2500); // Dar 2.5 segundos para la carga inicial
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, signIn, initialLoadComplete, isWalletConnected]);

  // Mostrar notificación cuando hay ganadores
  const handleWin = useCallback(async () => {
    // Usar verificación de seguridad para evitar errores undefined
    const firstPrizeLength = gameState.lastResults?.firstPrize?.length || 0;
    if (firstPrizeLength > 0) {
      try {
        await sendNotification({
          title: '🎉 You Won!',
          body: 'Congratulations! You matched all emojis and won the first prize!'
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }, [gameState.lastResults, sendNotification]);

  useEffect(() => {
    handleWin();
  }, [gameState.lastResults, handleWin]);

  // Keyboard shortcut for debug panel (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Pantalla de carga con animación
  if (isLoading && !initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🎲</div>
          <div className="text-white text-2xl">Cargando LottoMoji...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      {/* Floating buttons */}
      <GameHistoryButton />
      <WalletConnector />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative mb-8">
          {/* Profile button for Farcaster users */}
          {context?.client?.added && (
            <div className="absolute top-0 right-0">
              <button
                onClick={() => viewProfile()}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ver Perfil
              </button>
            </div>
          )}
          
          {/* Título centrado */}
          <div className="flex justify-center pt-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white text-center">
              🎰 LottoMoji 🎲
            </h1>
          </div>
        </div>
        
        {/* Textos informativos centrados con emojis */}
        <div className="text-center mb-8">
          <p className="text-white/90 text-xl mb-4">
            🎯 Match 4 emojis to win! 🏆
          </p>
          <p className="text-white/80 text-lg mb-4">
            ⏰ Next draw in:
          </p>
          <div className="flex justify-center">
            <Timer 
              seconds={gameState.timeRemaining}
              isContractConnected={timerInfo?.isContractConnected}
              currentGameDay={timerInfo?.currentGameDay}
              nextDrawTime={timerInfo?.nextDrawTime}
              error={timerInfo?.error}
            />
          </div>
        </div>

        <ContractWinnerResults />

        {/* Pool de Premios - Sistema Mejorado con Reservas */}
        <div className="max-w-4xl mx-auto mb-8">
          <ContractPoolsDisplay />
        </div>

        {import.meta.env.DEV && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={forceGameDraw}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Zap size={16} /> Forzar Sorteo
            </button>
          </div>
        )}

        <HybridTicketSystem />

        {/* Blockchain Tickets Section */}
        <BlockchainTicketsDisplay 
          onViewHistory={() => setShowTicketHistory(true)}
        />

        <div className="mt-8 space-y-6">
          <div className="bg-white/10 rounded-lg p-6 text-white">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <Trophy className="mr-2" size={24} />
              Prize Structure
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>🥇 First Prize (4 in exact order):</span>
                <span className="font-bold">80% of main pool</span>
              </div>
              <div className="flex justify-between">
                <span>🥈 Second Prize (4 in any order):</span>
                <span className="font-bold">10% of main pool</span>
              </div>
              <div className="flex justify-between">
                <span>🥉 Third Prize (3 in exact order):</span>
                <span className="font-bold">5% of main pool</span>
              </div>
              <div className="flex justify-between">
                <span>🎫 Free Ticket (3 in any order):</span>
                <span className="font-bold">New ticket for next draw</span>
              </div>
              <div className="flex justify-between">
                <span>💎 Development Fund:</span>
                <span className="font-bold">5% of main pool</span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-300">
              <p>• Pool accumulates when no winners are found</p>
              <p>• 20% daily reserve for future backup</p>
              <p>• All prizes paid in USDC</p>
            </div>
          </div>
          
          {/* Blockchain System Info - Moved to bottom */}
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">🔗</span>
              <div>
                <h3 className="text-lg font-bold text-white">Blockchain Lottery System</h3>
                <div className="text-sm text-gray-300">
                  Powered by Base Sepolia • Chainlink VRF & Automation
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-green-400">✅</span>
              <span className="text-gray-300">
                <strong>Real USDC tickets</strong> • NFT generation • Automated draws • Transparent results
              </span>
            </div>
          </div>
          
          <EmojiChat />
          
          {import.meta.env.DEV && (
            <div className="bg-white/10 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center">
                  <Terminal className="mr-2" size={20} />
                  Developer Tools
                </h3>
                <button
                  onClick={() => setShowDiagnostic(!showDiagnostic)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  {showDiagnostic ? 'Hide' : 'Show'} Diagnostic
                </button>
              </div>
              
              {showDiagnostic && (
                <div className="bg-black/20 p-4 rounded text-xs font-mono">
                  <div>User ID: {user?.id || 'Not logged in'}</div>
                  <div>Wallet: {user?.walletAddress || 'No wallet'}</div>
                  <div>Is Wallet Connected: {isWalletConnected ? 'Yes' : 'No'}</div>
                  <div>Tickets: {gameState.tickets.length}</div>
                  <div>Winning Numbers: {gameState.winningNumbers?.join(', ') || 'None'}</div>
                  <div>Time Remaining: {gameState.timeRemaining}s</div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Emoji Debugger - Solo en desarrollo */}
        {import.meta.env.DEV && <EmojiDebugger />}
      </div>

              {/* Ticket History Modal */}
      {showTicketHistory && (
        <TicketHistoryModal onClose={() => setShowTicketHistory(false)} />
      )}

      {/* Blockchain Debug Panel */}
      <BlockchainDebugPanel 
        isVisible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </div>
  );
}

function App() {
  useEffect(() => {
    console.log('[App] Funciones de debug agregadas a window:');
    console.log('- window.debugTokens() - Ver estado actual de tokens');
    console.log('- window.resetTokens() - Resetear tokens del usuario actual');
    console.log('- window.getCurrentPoolState() - Ver estado actual de la pool');
    console.log('- window.forcePoolUpdate() - Forzar actualización de pool');
    console.log('- window.checkPoolsHealth() - Verificar salud de pools');
    console.log('- window.testPoolAccumulation() - Probar acumulación de pools');
    console.log('- window.simulateNoWinnersDay("2024-12-20") - Simular día sin ganadores');
    console.log('- window.testFirebaseWrite() - Probar permisos de escritura en Firebase');
    console.log('- window.debugTimezone() - Verificar zona horaria');
    console.log('- window.checkUserTickets() - Consultar tickets manualmente');
    console.log('- window.getCurrentPoolState() - Ver estado actual de la pool');
    console.log('- window.debugInfo() - Info rápida de debug');
    console.log('- window.checkDrawStatus() - Verificar estado del sorteo');
    console.log('- window.triggerDraw() - Triggear sorteo manualmente');
    console.log('- window.checkTimerStatus() - Verificar estado del timer');
    console.log('- window.diagnoseTimer() - Diagnosticar el timer en detalle');
    console.log('- window.simpleTimerCheck() - Cálculo simple del timer');
          console.log('- window.resetMyTokens() - Resetear mis tokens a 1000 para pruebas');
      console.log('- window.debugWinners() - Revisar ganadores manualmente (requiere índice)');
      console.log('- window.simpleDebugWinners() - Verificación simple de ganadores');
      console.log('- window.investigateGameDays() - Ver en qué fechas están los tickets');
      console.log('- window.checkWinnersForDate() - Verificar ganadores del 9 de junio');
      console.log('- window.compareWinningDays() - Comparar días con/sin ganadores');
      console.log('- window.getAllMyTickets() - Ver TODOS mis tickets');
      console.log('- window.investigateUserTickets("wallet") - Investigar usuario específico');
      console.log('- window.simpleUserInvestigation("wallet") - Investigar sin índices');
      console.log('- window.checkTemporaryTickets() - Verificar tickets temporales');
      console.log('- window.checkAllTicketsForWinners() - Verificar TODOS los ganadores');
      console.log('- window.compareFrontendVsDB() - Comparar frontend vs BD');
      console.log('- window.testWinLogic() - Probar lógica de verificación de premios');
      console.log('- window.distributeHistoricalPrizes() - Distribuir premios históricos');
      console.log('- window.debugWonTokens() - Debug tokens ganados');
      console.log('- window.debugEmptyPools() - Debug pools vacías');
      console.log('- window.forceDistributePools() - Distribuir pools manualmente');
      console.log('- window.checkAllUsers() - Verificar todos los usuarios que han jugado');
      console.log('- window.fixMissingPools() - Arreglar pools específicas que se saltaron');
      console.log('- window.repairExistingPools() - Reparar pools agregando finalPools');
      console.log('- window.inspectPool() - Inspeccionar la estructura real de una pool');
      console.log('- window.forceDistributePrizes() - Forzar distribución de premios específicos');
      console.log('- window.repairZeroFinalPools() - Reparar pools con finalPools en 0');
      console.log('- window.investigateGameResults() - Investigador resultados de sorteo');
              console.log('- window.diagnoseHybridTimer() - Diagnosticar el timer híbrido V4');
        console.log('- window.verifyV4TimerSync() - Verificar sincronización completa del timer V4');
        console.log('- window.checkContractDrawTime() - Ver hora exacta del sorteo según contrato V4');
        console.log('- window.verifyContractLogic() - Verificar lógica de cálculo del contrato');
        console.log('- window.compareFrontendVsContract() - Comparar timer frontend vs contrato');
      console.log('- window.checkContractDrawTime() - Verificar hora exacta del sorteo según el contrato');
      console.log('- window.verifyContractLogic() - Verificar lógica de cálculo del contrato');
      console.log('- window.compareFrontendVsContract() - Comparar timer frontend vs contrato');
      console.log('- window.showTimerCorrection() - Mostrar corrección temporal del timer');
  }, []);

  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;