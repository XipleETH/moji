import { useState, useEffect, useRef } from 'react';
import { useContractTimer } from './useContractTimer';
import { getTimeUntilNextDrawSaoPaulo } from '../utils/timezone';

interface HybridTimerData {
  timeRemaining: number;
  isContractConnected: boolean;
  currentGameDay?: number;
  nextDrawTime?: number;
  error?: string | null;
  timerSource: 'contract' | 'local';
}

export function useHybridTimer(onTimeEnd: () => void): HybridTimerData {
  const [localTime, setLocalTime] = useState(() => getTimeUntilNextDrawSaoPaulo());
  const [timerSource, setTimerSource] = useState<'contract' | 'local'>('local');
  const localTimerRef = useRef<NodeJS.Timeout>();
  const lastLocalUpdateRef = useRef<number>(Date.now());

  // Intentar usar el timer del contrato
  const contractTimer = useContractTimer(onTimeEnd);

  // Timer local como fallback
  useEffect(() => {
    localTimerRef.current = setInterval(() => {
      const newTime = getTimeUntilNextDrawSaoPaulo();
      const now = Date.now();
      
      // Solo actualizar si ha pasado al menos 800ms desde la última actualización
      // Esto evita actualizaciones demasiado frecuentes
      if (now - lastLocalUpdateRef.current >= 800) {
        setLocalTime(prev => {
          // Si el tiempo calculado es muy diferente al anterior, usar el cálculo fresco
          if (Math.abs(newTime - prev) > 2) {
            lastLocalUpdateRef.current = now;
            return newTime;
          }
          
          // De lo contrario, solo decrementar
          const decremented = Math.max(0, prev - 1);
          if (decremented % 60 === 0) { // Sincronizar cada minuto
            lastLocalUpdateRef.current = now;
            return newTime;
          }
          
          return decremented;
        });
      }
    }, 1000);

    return () => {
      if (localTimerRef.current) {
        clearInterval(localTimerRef.current);
      }
    };
  }, []);

  // Determinar qué timer usar
  const shouldUseContract = contractTimer.isConnected && !contractTimer.error;
  
  useEffect(() => {
    const newSource = shouldUseContract ? 'contract' : 'local';
    if (newSource !== timerSource) {
      setTimerSource(newSource);
      console.log(`[useHybridTimer] Switching timer source to: ${newSource}`);
    }
  }, [shouldUseContract, timerSource]);

  // Decidir qué tiempo devolver
  const getTimeRemaining = (): number => {
    if (shouldUseContract) {
      return contractTimer.timeRemaining;
    }
    return localTime;
  };

  // Log para debugging
  useEffect(() => {
    const remaining = getTimeRemaining();
    console.log(`[useHybridTimer] Source: ${timerSource}, Time: ${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}m ${remaining % 60}s, Contract: ${contractTimer.isConnected ? 'Connected' : 'Disconnected'}`);
  }, [timerSource, contractTimer.timeRemaining, localTime, contractTimer.isConnected]);

  return {
    timeRemaining: getTimeRemaining(),
    isContractConnected: contractTimer.isConnected,
    currentGameDay: contractTimer.currentGameDay,
    nextDrawTime: contractTimer.nextDrawTime,
    error: contractTimer.error,
    timerSource
  };
} 