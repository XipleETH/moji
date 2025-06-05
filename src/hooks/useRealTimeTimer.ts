import { useState, useEffect, useRef } from 'react';

export function useRealTimeTimer(onTimeEnd: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const lastProcessedRef = useRef<boolean>(false);

  useEffect(() => {
    console.log('[useRealTimeTimer] Inicializando temporizador simple');
    
    // Simple countdown timer that decrements every second
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev > 0) {
          return prev - 1;
        } else if (prev === 0 && !lastProcessedRef.current) {
          // Only call onTimeEnd once when reaching 0
          lastProcessedRef.current = true;
          console.log('[useRealTimeTimer] Tiempo agotado, ejecutando onTimeEnd()');
          setTimeout(() => {
            onTimeEnd();
            lastProcessedRef.current = false;
          }, 100);
        }
        return 0;
      });
    }, 1000);

    return () => {
      console.log('[useRealTimeTimer] Limpiando temporizador');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onTimeEnd]);

  // Method to update timer externally (from contract data)
  const updateTimer = (newTime: number) => {
    setTimeRemaining(newTime);
    lastProcessedRef.current = false;
  };

  return { timeRemaining, updateTimer };
}