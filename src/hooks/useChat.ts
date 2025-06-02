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
    console.log('[useChat] Intentando enviar mensaje con emojis:', emojis);
    
    // Validar entrada
    if (!emojis || emojis.length === 0) {
      console.warn('[useChat] Intento de enviar mensaje vacío');
      setError('No se puede enviar un mensaje vacío');
      return false;
    }
    
    // Evitar envíos duplicados si ya está cargando
    if (isLoading) {
      console.warn('[useChat] Intento de envío mientras ya está en progreso');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await sendChatMessage(emojis);
      
      if (!isMountedRef.current) {
        console.log('[useChat] Componente desmontado durante envío');
        return false;
      }
      
      if (success) {
        console.log('[useChat] Mensaje enviado exitosamente');
        setError(null);
        return true;
      } else {
        console.error('[useChat] Error enviando mensaje');
        setError('Error enviando el mensaje. Inténtalo de nuevo.');
        return false;
      }
    } catch (error) {
      console.error('[useChat] Error en sendMessage:', error);
      
      if (isMountedRef.current) {
        setError('Error enviando el mensaje. Verifica tu conexión.');
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