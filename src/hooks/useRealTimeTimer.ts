import { useState, useEffect, useRef } from 'react';
import { subscribeToGameState } from '../firebase/gameServer';

export function useRealTimeTimer(onTimeEnd: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(86400); // 24 horas en segundos
  const timerRef = useRef<NodeJS.Timeout>();
  const lastDayRef = useRef<number>(-1);
  const processingRef = useRef<boolean>(false);
  const lastProcessedTimeRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  const syncRef = useRef<boolean>(false);

  useEffect(() => {
    console.log('[useRealTimeTimer] Inicializando temporizador en tiempo real');
    
    // Suscribirse a los cambios de estado del juego desde Firebase
    const unsubscribe = subscribeToGameState((nextDrawTime, winningNumbers) => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextDrawTime - now) / 1000));
      
      console.log(`[useRealTimeTimer] Firebase sync - nextDrawTime: ${new Date(nextDrawTime).toLocaleString()}, remaining: ${remaining}s`);
      
      // Sincronización inicial - ajustar el timer local con el de Firebase
      if (!syncRef.current) {
        syncRef.current = true;
        console.log(`[useRealTimeTimer] Sincronización inicial - ajustando timer a ${remaining}s`);
      }
      
      // Actualizar el tiempo restante con los datos de Firebase
      setTimeRemaining(remaining);
      
      // Detectar cuando el sorteo ha sido completado (nuevo nextDrawTime)
      if (nextDrawTime !== lastDrawTimeRef.current) {
        lastDrawTimeRef.current = nextDrawTime;
        
        // Si el tiempo restante es muy alto (cerca de 24 horas), significa que hubo un nuevo sorteo
        if (remaining > 86000) { // Más de 23.8 horas = nuevo sorteo
          const currentDay = new Date().getDate();
          
          if (currentDay !== lastDayRef.current && !processingRef.current) {
            lastDayRef.current = currentDay;
            processingRef.current = true;
            
            console.log(`[useRealTimeTimer] [${new Date().toLocaleTimeString()}] Nuevo sorteo detectado, notificando fin de temporizador anterior`);
            
            // Pequeño retraso para evitar múltiples llamadas
            setTimeout(() => {
              console.log(`[useRealTimeTimer] [${new Date().toLocaleTimeString()}] Ejecutando onTimeEnd()`);
              onTimeEnd();
              processingRef.current = false;
            }, 1000);
          }
        }
      }
    });
    
    // Actualizar el tiempo restante cada segundo solo para UI suave
    // El tiempo real viene de Firebase
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        // Solo decrementar si no estamos cerca de la sincronización de Firebase
        if (prev > 1) {
          return prev - 1;
        }
        return prev; // Mantener en 0 o 1 hasta que Firebase actualice
      });
    }, 1000);

    return () => {
      console.log('[useRealTimeTimer] Limpiando suscripción y temporizador');
      unsubscribe();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onTimeEnd]);

  return timeRemaining;
}