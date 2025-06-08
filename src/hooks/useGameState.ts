import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Ticket, GameResult, DailyTokens } from '../types';
import { useRealTimeTimer } from './useRealTimeTimer';
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
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [userTokens, setUserTokens] = useState<DailyTokens | null>(null);
  const processedResultsRef = useRef<Set<string>>(new Set());
  const lastProcessedMinuteRef = useRef<string>('');

  // Suscribirse a los tickets del usuario, al estado del juego y a los tokens
  useEffect(() => {
    console.log('[useGameState] Inicializando suscripciones...');
    
    // Suscribirse a los tickets del usuario (solo del día actual)
    const unsubscribeTickets = subscribeToUserTickets((ticketsFromFirebase) => {
      setGameState(prev => {
        // Separar tickets temporales de los reales
        const tempTickets = prev.tickets.filter(t => t.id.startsWith('temp-'));
        const realTickets = prev.tickets.filter(t => !t.id.startsWith('temp-'));
        
        // Combinar tickets de Firebase con los temporales
        // Evitar duplicados usando el timestamp como identificador adicional
        const allTickets = [...ticketsFromFirebase];
        
        // Agregar tickets temporales que no tengan un equivalente real
        tempTickets.forEach(tempTicket => {
          const hasRealEquivalent = ticketsFromFirebase.some(realTicket => 
            Math.abs(realTicket.timestamp - tempTicket.timestamp) < 5000 // 5 segundos de diferencia
          );
          if (!hasRealEquivalent) {
            allTickets.push(tempTicket);
          }
        });
        
        // Ordenar por timestamp (más reciente primero)
        allTickets.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log(`[useGameState] Tickets actualizados: ${allTickets.length} total (${ticketsFromFirebase.length} reales, ${tempTickets.length} temporales)`);
        
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
      console.log('[useGameState] Limpiando suscripciones de tickets, estado del juego y tokens');
      unsubscribeTickets();
      unsubscribeState();
      unsubscribeTokens();
    };
  }, []);

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

  // Obtener el tiempo restante del temporizador
  const timeRemaining = useRealTimeTimer(onGameProcessed);

  // Función para forzar un sorteo manualmente
  const forceGameDraw = useCallback(() => {
    console.log('[useGameState] Forzando sorteo manual...');
    requestManualGameDraw();
  }, []);

  // Función para generar un nuevo ticket (sin límites)
  const generateTicket = useCallback(async (numbers: string[]) => {
    if (!numbers?.length) return;
    
    try {
      console.log('[useGameState] Iniciando generación de ticket...');
      
      // 1. Crear ticket temporal para mostrar inmediatamente
      const tempTicket: Ticket = {
        id: 'temp-' + crypto.randomUUID(),
        numbers,
        timestamp: Date.now(),
        userId: 'temp',
        gameDay: getCurrentGameDay(),
        tokenCost: 1,
        isActive: true
      };
      
      // 2. Mostrar ticket temporal inmediatamente
      setGameState(prev => ({
        ...prev,
        tickets: [...prev.tickets, tempTicket]
      }));
      
      // 3. Generar el ticket real en Firebase
      const ticket = await import('../firebase/game').then(({ generateTicket: generateFirebaseTicket }) => {
        return generateFirebaseTicket(numbers);
      });
      
      if (!ticket) {
        console.log('[useGameState] ❌ No se pudo generar el ticket, removiendo temporal');
        // Remover ticket temporal si falla
        setGameState(prev => ({
          ...prev,
          tickets: prev.tickets.filter(t => t.id !== tempTicket.id)
        }));
      } else {
        console.log('[useGameState] ✅ Ticket generado exitosamente:', ticket.id);
        // Reemplazar ticket temporal con el real
        setGameState(prev => ({
          ...prev,
          tickets: prev.tickets.map(t => 
            t.id === tempTicket.id ? ticket : t
          )
        }));
      }
      
    } catch (error) {
      console.error('[useGameState] Error generating ticket:', error);
      // Limpiar cualquier ticket temporal que pudiera haber quedado
      setGameState(prev => ({
        ...prev,
        tickets: prev.tickets.filter(t => !t.id.startsWith('temp-'))
      }));
    }
  }, []);

  return {
    gameState: {
      ...gameState,
      timeRemaining
    },
    generateTicket,
    forceGameDraw
  };
}