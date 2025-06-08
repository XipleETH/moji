import { db } from './config';
import { 
  collection, 
  addDoc, 
  doc,
  getDoc,
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  where,
  Timestamp,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { GameResult, Ticket } from '../types';
import { getCurrentUser } from './auth';
import { useTokensForTicket, canUserBuyTicket, getCurrentGameDay } from './tokens';
import { addTokensToPool } from './prizePools';

const GAME_RESULTS_COLLECTION = 'game_results';
const TICKETS_COLLECTION = 'player_tickets';
const GAME_STATE_DOC = 'current_game_state';
const RESULTS_LIMIT = 50;

// Convertir documento de Firestore a nuestro tipo de resultado de juego
const mapFirestoreGameResult = (doc: any): GameResult => {
  const data = doc.data();
  return {
    id: doc.id,
    timestamp: data.timestamp?.toMillis() || Date.now(),
    winningNumbers: data.winningNumbers || [],
    firstPrize: data.firstPrize || [],
    secondPrize: data.secondPrize || [],
    thirdPrize: data.thirdPrize || [],
    freePrize: data.freePrize || []
  };
};

// Convertir documento de Firestore a nuestro tipo de ticket
const mapFirestoreTicket = (doc: any): Ticket => {
  const data = doc.data();
  return {
    id: doc.id,
    numbers: data.numbers || [],
    timestamp: data.timestamp?.toMillis() || Date.now(),
    userId: data.userId,
    walletAddress: data.walletAddress,
    fid: data.fid,
    txHash: data.txHash,
    gameDay: data.gameDay || getCurrentGameDay(),
    tokenCost: data.tokenCost || 1,
    isActive: data.isActive !== undefined ? data.isActive : true
  };
};

// Generar un ticket (mejorado para evitar condiciones de carrera)
export const generateTicket = async (numbers: string[]): Promise<Ticket | null> => {
  try {
    console.log('[generateTicket] Iniciando generación de ticket con números:', numbers);
    
    const user = await getCurrentUser();
    console.log('[generateTicket] Usuario obtenido:', user ? `ID: ${user.id}, Username: ${user.username}, Wallet: ${user.walletAddress}` : 'No hay usuario');
    
    // Verificar que el usuario tenga una billetera
    if (!user || !user.walletAddress) {
      console.error('[generateTicket] Error: Usuario no tiene wallet conectada');
      return null;
    }
    
    const currentGameDay = getCurrentGameDay();
    
    // Usar una transacción para garantizar atomicidad
    return await runTransaction(db, async (transaction) => {
      // 1. Verificar tokens disponibles dentro de la transacción
      const tokensRef = doc(db, 'daily_tokens', `${user.id}_${currentGameDay}`);
      const tokensDoc = await transaction.get(tokensRef);
      
      let currentTokens = { tokensAvailable: 10, tokensUsed: 0 };
      if (tokensDoc.exists()) {
        currentTokens = tokensDoc.data() as any;
      }
      
      // Verificar si tiene tokens suficientes
      if (currentTokens.tokensAvailable < 1) {
        console.error(`[generateTicket] Error: Usuario no tiene tokens suficientes. Disponibles: ${currentTokens.tokensAvailable}`);
        throw new Error('Insufficient tokens');
      }
      
      // 2. Crear el ticket
      const uniqueHash = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const ticketRef = doc(collection(db, TICKETS_COLLECTION));
      
      const ticketData = {
        numbers,
        timestamp: serverTimestamp(),
        userId: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        fid: user.fid || 0,
        isFarcasterUser: user.isFarcasterUser || false,
        verifiedWallet: user.verifiedWallet || true,
        chainId: user.chainId || 8453,
        walletProvider: user.walletProvider || 'injected',
        ticketHash: uniqueHash,
        gameDay: currentGameDay,
        tokenCost: 1,
        isActive: true
      };
      
      // 3. Actualizar tokens dentro de la transacción
      const newTokenData = {
        userId: user.id,
        date: currentGameDay,
        tokensAvailable: currentTokens.tokensAvailable - 1,
        tokensUsed: (currentTokens.tokensUsed || 0) + 1,
        lastUpdated: serverTimestamp()
      };
      
      // 4. Crear purchase record
      const purchaseRef = doc(collection(db, 'ticket_purchases'));
      const purchaseData = {
        id: purchaseRef.id,
        userId: user.id,
        walletAddress: user.walletAddress,
        gameDay: currentGameDay,
        tokensSpent: 1,
        ticketId: ticketRef.id,
        timestamp: serverTimestamp()
      };
      
      // 5. Ejecutar todas las operaciones en la transacción
      transaction.set(ticketRef, ticketData);
      
      if (tokensDoc.exists()) {
        transaction.update(tokensRef, newTokenData);
      } else {
        transaction.set(tokensRef, newTokenData);
      }
      
      transaction.set(purchaseRef, purchaseData);
      
      console.log(`[generateTicket] ✅ Transacción preparada - Ticket: ${ticketRef.id}, Tokens restantes: ${newTokenData.tokensAvailable}`);
      
      // Devolver el ticket creado
      const newTicket: Ticket = {
        id: ticketRef.id,
        numbers,
        timestamp: Date.now(),
        userId: user.id,
        walletAddress: user.walletAddress,
        fid: user.fid,
        gameDay: currentGameDay,
        tokenCost: 1,
        isActive: true
      };
      
      return newTicket;
    }).then(async (ticket) => {
      // Agregar a la pool después de que se confirme la transacción principal
      if (ticket) {
        // Hacerlo en background para evitar bloqueos
        setTimeout(() => {
          addTicketToPool(user.id, user.walletAddress, ticket.id);
        }, 100);
      }
      return ticket;
    });
    
  } catch (error) {
    console.error('[generateTicket] Error en transacción:', error);
    
    if (error instanceof Error && error.message === 'Insufficient tokens') {
      console.error('[generateTicket] Usuario sin tokens suficientes');
    }
    
    return null;
  }
};

// Función auxiliar para agregar tokens a la pool después de crear el ticket
const addTicketToPool = async (userId: string, walletAddress: string, ticketId: string) => {
  try {
    console.log(`[addTicketToPool] Agregando ticket ${ticketId} a la pool de premios...`);
    
    // Pequeño delay para evitar condiciones de carrera
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const poolSuccess = await addTokensToPool(userId, walletAddress, 1, ticketId);
    if (poolSuccess) {
      console.log(`[addTicketToPool] ✅ Token agregado exitosamente a la pool para el ticket ${ticketId}`);
    } else {
      console.log(`[addTicketToPool] ⚠️ No se pudo agregar token a la pool para el ticket ${ticketId}`);
    }
  } catch (error) {
    console.error(`[addTicketToPool] Error agregando token a la pool:`, error);
    // Intentar de nuevo una vez después de un delay
    try {
      console.log(`[addTicketToPool] Reintentando para el ticket ${ticketId}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await addTokensToPool(userId, walletAddress, 1, ticketId);
      console.log(`[addTicketToPool] ✅ Reintento exitoso para el ticket ${ticketId}`);
    } catch (retryError) {
      console.error(`[addTicketToPool] Reintento falló para el ticket ${ticketId}:`, retryError);
    }
  }
};

// Suscribirse a los resultados de juegos
export const subscribeToGameResults = (
  callback: (results: GameResult[]) => void
) => {
  try {
    console.log('[subscribeToGameResults] Configurando suscripción a resultados del juego');
    
    // Usar un mapa para evitar resultados duplicados en el mismo día
    const resultsByDay = new Map<string, GameResult>();
    
    const resultsQuery = query(
      collection(db, GAME_RESULTS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(RESULTS_LIMIT)
    );
    
    return onSnapshot(resultsQuery, (snapshot) => {
      try {
        // Registrar los cambios para diagnóstico
        if (snapshot.docChanges().length > 0) {
          console.log(`[subscribeToGameResults] Cambios detectados: ${snapshot.docChanges().length} documentos`);
          
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              console.log(`[subscribeToGameResults] Documento añadido: ${change.doc.id}`);
            } else if (change.type === 'modified') {
              console.log(`[subscribeToGameResults] Documento modificado: ${change.doc.id}`);
            }
          });
        }
        
        // Procesar todos los documentos - primero almacenarlos por ID para quitar duplicados explícitos
        const resultsById = new Map<string, GameResult>();
        snapshot.docs.forEach(doc => {
          try {
            const result = mapFirestoreGameResult(doc);
            resultsById.set(doc.id, result);
          } catch (error) {
            console.error(`[subscribeToGameResults] Error mapeando documento ${doc.id}:`, error);
          }
        });
        
        // Después agrupar por día para eliminar duplicados por tiempo
        const results: GameResult[] = [];
        
        resultsById.forEach(result => {
          // Obtener clave de día para agrupar resultados
          const date = new Date(result.timestamp);
          const dayKey = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
          
          // Para duplicados por día, quedarnos con el resultado más reciente
          const existingResult = resultsByDay.get(dayKey);
          
          if (!existingResult || existingResult.id < result.id) {
            resultsByDay.set(dayKey, result);
          }
        });
        
        // Convertir el mapa a un array
        results.push(...resultsByDay.values());
        
        // Ordenar por timestamp (más reciente primero)
        results.sort((a, b) => b.timestamp - a.timestamp);
        
        // Mostrar un log de diagnóstico
        if (results.length > 0) {
          console.log(`[subscribeToGameResults] Procesados ${results.length} resultados únicos (por día) de ${resultsById.size} documentos totales`);
        }
        
        callback(results);
      } catch (error) {
        console.error('[subscribeToGameResults] Error procesando snapshot:', error);
        callback([]);
      }
    }, (error) => {
      console.error('[subscribeToGameResults] Error en suscripción:', error);
      callback([]);
    });
  } catch (error) {
    console.error('[subscribeToGameResults] Error configurando suscripción:', error);
    return () => {}; // Unsubscribe no-op
  }
};

// Suscribirse a los tickets del usuario actual (solo del día actual)
export const subscribeToUserTickets = (
  callback: (tickets: Ticket[]) => void
): (() => void) => {
  console.log('[subscribeToUserTickets] Iniciando suscripción a tickets del usuario');
  
  let unsubscribeFirestore: (() => void) | null = null;
  
  // Obtener usuario y configurar suscripción
  getCurrentUser().then(user => {
    if (!user) {
      console.log('[subscribeToUserTickets] No hay usuario conectado');
      callback([]);
      return;
    }
    
    console.log(`[subscribeToUserTickets] Usuario conectado: ${user.id}`);
    const currentGameDay = getCurrentGameDay();
    console.log(`[subscribeToUserTickets] Buscando tickets del día: ${currentGameDay}`);
    
    const ticketsQuery = query(
      collection(db, TICKETS_COLLECTION),
      where('userId', '==', user.id),
      where('gameDay', '==', currentGameDay),
      where('isActive', '==', true),
      orderBy('timestamp', 'desc')
    );
    
    unsubscribeFirestore = onSnapshot(ticketsQuery, (snapshot) => {
      try {
        console.log(`[subscribeToUserTickets] Snapshot recibido con ${snapshot.docs.length} documentos`);
        
        const tickets = snapshot.docs.map(doc => {
          try {
            const ticket = mapFirestoreTicket(doc);
            console.log(`[subscribeToUserTickets] Ticket mapeado:`, {
              id: ticket.id,
              gameDay: ticket.gameDay,
              isActive: ticket.isActive,
              numbers: ticket.numbers
            });
            return ticket;
          } catch (error) {
            console.error('[subscribeToUserTickets] Error mapping ticket document:', error, doc.id);
            return null;
          }
        }).filter(ticket => ticket !== null) as Ticket[];
        
        console.log(`[subscribeToUserTickets] Total de tickets válidos: ${tickets.length}`);
        callback(tickets);
      } catch (error) {
        console.error('[subscribeToUserTickets] Error processing tickets snapshot:', error);
        callback([]);
      }
    }, (error) => {
      console.error('[subscribeToUserTickets] Error en suscripción:', error);
      callback([]);
    });
  }).catch(error => {
    console.error('[subscribeToUserTickets] Error obteniendo usuario:', error);
    callback([]);
  });
  
  // Devolver función de unsubscribe
  return () => {
    console.log('[subscribeToUserTickets] Desuscribiendo...');
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
};

// Suscribirse al estado actual del juego
export const subscribeToCurrentGameState = (
  callback: (winningNumbers: string[], timeRemaining: number) => void
) => {
  const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
  
  return onSnapshot(stateDocRef, (snapshot) => {
    const data = snapshot.data() || {};
    const winningNumbers = data.winningNumbers || [];
    const nextDrawTime = data.nextDrawTime?.toMillis() || Date.now() + 60000;
    const timeRemaining = Math.max(0, Math.floor((nextDrawTime - Date.now()) / 1000));
    
    callback(winningNumbers, timeRemaining);
  });
};

// Cache simple para estadísticas de usuarios
const statisticsCache = new Map<string, {
  data: any;
  timestamp: number;
  expiry: number;
}>();

const CACHE_DURATION = 60000; // 1 minuto

// Función optimizada para obtener estadísticas del usuario
export const getUserStatistics = async (userId: string) => {
  try {
    // Verificar cache primero
    const cached = statisticsCache.get(userId);
    const now = Date.now();
    
    if (cached && now < cached.expiry) {
      console.log(`[getUserStatistics] Usando datos en caché para usuario ${userId}`);
      return cached.data;
    }

    console.log(`[getUserStatistics] Obteniendo estadísticas frescas para usuario ${userId}`);

    // Obtener tickets del usuario (limitado a los últimos 100)
    const ticketsQuery = query(
      collection(db, TICKETS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const userTickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Obtener solo los resultados recientes (últimas 2 semanas)
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const resultsQuery = query(
      collection(db, GAME_RESULTS_COLLECTION),
      where('timestamp', '>=', Timestamp.fromMillis(twoWeeksAgo)),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    const recentResults = resultsSnapshot.docs.map(doc => mapFirestoreGameResult(doc));

    // Contar premios ganados
    let firstPrizeWins = 0;
    let secondPrizeWins = 0;
    let thirdPrizeWins = 0;
    let freePrizeWins = 0;

    recentResults.forEach(result => {
      // Verificar en cada categoría de premio
      if (result.firstPrize?.some(ticket => ticket.userId === userId)) {
        firstPrizeWins++;
      }
      if (result.secondPrize?.some(ticket => ticket.userId === userId)) {
        secondPrizeWins++;
      }
      if (result.thirdPrize?.some(ticket => ticket.userId === userId)) {
        thirdPrizeWins++;
      }
      if (result.freePrize?.some(ticket => ticket.userId === userId)) {
        freePrizeWins++;
      }
    });

    const statistics = {
      totalTickets: userTickets.length,
      freeTickets: userTickets.filter(ticket => ticket.isFreeTicket).length,
      paidTickets: userTickets.filter(ticket => !ticket.isFreeTicket).length,
      wins: {
        firstPrize: firstPrizeWins,
        secondPrize: secondPrizeWins,
        thirdPrize: thirdPrizeWins,
        freePrize: freePrizeWins
      },
      totalWins: firstPrizeWins + secondPrizeWins + thirdPrizeWins + freePrizeWins
    };

    // Guardar en caché
    statisticsCache.set(userId, {
      data: statistics,
      timestamp: now,
      expiry: now + CACHE_DURATION
    });

    return statistics;
  } catch (error) {
    console.error('Error getting user statistics:', error);
    throw error;
  }
};

// Nueva función: Obtener historial completo de tickets del usuario organizados por días
export interface TicketsByDay {
  [gameDay: string]: Ticket[];
}

export const getUserTicketHistory = async (userId?: string, limitDays: number = 30): Promise<TicketsByDay> => {
  try {
    const user = userId ? { id: userId } : await getCurrentUser();
    if (!user) {
      console.warn('[getUserTicketHistory] No user provided');
      return {};
    }

    console.log(`[getUserTicketHistory] Obteniendo historial de tickets para usuario: ${user.id}`);

    // Calcular fecha límite (últimos X días)
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - limitDays);
    const limitTimestamp = Timestamp.fromDate(limitDate);

    // Consulta para obtener todos los tickets del usuario en el período
    const ticketsQuery = query(
      collection(db, TICKETS_COLLECTION),
      where('userId', '==', user.id),
      where('timestamp', '>=', limitTimestamp),
      orderBy('timestamp', 'desc'),
      limit(500) // Limitar a 500 tickets máximo para rendimiento
    );

    const ticketsSnapshot = await getDocs(ticketsQuery);
    const allTickets = ticketsSnapshot.docs.map(doc => mapFirestoreTicket(doc));

    // Organizar tickets por día
    const ticketsByDay: TicketsByDay = {};
    
    allTickets.forEach(ticket => {
      const gameDay = ticket.gameDay;
      if (!ticketsByDay[gameDay]) {
        ticketsByDay[gameDay] = [];
      }
      ticketsByDay[gameDay].push(ticket);
    });

    // Ordenar tickets dentro de cada día por timestamp descendente
    Object.keys(ticketsByDay).forEach(day => {
      ticketsByDay[day].sort((a, b) => b.timestamp - a.timestamp);
    });

    console.log(`[getUserTicketHistory] Historial obtenido: ${allTickets.length} tickets en ${Object.keys(ticketsByDay).length} días`);
    
    return ticketsByDay;
  } catch (error) {
    console.error('[getUserTicketHistory] Error obteniendo historial:', error);
    return {};
  }
};

// Nueva función: Suscribirse a todo el historial de tickets del usuario
export const subscribeToUserTicketHistory = (
  callback: (ticketsByDay: TicketsByDay) => void,
  limitDays: number = 30
) => {
  try {
    getCurrentUser().then(user => {
      if (!user) {
        callback({});
        return () => {};
      }

      // Calcular fecha límite
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - limitDays);
      const limitTimestamp = Timestamp.fromDate(limitDate);

      const ticketsQuery = query(
        collection(db, TICKETS_COLLECTION),
        where('userId', '==', user.id),
        where('timestamp', '>=', limitTimestamp),
        orderBy('timestamp', 'desc'),
        limit(500)
      );

      return onSnapshot(ticketsQuery, (snapshot) => {
        try {
          const allTickets = snapshot.docs.map(doc => mapFirestoreTicket(doc));
          
          // Organizar por días
          const ticketsByDay: TicketsByDay = {};
          allTickets.forEach(ticket => {
            const gameDay = ticket.gameDay;
            if (!ticketsByDay[gameDay]) {
              ticketsByDay[gameDay] = [];
            }
            ticketsByDay[gameDay].push(ticket);
          });

          // Ordenar dentro de cada día
          Object.keys(ticketsByDay).forEach(day => {
            ticketsByDay[day].sort((a, b) => b.timestamp - a.timestamp);
          });

          callback(ticketsByDay);
        } catch (error) {
          console.error('Error processing ticket history snapshot:', error);
          callback({});
        }
      }, (error) => {
        console.error('Error in subscribeToUserTicketHistory:', error);
        callback({});
      });
    }).catch(error => {
      console.error('Error getting current user for ticket history:', error);
      callback({});
      return () => {};
    });

    return () => {};
  } catch (error) {
    console.error('Error setting up user ticket history subscription:', error);
    callback({});
    return () => {};
  }
}; 