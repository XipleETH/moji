import { useState, useEffect, useRef } from 'react';
import { subscribeToGameState } from '../firebase/gameServer';

export function useRealTimeTimer(onTimeEnd: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(86400); // 24 horas en segundos
  const timerRef = useRef<NodeJS.Timeout>();
  const lastDayRef = useRef<number>(-1);
  const processingRef = useRef<boolean>(false);
  const lastProcessedTimeRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);

  useEffect(() => {
    console.log('[useRealTimeTimer] Inicializando temporizador en tiempo real');
    
    // Suscribirse a los cambios de estado del juego desde Firebase
    const unsubscribe = subscribeToGameState((nextDrawTime, winningNumbers) => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextDrawTime - now) / 1000));
      
      // Actualizar el tiempo restante solo si es diferente
      if (timeRemaining !== remaining) {
        setTimeRemaining(remaining);
      }
      
      // Solo procesar eventos de fin de temporizador si el nextDrawTime ha cambiado
      // Esto evita múltiples procesamiento del mismo evento
      if (nextDrawTime !== lastDrawTimeRef.current) {
        lastDrawTimeRef.current = nextDrawTime;
        
        // Detectar cambio de día para notificar al componente padre
        const currentDay = new Date().getDate();
        const currentTime = now;
        
        // Solo procesar si:
        // 1. El tiempo restante es 0
        // 2. El día actual es diferente al último procesado
        // 3. No estamos ya procesando un evento
        // 4. Han pasado al menos 30 segundos desde el último procesamiento
        if (
          remaining === 0 && 
          currentDay !== lastDayRef.current && 
          !processingRef.current &&
          (currentTime - lastProcessedTimeRef.current) > 30000
        ) {
          lastDayRef.current = currentDay;
          processingRef.current = true;
          lastProcessedTimeRef.current = currentTime;
          
          console.log(`[useRealTimeTimer] [${new Date().toLocaleTimeString()}] Detectado cambio de día, notificando fin de temporizador`);
          
          // Añadir un pequeño retraso para evitar múltiples llamadas
          setTimeout(() => {
            console.log(`[useRealTimeTimer] [${new Date().toLocaleTimeString()}] Ejecutando onTimeEnd()`);
            onTimeEnd();
            processingRef.current = false;
          }, 500);
        }
      }
    });
    
    // Actualizar el tiempo restante cada segundo para mantener la UI actualizada
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev > 0) {
          return prev - 1;
        }
        return 0;
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