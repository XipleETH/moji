import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Ticket, GameResult, DailyTokens } from '../types';
import { useHybridTimer } from './useHybridTimer';
import { useWallet } from '../contexts/WalletContext';
import { useRateLimit } from './useRateLimit';
import { useTicketQueue } from './useTicketQueue';
import { subscribeToUserTickets, subscribeToGameResults } from '../firebase/game';
import { requestManualGameDraw, subscribeToGameState } from '../firebase/gameServer';
import { subscribeToUserTokens, getCurrentGameDay } from '../firebase/tokens';

const initialGameState: GameState = {
  winningNumbers: [],
  tickets: [],
  lastResults: null,
  gameStarted: true,
  currentGameDay: getCurrentGameDay(),
  userTokens: 0
};

export function useGameState() {
  const { user } = useWallet();
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [userTokens, setUserTokens] = useState<DailyTokens | null>(null);
  const processedResultsRef = useRef<Set<string>>(new Set());
  const lastProcessedMinuteRef = useRef<string>('');

  // Rate limiting: máximo 20 tickets por minuto, mínimo 2 segundos entre tickets
  const rateLimit = useRateLimit({
    maxRequests: 20,
    windowMs: 60000, // 1 minuto
    cooldownMs: 2000 // 2 segundos entre tickets
  });

  // Función para procesar un ticket individual
  const processTicketInternal = useCallback(async (numbers: string[]) => {
    const ticket = await import('../firebase/game').then(({ generateTicket: generateFirebaseTicket }) => {
      return generateFirebaseTicket(numbers);
    });
    return ticket;
  }, []);

  // Cola de tickets para procesar uno a la vez
  const ticketQueue = useTicketQueue(processTicketInternal);

  // Suscribirse a los tickets del usuario, al estado del juego y a los tokens
  useEffect(() => {
    console.log('[useGameState] 🚀 Inicializando suscripciones...');
    console.log('[useGameState] 📅 GameDay actual:', getCurrentGameDay());
    console.log('[useGameState] 👤 Usuario conectado:', user?.id || 'Sin usuario');
    
    // Solo suscribirse si hay un usuario
    if (!user?.id) {
      console.log('[useGameState] ⏸️ No hay usuario, esperando conexión de billetera...');
      // Limpiar datos del usuario cuando no hay usuario conectado
      setUserTokens(null);
      setGameState(prev => ({
        ...prev,
        tickets: [],
        userTokens: 0
      }));
      return;
    }
    
    // Suscribirse a los tickets del usuario (solo del día actual)
    const unsubscribeTickets = subscribeToUserTickets((ticketsFromFirebase) => {
      console.log(`[useGameState] 🎫 Tickets recibidos de Firebase: ${ticketsFromFirebase.length}`);
      
      // Log detallado de cada ticket recibido
      if (ticketsFromFirebase.length === 0) {
        console.log(`[useGameState] ❌ No se recibieron tickets de Firebase para el día ${getCurrentGameDay()}`);
        console.log('[useGameState] 🔍 Esto podría indicar un problema en la consulta o que realmente no hay tickets');
      } else {
        ticketsFromFirebase.forEach((ticket, index) => {
          console.log(`[useGameState] 🎫 Ticket ${index + 1}:`, {
            id: ticket.id,
            gameDay: ticket.gameDay,
            timestamp: new Date(ticket.timestamp).toLocaleString(),
            numbers: ticket.numbers,
            userId: ticket.userId,
            isActive: ticket.isActive
          });
        });
      }
      
      setGameState(prev => {
        // Separar tickets temporales de los reales
        const tempTickets = prev.tickets.filter(t => t.id.startsWith('temp-'));
        const realTickets = prev.tickets.filter(t => !t.id.startsWith('temp-'));
        
        console.log(`[useGameState] 🔄 Estado actual: ${tempTickets.length} temporales, ${realTickets.length} reales, ${ticketsFromFirebase.length} nuevos de Firebase`);
        
        // Combinar tickets de Firebase con los temporales
        // Evitar duplicados usando el timestamp como identificador adicional
        const allTickets = [...ticketsFromFirebase];
        
        // Agregar tickets temporales que no tengan un equivalente real
        tempTickets.forEach(tempTicket => {
          const hasRealEquivalent = ticketsFromFirebase.some(realTicket => 
            Math.abs(realTicket.timestamp - tempTicket.timestamp) < 5000 // 5 segundos de diferencia
          );
          if (!hasRealEquivalent) {
            console.log(`[useGameState] ⏳ Manteniendo ticket temporal: ${tempTicket.id}`);
            allTickets.push(tempTicket);
          } else {
            console.log(`[useGameState] ✅ Ticket temporal ${tempTicket.id} ya tiene equivalente real`);
          }
        });
        
        // Ordenar por timestamp (más reciente primero)
        allTickets.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log(`[useGameState] 📊 Tickets finales: ${allTickets.length} total (${ticketsFromFirebase.length} reales, ${tempTickets.length} temporales mantenidos)`);
        
        return {
          ...prev,
          tickets: allTickets
        };
      });
    });

    // Suscribirse al estado del juego para obtener los números ganadores actuales
    const unsubscribeState = subscribeToGameState((nextDrawTime, winningNumbers) => {
      setGameState(prev => ({
        ...prev,
        winningNumbers
      }));
    });

    // Suscribirse a los tokens diarios del usuario
    const unsubscribeTokens = subscribeToUserTokens((tokens) => {
      setUserTokens(tokens);
      setGameState(prev => ({
        ...prev,
        userTokens: tokens?.tokensAvailable || 0
      }));
    });

    return () => {
      console.log('[useGameState] 🧹 Limpiando suscripciones de tickets, estado del juego y tokens');
      // Solo limpiar si las funciones existen (cuando hay usuario)
      if (typeof unsubscribeTickets === 'function') unsubscribeTickets();
      if (typeof unsubscribeState === 'function') unsubscribeState();
      if (typeof unsubscribeTokens === 'function') unsubscribeTokens();
    };
  }, [user?.id]); // Re-suscribir cuando cambie el usuario

  // Función para obtener la clave de día de un timestamp
  const getDayKey = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
  };

  // Suscribirse a los resultados del juego en Firebase
  useEffect(() => {
    console.log('[useGameState] Inicializando suscripción a resultados del juego');
    const unsubscribe = subscribeToGameResults((results) => {
      if (results.length > 0) {
        const latestResult = results[0]; // El primer resultado es el más reciente
        
        // Solo procesar si es un resultado nuevo que no hemos visto antes
        const resultDay = getDayKey(latestResult.timestamp);
        const resultId = latestResult.id || 'unknown';
        
        if (!processedResultsRef.current.has(resultId) && resultDay !== lastProcessedMinuteRef.current) {
          console.log(`[useGameState] Nuevo resultado recibido para el día ${resultDay} con ID: ${resultId}`, latestResult);
          processedResultsRef.current.add(resultId);
          lastProcessedMinuteRef.current = resultDay;
          
          setGameState(prev => ({
            ...prev,
            winningNumbers: latestResult.winningNumbers,
            lastResults: {
              firstPrize: latestResult.firstPrize,
              secondPrize: latestResult.secondPrize,
              thirdPrize: latestResult.thirdPrize,
              freePrize: latestResult.freePrize || [] // Compatibilidad con resultados antiguos
            }
          }));
        } else {
          console.log(`[useGameState] Ignorando resultado ya procesado para el día ${resultDay} con ID: ${resultId}`);
        }
      }
    });
    
    return () => {
      console.log('[useGameState] Limpiando suscripción a resultados del juego');
      unsubscribe();
    };
  }, []);

  // Esta función se llama cuando termina el temporizador
  const onGameProcessed = useCallback(() => {
    // No es necesario solicitar manualmente un nuevo sorteo
    // El sorteo lo ejecuta automáticamente la Cloud Function cada minuto
    console.log('[useGameState] Temporizador terminado, esperando próximo sorteo automático...');
    
    // IMPORTANTE: NO hacer nada aquí que pueda desencadenar un sorteo
    // Solo registrar que el temporizador ha terminado
  }, []);

  // Obtener el tiempo restante del temporizador híbrido (contrato + local)
  const hybridTimer = useHybridTimer(onGameProcessed);

  // Función para forzar un sorteo manualmente
  const forceGameDraw = useCallback(() => {
    console.log('[useGameState] Forzando sorteo manual...');
    requestManualGameDraw();
  }, []);

  // Función para generar un nuevo ticket (con rate limiting y cola)
  const generateTicket = useCallback(async (numbers: string[]) => {
    if (!numbers?.length) {
      console.warn('[useGameState] ⚠️ No se proporcionaron números para el ticket');
      return;
    }

    // Verificar rate limiting
    if (!rateLimit.checkRateLimit()) {
      console.warn(`[useGameState] ⏳ Rate limit excedido. Espera ${rateLimit.remainingTime} segundos`);
      return {
        error: `Demasiado rápido! Espera ${rateLimit.remainingTime} segundos`,
        remainingTime: rateLimit.remainingTime
      };
    }
    
    try {
      console.log('[useGameState] 🎫 Iniciando generación de ticket...');
      
      // 1. Crear ticket temporal para mostrar inmediatamente
      const tempTicket: Ticket = {
        id: 'temp-' + crypto.randomUUID(),
        numbers,
        timestamp: Date.now(),
        userId: user?.id || 'temp',
        gameDay: getCurrentGameDay(),
        tokenCost: 1,
        isActive: true
      };
      
      // 2. Mostrar ticket temporal inmediatamente
      setGameState(prev => ({
        ...prev,
        tickets: [tempTicket, ...prev.tickets] // Agregar al inicio para mejor UX
      }));
      
      // 3. Agregar a la cola para procesamiento
      const queueId = ticketQueue.addToQueue(numbers);
      console.log(`[useGameState] 📋 Ticket agregado a cola: ${queueId}`);
      
      return {
        tempTicket,
        queueId,
        success: true
      };
      
    } catch (error) {
      console.error('[useGameState] ❌ Error en generación de ticket:', error);
      return {
        error: 'Error generando ticket. Inténtalo de nuevo.',
        details: error
      };
    }
  }, [rateLimit, ticketQueue, user?.id]);

  return {
    gameState: {
      ...gameState,
      timeRemaining: hybridTimer.timeRemaining
    },
    generateTicket,
    forceGameDraw,
    // Información adicional para debugging y UI
    queueStatus: ticketQueue.status,
    rateLimitStatus: {
      isBlocked: rateLimit.isBlocked,
      remainingTime: rateLimit.remainingTime
    },
    // Información del timer híbrido para el componente Timer
    timerInfo: {
      isContractConnected: hybridTimer.isContractConnected,
      currentGameDay: hybridTimer.currentGameDay,
      nextDrawTime: hybridTimer.nextDrawTime,
      error: hybridTimer.error,
      timerSource: hybridTimer.timerSource
    }
  };
}