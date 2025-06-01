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

const GAME_RESULTS_COLLECTION = 'game_results';
const TICKETS_COLLECTION = 'player_tickets';
const GAME_STATE_DOC = 'current_game_state';
const RESULTS_LIMIT = 50;

// Tipos para el nuevo sistema diario
export interface GameState {
  winningNumbers: string[];
  nextDrawTime: Timestamp;
  lastUpdated: Timestamp;
  lastProcessId?: string;
  dateKey?: string;
  cooldownActive?: boolean;
}

export interface TicketGenerationResult {
  success: boolean;
  ticket?: any;
  error?: string;
}

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
    userId: data.userId
  };
};

// Convertir documento de Firestore a ticket con Timestamp (para sistema diario)
const mapFirestoreTicketWithTimestamp = (doc: any) => {
  const data = doc.data();
  return {
    id: doc.id,
    numbers: data.numbers || [],
    timestamp: data.timestamp,
    userId: data.userId,
    walletAddress: data.walletAddress,
    username: data.username
  };
};

// Generar un ticket con resultado más detallado
export const generateTicket = async (numbers: string[], userId?: string): Promise<TicketGenerationResult> => {
  try {
    console.log('[generateTicket] Iniciando generación de ticket con números:', numbers);
    
    let user;
    if (userId) {
      // Si se proporciona userId, crear un objeto usuario básico
      user = { id: userId, walletAddress: userId };
    } else {
      user = await getCurrentUser();
    }
    
    console.log('[generateTicket] Usuario obtenido:', user ? `ID: ${user.id}, Wallet: ${user.walletAddress || 'N/A'}` : 'No hay usuario');
    
    // Para el sistema diario, solo necesitamos que el usuario tenga ID
    if (!user || !user.id) {
      console.error('[generateTicket] Error: Usuario no válido');
      return { success: false, error: 'Usuario no válido' };
    }
    
    console.log('[generateTicket] Validaciones pasadas, creando ticket...');
    
    // Generar un hash único para el ticket
    const uniqueHash = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Incluir información del usuario en el ticket
    const ticketData = {
      numbers,
      timestamp: serverTimestamp(),
      userId: user.id,
      username: user.username || 'Usuario',
      walletAddress: user.walletAddress || user.id,
      fid: user.fid || 0,
      isFarcasterUser: user.isFarcasterUser || false,
      verifiedWallet: user.verifiedWallet || true,
      chainId: user.chainId || 8453,
      ticketHash: uniqueHash
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
    console.log(`[generateTicket] Ticket creado con ID: ${ticketRef.id} para el usuario ${ticketData.username} (ID: ${user.id})`);
    
    // Devolver el ticket creado
    const newTicket = {
      id: ticketRef.id,
      numbers,
      timestamp: Date.now(),
      userId: user.id,
      walletAddress: ticketData.walletAddress,
      fid: user.fid
    };
    
    console.log('[generateTicket] Ticket devuelto:', newTicket);
    return { success: true, ticket: newTicket };
  } catch (error) {
    console.error('[generateTicket] Error generating ticket:', error);
    
    // Información adicional de debugging
    if (error instanceof Error) {
      console.error('[generateTicket] Error name:', error.name);
      console.error('[generateTicket] Error message:', error.message);
      console.error('[generateTicket] Error stack:', error.stack);
    }
    
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
};

// Obtener tickets de un usuario con filtros de fecha
export const getUserTickets = async (
  userId: string, 
  startDate?: Date, 
  endDate?: Date
): Promise<Array<{
  id: string;
  numbers: string[];
  timestamp: Timestamp;
  userId: string;
  walletAddress?: string;
  username?: string;
}>> => {
  try {
    let ticketsQuery = query(
      collection(db, TICKETS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    // Si se proporcionan fechas, filtrar por rango
    if (startDate) {
      ticketsQuery = query(
        collection(db, TICKETS_COLLECTION),
        where('userId', '==', userId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        ...(endDate ? [where('timestamp', '<=', Timestamp.fromDate(endDate))] : []),
        orderBy('timestamp', 'desc')
      );
    }
    
    const snapshot = await getDocs(ticketsQuery);
    
    return snapshot.docs.map(doc => mapFirestoreTicketWithTimestamp(doc));
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return [];
  }
};

// Obtener el estado actual del juego
export const getGameState = async (): Promise<GameState | null> => {
  try {
    const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
    const snapshot = await getDoc(stateDocRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    
    return {
      winningNumbers: data.winningNumbers || [],
      nextDrawTime: data.nextDrawTime,
      lastUpdated: data.lastUpdated,
      lastProcessId: data.lastProcessId,
      dateKey: data.dateKey,
      cooldownActive: data.cooldownActive || false
    };
  } catch (error) {
    console.error('Error fetching game state:', error);
    return null;
  }
};

// Suscribirse al estado del juego
export const subscribeToGameState = (
  callback: (state: GameState | null) => void
) => {
  const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
  
  return onSnapshot(stateDocRef, (snapshot) => {
    try {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      
      const data = snapshot.data();
      
      const gameState: GameState = {
        winningNumbers: data.winningNumbers || [],
        nextDrawTime: data.nextDrawTime,
        lastUpdated: data.lastUpdated,
        lastProcessId: data.lastProcessId,
        dateKey: data.dateKey,
        cooldownActive: data.cooldownActive || false
      };
      
      callback(gameState);
    } catch (error) {
      console.error('Error processing game state snapshot:', error);
      callback(null);
    }
  }, (error) => {
    console.error('Error in game state subscription:', error);
    callback(null);
  });
};

// Suscribirse a los resultados de juegos
export const subscribeToGameResults = (
  callback: (results: GameResult[]) => void
) => {
  try {
    console.log('[subscribeToGameResults] Configurando suscripción a resultados del juego');
    
    // Usar un mapa para evitar resultados duplicados en el mismo minuto
    const resultsByMinute = new Map<string, GameResult>();
    
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
        
        // Después agrupar por minuto para eliminar duplicados por tiempo
        const results: GameResult[] = [];
        
        resultsById.forEach(result => {
          // Obtener clave de minuto para agrupar resultados
          const date = new Date(result.timestamp);
          const minuteKey = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
          
          // Para duplicados por minuto, quedarnos con el resultado más reciente
          const existingResult = resultsByMinute.get(minuteKey);
          
          if (!existingResult || existingResult.id < result.id) {
            resultsByMinute.set(minuteKey, result);
          }
        });
        
        // Convertir el mapa a un array
        results.push(...resultsByMinute.values());
        
        // Ordenar por timestamp (más reciente primero)
        results.sort((a, b) => b.timestamp - a.timestamp);
        
        // Mostrar un log de diagnóstico
        if (results.length > 0) {
          console.log(`[subscribeToGameResults] Procesados ${results.length} resultados únicos (por minuto) de ${resultsById.size} documentos totales`);
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

// Suscribirse a los tickets del usuario actual
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
      
      const ticketsQuery = query(
        collection(db, TICKETS_COLLECTION),
        where('userId', '==', user.id),
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

// Suscribirse al estado actual del juego (versión legacy)
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