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
  getDocs
} from 'firebase/firestore';
import { GameResult, Ticket } from '../types';
import { getCurrentUser } from './auth';
import { useTokensForTicket, canUserBuyTicket, getCurrentGameDay } from './tokens';

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

// Generar un ticket
export const generateTicket = async (numbers: string[]): Promise<Ticket | null> => {
  try {
    console.log('[generateTicket] Iniciando generación de ticket con números:', numbers);
    
    const user = await getCurrentUser();
    console.log('[generateTicket] Usuario obtenido:', user ? `ID: ${user.id}, Username: ${user.username}, Wallet: ${user.walletAddress}` : 'No hay usuario');
    
    // Verificar que el usuario tenga una billetera (no requiere Farcaster específicamente)
    if (!user || !user.walletAddress) {
      console.error('[generateTicket] Error: Usuario no tiene wallet conectada');
      return null;
    }
    
    // Verificar si el usuario puede comprar un ticket (tiene tokens suficientes)
    const { canBuy, reason, tokensAvailable } = await canUserBuyTicket(user.id);
    if (!canBuy) {
      console.error(`[generateTicket] Error: Usuario no puede comprar ticket - ${reason}. Tokens disponibles: ${tokensAvailable}`);
      return null;
    }
    
    // Usar tokens para el ticket
    const tokenUsed = await useTokensForTicket(user.id, 1);
    if (!tokenUsed) {
      console.error('[generateTicket] Error: No se pudieron usar los tokens');
      return null;
    }
    
    console.log('[generateTicket] Tokens utilizados exitosamente, creando ticket...');
    
    const currentGameDay = getCurrentGameDay();
    
    // Generar un hash único para el ticket (simulado)
    const uniqueHash = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Incluir información del usuario en el ticket
    const ticketData = {
      numbers,
      timestamp: serverTimestamp(),
      userId: user.id,
      username: user.username,
      walletAddress: user.walletAddress,
      fid: user.fid || 0, // Puede ser 0 si no es usuario de Farcaster
      isFarcasterUser: user.isFarcasterUser || false,
      verifiedWallet: user.verifiedWallet || true, // Asumimos true si tiene wallet conectada
      chainId: user.chainId || 8453, // Base por defecto
      walletProvider: user.walletProvider || 'injected', // Proveedor de wallet utilizado
      ticketHash: uniqueHash,
      // Nuevos campos para el sistema de tokens y días
      gameDay: currentGameDay,
      tokenCost: 1,
      isActive: true
    };
    
    console.log('[generateTicket] Datos del ticket preparados:', {
      userId: ticketData.userId,
      username: ticketData.username,
      walletAddress: ticketData.walletAddress,
      numbersCount: ticketData.numbers.length,
      collection: TICKETS_COLLECTION
    });
    
    console.log('[generateTicket] Intentando guardar en colección:', TICKETS_COLLECTION);
    const ticketRef = await addDoc(collection(db, TICKETS_COLLECTION), ticketData);
    console.log('[generateTicket] Ticket guardado exitosamente con ID:', ticketRef.id);
    
    // Log de éxito
    console.log(`[generateTicket] Ticket creado con ID: ${ticketRef.id} para el usuario ${user.username} (Wallet: ${user.walletAddress})`);
    
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
    
    console.log('[generateTicket] Ticket devuelto:', newTicket);
    return newTicket;
  } catch (error) {
    console.error('[generateTicket] Error generating ticket:', error);
    
    // Información adicional de debugging
    if (error instanceof Error) {
      console.error('[generateTicket] Error name:', error.name);
      console.error('[generateTicket] Error message:', error.message);
      console.error('[generateTicket] Error stack:', error.stack);
    }
    
    return null;
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
) => {
  try {
    // Primero obtenemos el usuario actual como promesa
    getCurrentUser().then(user => {
      if (!user) {
        callback([]);
        return () => {};
      }
      
      const currentGameDay = getCurrentGameDay();
      
      const ticketsQuery = query(
        collection(db, TICKETS_COLLECTION),
        where('userId', '==', user.id),
        where('gameDay', '==', currentGameDay),
        where('isActive', '==', true),
        orderBy('timestamp', 'desc')
      );
      
      return onSnapshot(ticketsQuery, (snapshot) => {
        try {
          const tickets = snapshot.docs.map(doc => {
            try {
              return mapFirestoreTicket(doc);
            } catch (error) {
              console.error('Error mapping ticket document:', error, doc.id);
              return null;
            }
          }).filter(ticket => ticket !== null) as Ticket[];
          
          callback(tickets);
        } catch (error) {
          console.error('Error processing tickets snapshot:', error);
          callback([]);
        }
      }, (error) => {
        console.error('Error in subscribeToUserTickets:', error);
        callback([]);
      });
    }).catch(error => {
      console.error('Error getting current user:', error);
      callback([]);
      return () => {};
    });
    
    // Devolver una función de unsubscribe temporal
    return () => {
      // Esta función será reemplazada cuando se resuelva la promesa
    };
  } catch (error) {
    console.error('Error setting up user tickets subscription:', error);
    callback([]);
    return () => {}; // Unsubscribe no-op
  }
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

// Función para obtener estadísticas del usuario
export const getUserStatistics = async (userId: string) => {
  try {
    // Obtener todos los tickets del usuario
    const ticketsQuery = query(
      collection(db, TICKETS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const userTickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Obtener todos los resultados de juegos
    const resultsQuery = query(
      collection(db, GAME_RESULTS_COLLECTION),
      orderBy('timestamp', 'desc')
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    const allResults = resultsSnapshot.docs.map(doc => mapFirestoreGameResult(doc));

    // Contar premios ganados
    let firstPrizeWins = 0;
    let secondPrizeWins = 0;
    let thirdPrizeWins = 0;
    let freePrizeWins = 0;

    allResults.forEach(result => {
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

    return {
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
  } catch (error) {
    console.error('Error getting user statistics:', error);
    throw error;
  }
}; 