import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
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
import { TicketHistoryModal } from './components/TicketHistoryModal';
import { TicketHistoryModal } from './components/TicketHistoryModal';
import { WalletInfo } from './components/WalletInfo';
import { PrizePoolSummary, PrizePoolDisplay } from './components/PrizePoolDisplay';
import { resetUserTokens, canUserBuyTicket } from './firebase/tokens';
import { getCurrentUser } from './firebase/auth';
import { debugPrizePool, distributePrizePool } from './firebase/prizePools';
import { initializeDailyPool, checkPoolsHealth } from './utils/initializePools';

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

function AppContent() {
  const { gameState, generateTicket, forceGameDraw, queueStatus, rateLimitStatus } = useGameState();
  const { context } = useMiniKit();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();
  const { user: authUser, isLoading, isFarcasterAvailable, signIn } = useAuth();
  const { user: walletUser, isConnected: isWalletConnected } = useWallet();
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showTicketHistory, setShowTicketHistory] = useState(false);
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
      <div className="container mx-auto px-4 py-8">
        {/* Header con botones en esquinas */}
        <div className="relative mb-8">
          {/* Botón historial en esquina superior izquierda */}
          <div className="absolute top-0 left-0">
            <GameHistoryButton />
          </div>
          
          {/* Botones de billetera y perfil en esquina superior derecha */}
          <div className="absolute top-0 right-0 flex items-center gap-4">
            {context?.client?.added && (
              <button
                onClick={() => viewProfile()}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ver Perfil
              </button>
            )}
            <div className="relative">
              <WalletConnector />
            </div>
          </div>
          
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
            <Timer seconds={gameState.timeRemaining} />
          </div>
        </div>

        {/* Pool de Premios */}
        <div className="max-w-md mx-auto mb-8">
          <PrizePoolDisplay 
            showDetailedBreakdown={true} 
            showDebugControls={import.meta.env.DEV}
          />
        </div>

        <WinnerAnnouncement 
          winningNumbers={gameState.winningNumbers || []}
          firstPrize={gameState.lastResults?.firstPrize || []}
          secondPrize={gameState.lastResults?.secondPrize || []}
          thirdPrize={gameState.lastResults?.thirdPrize || []}
          freePrize={gameState.lastResults?.freePrize || []}
          currentUserId={user?.id}
        />

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

        <TicketGenerator
          onGenerateTicket={generateTicket}
          disabled={false}
          ticketCount={gameState.tickets.length}
          maxTickets={999}
          userTokens={gameState.userTokens}
          tokensUsed={1000 - gameState.userTokens}
          queueStatus={queueStatus}
          rateLimitStatus={rateLimitStatus}
        />

        {/* Tickets de hoy con botón de historial */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <TicketIcon className="mr-2" size={24} />
              Mis Tickets de Hoy ({gameState.tickets.length})
            </h2>
            <button
              onClick={() => setShowTicketHistory(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <History size={16} />
              Ver Historial
            </button>
          </div>
          

          
          {gameState.tickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gameState.tickets.map(ticket => (
                <TicketComponent
                  key={ticket.id}
                  ticket={ticket}
                  isWinner={
                    gameState.lastResults?.firstPrize?.some(t => t.id === ticket.id) ? 'first' :
                    gameState.lastResults?.secondPrize?.some(t => t.id === ticket.id) ? 'second' :
                    gameState.lastResults?.thirdPrize?.some(t => t.id === ticket.id) ? 'third' : 
                    gameState.lastResults?.freePrize?.some(t => t.id === ticket.id) ? 'free' : null
                  }
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white/10 rounded-lg">
              <TicketIcon className="mx-auto text-white/40 mb-4" size={48} />
              <p className="text-white/70">No has comprado tickets hoy</p>
              <p className="text-white/50 text-sm mt-2">¡Genera tu primer ticket arriba!</p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-white/10 rounded-lg p-6 text-white">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <Trophy className="mr-2" size={24} />
              Premio Structure
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>🥇 First Prize (4 exact matches):</span>
                <span className="font-bold">1000 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>🥈 Second Prize (4 any order):</span>
                <span className="font-bold">500 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>🥉 Third Prize (3 exact matches):</span>
                <span className="font-bold">100 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>🎫 Free Ticket (3 any order):</span>
                <span className="font-bold">Free ticket</span>
              </div>
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
      </div>

      {/* Modal del Historial de Tickets */}
      {showTicketHistory && (
        <TicketHistoryModal onClose={() => setShowTicketHistory(false)} />
      )}
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
      console.log('- window.testWinLogic() - Probar lógica de verificación de premios');
  }, []);

  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;