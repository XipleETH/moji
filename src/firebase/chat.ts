import { db } from './config';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { ChatMessage } from '../types';
import { getCurrentUser } from './auth';

const CHAT_COLLECTION = 'chat_messages';
const MESSAGE_LIMIT = 100;

// Convertir documento de Firestore a nuestro tipo de mensaje
const mapFirestoreMessage = (doc: any): ChatMessage => {
  try {
    const data = doc.data();
    
    // Validar que tengamos los datos básicos
    if (!data) {
      throw new Error('Documento sin datos');
    }
    
    // Validar emojis
    let emojis: string[] = [];
    if (Array.isArray(data.emojis)) {
      emojis = data.emojis.filter((emoji: any) => typeof emoji === 'string' && emoji.trim() !== '');
    } else if (typeof data.emojis === 'string' && data.emojis.trim() !== '') {
      // Manejar caso donde emojis pueda ser un string
      emojis = [data.emojis.trim()];
    }
    
    // Validar timestamp
    let timestamp = Date.now();
    if (data.timestamp) {
      if (typeof data.timestamp.toMillis === 'function') {
        timestamp = data.timestamp.toMillis();
      } else if (typeof data.timestamp === 'number') {
        timestamp = data.timestamp;
      } else if (typeof data.timestamp === 'string') {
        const parsed = Date.parse(data.timestamp);
        if (!isNaN(parsed)) {
          timestamp = parsed;
        }
      }
    }
    
    // Validar userId y username
    const userId = typeof data.userId === 'string' ? data.userId : 'anonymous';
    const username = typeof data.username === 'string' && data.username.trim() !== '' 
      ? data.username.trim() 
      : 'Anonymous';
    
    const message: ChatMessage = {
      id: doc.id,
      emojis,
      timestamp,
      userId,
      username
    };
    
    // Log para debugging si hay inconsistencias
    if (emojis.length === 0) {
      console.warn(`[mapFirestoreMessage] Mensaje ${doc.id} sin emojis válidos:`, data.emojis);
    }
    
    return message;
  } catch (error) {
    console.error(`[mapFirestoreMessage] Error mapeando documento ${doc.id}:`, error);
    
    // Devolver mensaje de error como fallback
    return {
      id: doc.id,
      emojis: ['❓'], // Emoji de pregunta para indicar error
      timestamp: Date.now(),
      userId: 'system',
      username: 'Sistema'
    };
  }
};

