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
    
    console.log('[generateTicket] Validaciones pasadas, creando ticket...');
    
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
    console.log(`[generateTicket] Ticket creado con ID: ${ticketRef.id} para el usuario ${user.username} (Wallet: ${user.walletAddress})`);
    
    // Devolver el ticket creado
    const newTicket = {
      id: ticketRef.id,
      numbers,
      timestamp: Date.now(),
      userId: user.id,
      walletAddress: user.walletAddress,
      fid: user.fid
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