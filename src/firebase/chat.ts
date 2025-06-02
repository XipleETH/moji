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
  const data = doc.data();
  return {
    id: doc.id,
    emojis: data.emojis || [],
    timestamp: data.timestamp?.toMillis() || Date.now(),
    userId: data.userId,
    username: data.username
  };
};

// Enviar un mensaje al chat
export const sendChatMessage = async (emojis: string[]): Promise<boolean> => {
  try {
    console.log('[sendChatMessage] Enviando mensaje con emojis:', emojis);
    
    const user = await getCurrentUser();
    console.log('[sendChatMessage] Usuario obtenido:', user ? `${user.username} (${user.id})` : 'No hay usuario');
    
    const messageData = {
      emojis,
      timestamp: serverTimestamp(),
      userId: user?.id || 'anonymous',
      username: user?.username || 'Anonymous'
    };
    
    console.log('[sendChatMessage] Datos del mensaje a enviar:', messageData);
    
    const docRef = await addDoc(collection(db, CHAT_COLLECTION), messageData);
    console.log('[sendChatMessage] Mensaje enviado exitosamente con ID:', docRef.id);
    
    return true;
  } catch (error) {
    console.error('[sendChatMessage] Error sending chat message:', error);
    return false;
  }
};

// Suscribirse a los mensajes del chat
export const subscribeToChatMessages = (
  callback: (messages: ChatMessage[]) => void
) => {
  console.log('[subscribeToChatMessages] Configurando suscripción a mensajes del chat');
  
  const messagesQuery = query(
    collection(db, CHAT_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(MESSAGE_LIMIT)
  );
  
  return onSnapshot(messagesQuery, (snapshot) => {
    try {
      console.log(`[subscribeToChatMessages] Snapshot recibido con ${snapshot.docs.length} documentos`);
      
      if (snapshot.docChanges().length > 0) {
        console.log(`[subscribeToChatMessages] ${snapshot.docChanges().length} cambios detectados`);
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            console.log(`[subscribeToChatMessages] Mensaje añadido: ${change.doc.id}`);
          }
        });
      }
      
      const messages = snapshot.docs.map(mapFirestoreMessage);
      console.log(`[subscribeToChatMessages] Enviando ${messages.length} mensajes al callback`);
      
      callback(messages);
    } catch (error) {
      console.error('[subscribeToChatMessages] Error procesando snapshot:', error);
      callback([]);
    }
  }, (error) => {
    console.error('[subscribeToChatMessages] Error en suscripción:', error);
    callback([]);
  });
}; 