// Enviar un mensaje al chat
export const sendChatMessage = async (emojis: string[]): Promise<boolean> => {
  console.log('=== DEBUG CHAT MESSAGE ===');
  console.log('1. Emojis recibidos:', emojis);
  
  try {
    console.log('[sendChatMessage] Iniciando envío de mensaje con emojis:', emojis);
    
    // Validar que tenemos emojis
    if (!emojis || emojis.length === 0) {
      console.warn('[sendChatMessage] No se proporcionaron emojis válidos');
      return false;
    }
    
    console.log('2. Obteniendo usuario...');
    // Obtener usuario de forma asíncrona
    const user = await getCurrentUser();
    console.log('[sendChatMessage] Usuario obtenido:', user ? `${user.username} (${user.id})` : 'null');
    console.log('3. Usuario completo:', user);
    
    // Preparar datos del mensaje
    const messageData = {
      emojis: emojis.filter(emoji => emoji && emoji.trim() !== ''), // Filtrar emojis vacíos
      timestamp: serverTimestamp(),
      userId: user?.id || 'anonymous',
      username: user?.username || 'Anonymous'
    };
    
    console.log('[sendChatMessage] Datos del mensaje preparados:', {
      emojisCount: messageData.emojis.length,
      userId: messageData.userId,
      username: messageData.username,
      collection: CHAT_COLLECTION
    });
    
    console.log('4. Datos completos a enviar:');
    console.table(messageData);
    
    console.log('5. Intentando conectar con Firestore...');
    console.log('   - Base de datos:', db);
    console.log('   - Colección:', CHAT_COLLECTION);
    
    // Intentar enviar el mensaje
    console.log('6. Ejecutando addDoc...');
    const docRef = await addDoc(collection(db, CHAT_COLLECTION), messageData);
    console.log('[sendChatMessage] Mensaje enviado exitosamente con ID:', docRef.id);
    console.log('7. ¡ÉXITO! Documento creado con ID:', docRef.id);
    
    // Verificar que el documento existe
    console.log('8. Verificando que el documento existe...');
    try {
      const doc = await import('firebase/firestore').then(({ getDoc, doc }) => 
        getDoc(doc(db, CHAT_COLLECTION, docRef.id))
      );
      console.log('9. Documento verificado:', doc.exists() ? 'EXISTS' : 'NOT FOUND');
      if (doc.exists()) {
        console.log('   Datos del documento:', doc.data());
      }
    } catch (verifyError) {
      console.error('Error verificando documento:', verifyError);
    }
    
    return true;
  } catch (error) {
    console.error('=== ERROR EN CHAT ===');
    console.error('[sendChatMessage] Error sending chat message:', error);
    
    // Log adicional para debugging de navegadores
    if (error instanceof Error) {
      console.error('[sendChatMessage] Error name:', error.name);
      console.error('[sendChatMessage] Error message:', error.message);
      console.error('[sendChatMessage] Error stack:', error.stack);
    }
    
    // Verificar si el error es de conexión/permisos
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('[sendChatMessage] Firebase error code:', (error as any).code);
      console.error('[sendChatMessage] Firebase error details:', error);
    }
    
    console.log('=== FIN DEBUG ERROR ===');
    return false;
  }
};

// Suscribirse a los mensajes del chat
export const subscribeToChatMessages = (
  callback: (messages: ChatMessage[]) => void
) => {
  try {
    console.log('[subscribeToChatMessages] Iniciando suscripción a mensajes del chat');
    
    const messagesQuery = query(
      collection(db, CHAT_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(MESSAGE_LIMIT)
    );
    
    console.log('[subscribeToChatMessages] Query configurada:', {
      collection: CHAT_COLLECTION,
      orderBy: 'timestamp desc',
      limit: MESSAGE_LIMIT
    });
    
    return onSnapshot(messagesQuery, (snapshot) => {
      try {
        console.log('[subscribeToChatMessages] Snapshot recibido:', {
          size: snapshot.size,
          empty: snapshot.empty,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          isFromCache: snapshot.metadata.fromCache
        });
        
        // Procesar documentos
        const messages = snapshot.docs.map((doc, index) => {
          try {
            const message = mapFirestoreMessage(doc);
            console.log(`[subscribeToChatMessages] Mensaje ${index + 1}:`, {
              id: message.id,
              emojisCount: message.emojis.length,
              username: message.username,
              timestamp: new Date(message.timestamp).toLocaleTimeString()
            });
            return message;
          } catch (error) {
            console.error(`[subscribeToChatMessages] Error mapeando documento ${doc.id}:`, error);
            return null;
          }
        }).filter(message => message !== null) as ChatMessage[];
        
        console.log('[subscribeToChatMessages] Mensajes procesados exitosamente:', messages.length);
        callback(messages);
        
      } catch (error) {
        console.error('[subscribeToChatMessages] Error procesando snapshot:', error);
        callback([]); // Enviar array vacío en caso de error
      }
    }, (error) => {
      console.error('[subscribeToChatMessages] Error en la suscripción:', error);
      
      // Log adicional para debugging de Firebase
      if (error && typeof error === 'object') {
        console.error('[subscribeToChatMessages] Error details:', {
          code: (error as any).code,
          message: (error as any).message,
          name: (error as any).name
        });
      }
      
      callback([]); // Enviar array vacío en caso de error
    });
  } catch (error) {
    console.error('[subscribeToChatMessages] Error configurando suscripción:', error);
    return () => {}; // Función de unsubscribe no-op
  }
}; 