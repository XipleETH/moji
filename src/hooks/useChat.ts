import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '../types';
import { sendChatMessage, subscribeToChatMessages } from '../firebase/chat';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    console.log('[useChat] Inicializando hook de chat...');
    isMountedRef.current = true;
    
    // Suscribirse a los mensajes del chat en tiempo real
    const unsubscribe = subscribeToChatMessages((newMessages) => {
      console.log('[useChat] Nuevos mensajes recibidos:', newMessages.length);
      
      // Solo actualizar si el componente aún está montado
      if (isMountedRef.current) {
        setMessages(newMessages);
        setError(null); // Limpiar errores si recibimos mensajes exitosamente
      }
    });

    return () => {
      console.log('[useChat] Limpiando suscripción de chat');
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const sendMessage = useCallback(async (emojis: string[]) => {
    console.log('[useChat] Attempting to send message with emojis:', emojis);
    
    // Validate input
    if (!emojis || emojis.length === 0) {
      console.warn('[useChat] Attempt to send empty message');
      setError('Cannot send an empty message');
      return false;
    }
    
    // Prevent duplicate sends if already loading
    if (isLoading) {
      console.warn('[useChat] Attempt to send while already in progress');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await sendChatMessage(emojis);
      
      if (!isMountedRef.current) {
        console.log('[useChat] Component unmounted during send');
        return false;
      }
      
      if (success) {
        console.log('[useChat] Message sent successfully');
        setError(null);
        return true;
      } else {
        console.error('[useChat] Error sending message');
        setError('Error sending message. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('[useChat] Error in sendMessage:', error);
      
      if (isMountedRef.current) {
        setError('Error sending message. Check your connection.');
      }
      
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  return { 
    messages, 
    sendMessage, 
    isLoading, 
    error,
    clearError: () => setError(null)
  };
}