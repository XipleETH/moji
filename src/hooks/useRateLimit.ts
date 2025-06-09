import { useState, useCallback, useRef } from 'react';

interface RateLimitOptions {
  maxRequests: number;  // Máximo número de requests
  windowMs: number;     // Ventana de tiempo en ms
  cooldownMs: number;   // Tiempo de enfriamiento entre requests
}

export function useRateLimit(options: RateLimitOptions) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const requestTimestamps = useRef<number[]>([]);
  const lastRequestTime = useRef<number>(0);

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    
    // Verificar cooldown entre requests individuales
    if (now - lastRequestTime.current < options.cooldownMs) {
      const remaining = options.cooldownMs - (now - lastRequestTime.current);
      setRemainingTime(Math.ceil(remaining / 1000));
      setIsBlocked(true);
      
      // Auto-desbloquear cuando termine el cooldown
      setTimeout(() => {
        setIsBlocked(false);
        setRemainingTime(0);
      }, remaining);
      
      return false;
    }

    // Limpiar timestamps antiguos
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => now - timestamp < options.windowMs
    );

    // Verificar si se ha excedido el límite
    if (requestTimestamps.current.length >= options.maxRequests) {
      const oldestRequest = requestTimestamps.current[0];
      const remaining = options.windowMs - (now - oldestRequest);
      
      setRemainingTime(Math.ceil(remaining / 1000));
      setIsBlocked(true);
      
      // Auto-desbloquear cuando expire la ventana
      setTimeout(() => {
        setIsBlocked(false);
        setRemainingTime(0);
      }, remaining);
      
      return false;
    }

    // Permitir request
    requestTimestamps.current.push(now);
    lastRequestTime.current = now;
    return true;
  }, [options]);

  const reset = useCallback(() => {
    requestTimestamps.current = [];
    lastRequestTime.current = 0;
    setIsBlocked(false);
    setRemainingTime(0);
  }, []);

  return {
    checkRateLimit,
    isBlocked,
    remainingTime,
    reset
  };
} 