import { useState, useEffect, useRef } from 'react';
import { subscribeToGameState } from '../firebase/gameServer';
import { getTimeUntilNextDrawSaoPaulo, getCurrentGameDaySaoPaulo, formatTimeSaoPaulo, isInProblematicResetWindow, getUserTimezone } from '../utils/timezone';
import { distributePrizePool, getDailyPrizePool } from '../firebase/prizePools';

export function useRealTimeTimer(onTimeEnd: () => void) {
  // Inicializar con el tiempo real hasta medianoche de São Paulo
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeUntilNextDrawSaoPaulo());
  const timerRef = useRef<NodeJS.Timeout>();
  const lastDayRef = useRef<string>('');
  const processingRef = useRef<boolean>(false);
  const lastProcessedTimeRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  const syncRef = useRef<boolean>(false);
  const fallbackTimerRef = useRef<NodeJS.Timeout>();
  const poolDistributionRef = useRef<boolean>(false);
  const poolCheckTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const userTimezone = getUserTimezone();
    console.log('[useRealTimeTimer] Inicializando temporizador sincronizado con São Paulo');
    console.log('[useRealTimeTimer] Usuario en timezone:', userTimezone);
    
    // Función para calcular tiempo usando timezone de São Paulo
    const updateSaoPauloTime = () => {
      // Verificar si estamos en una ventana problemática antes de proceder
      if (isInProblematicResetWindow()) {
        console.log('[useRealTimeTimer] [PROTECCIÓN] En ventana problemática - evitando cambios de día');
        return timeRemaining; // Mantener el tiempo actual sin cambios
      }
      
      const spTime = getTimeUntilNextDrawSaoPaulo();
      const currentGameDay = getCurrentGameDaySaoPaulo();
      
      // Log detallado del timezone
      console.log(`[useRealTimeTimer] [SP Sync] Game Day: ${currentGameDay}, Time until midnight: ${Math.floor(spTime / 3600)}h ${Math.floor((spTime % 3600) / 60)}m ${spTime % 60}s`);
      
      setTimeRemaining(spTime);
      
      // Detectar cambio de día en São Paulo con protección adicional
      if (currentGameDay !== lastDayRef.current && lastDayRef.current !== '') {
        if (!processingRef.current && !isInProblematicResetWindow()) {
          processingRef.current = true;
          console.log(`[useRealTimeTimer] [SP Sync] Cambio de día detectado: ${lastDayRef.current} → ${currentGameDay}`);
          
          setTimeout(() => {
            console.log(`[useRealTimeTimer] [SP Sync] Ejecutando onTimeEnd por cambio de día`);
            onTimeEnd();
            processingRef.current = false;
          }, 1000);
        } else if (isInProblematicResetWindow()) {
          console.log(`[useRealTimeTimer] [PROTECCIÓN] Cambio de día detectado pero bloqueado por ventana problemática`);
        }
      }
      
      lastDayRef.current = currentGameDay;
      return spTime;
    };

    // Sincronización inicial
    const initialTime = updateSaoPauloTime();
    console.log(`[useRealTimeTimer] [SP Sync] Tiempo inicial calculado: ${initialTime}s`);
    
    // Suscribirse a los cambios de estado del juego desde Firebase
    const unsubscribe = subscribeToGameState((nextDrawTime, winningNumbers) => {
      const now = Date.now();
      const firebaseRemaining = Math.max(0, Math.floor((nextDrawTime - now) / 1000));
      const saoPauloRemaining = getTimeUntilNextDrawSaoPaulo();
      
      console.log(`[useRealTimeTimer] [Firebase] nextDrawTime: ${formatTimeSaoPaulo(new Date(nextDrawTime))}`);
      console.log(`[useRealTimeTimer] [Firebase] remaining: ${firebaseRemaining}s vs [SP Calc] ${saoPauloRemaining}s`);
      
      // Protección adicional contra resets durante ventana problemática
      if (isInProblematicResetWindow()) {
        console.log(`[useRealTimeTimer] [PROTECCIÓN] Ignorando update de Firebase durante ventana problemática`);
        return;
      }
      
      // Usar el tiempo de São Paulo como fuente de verdad, pero sincronizar con Firebase
      // Solo ajustar si hay una diferencia significativa (más de 10 segundos)
      const timeDifference = Math.abs(firebaseRemaining - saoPauloRemaining);
      
      if (timeDifference > 10) {
        console.log(`[useRealTimeTimer] [Sync] Diferencia significativa detectada: ${timeDifference}s, usando Firebase`);
        setTimeRemaining(firebaseRemaining);
      } else {
        // Usar el cálculo de São Paulo para mayor precisión
        setTimeRemaining(saoPauloRemaining);
      }
      
      // Detectar cuando el sorteo ha sido completado (nuevo nextDrawTime)
      if (nextDrawTime !== lastDrawTimeRef.current) {
        lastDrawTimeRef.current = nextDrawTime;
        
        // Si el tiempo restante es muy alto (cerca de 24 horas), significa que hubo un nuevo sorteo
        if (firebaseRemaining > 86000) { // Más de 23.8 horas = nuevo sorteo
          const currentGameDay = getCurrentGameDaySaoPaulo();
          
          if (currentGameDay !== lastDayRef.current && !processingRef.current && !isInProblematicResetWindow()) {
            lastDayRef.current = currentGameDay;
            processingRef.current = true;
            
            console.log(`[useRealTimeTimer] [Firebase] Nuevo sorteo detectado, notificando fin de temporizador anterior`);
            
            setTimeout(() => {
              console.log(`[useRealTimeTimer] [Firebase] Ejecutando onTimeEnd()`);
              onTimeEnd();
              processingRef.current = false;
            }, 1000);
          } else if (isInProblematicResetWindow()) {
            console.log(`[useRealTimeTimer] [PROTECCIÓN] Nuevo sorteo detectado pero bloqueado por ventana problemática`);
          }
        }
      }
      
      if (!syncRef.current) {
        syncRef.current = true;
        console.log(`[useRealTimeTimer] [Firebase] Sincronización inicial completada`);
      }
    });
    
    // Temporizador principal - actualizar cada segundo usando cálculo de São Paulo
    timerRef.current = setInterval(() => {
      // Protección durante ventana problemática
      if (isInProblematicResetWindow()) {
        console.log(`[useRealTimeTimer] [PROTECCIÓN] Timer pausado durante ventana problemática`);
        return;
      }
      
      const currentSaoPauloTime = getTimeUntilNextDrawSaoPaulo();
      
      setTimeRemaining(prev => {
        // Usar el cálculo de São Paulo para mantener precisión
        if (Math.abs(currentSaoPauloTime - prev) > 2) {
          // Si hay diferencia significativa, usar el cálculo fresco
          console.log(`[useRealTimeTimer] [Local] Ajustando tiempo: ${prev}s → ${currentSaoPauloTime}s`);
          return currentSaoPauloTime;
        }
        
        // Solo decrementar si no estamos cerca de 0
        if (prev > 1) {
          return prev - 1;
        }
        return currentSaoPauloTime; // Usar cálculo fresco cerca de 0
      });
    }, 1000);

    // Temporizador de respaldo - recalcular cada 30 segundos para mayor precisión
    fallbackTimerRef.current = setInterval(() => {
      // Protección durante ventana problemática
      if (isInProblematicResetWindow()) {
        console.log(`[useRealTimeTimer] [PROTECCIÓN] Fallback timer pausado durante ventana problemática`);
        return;
      }
      
      const preciseSaoPauloTime = getTimeUntilNextDrawSaoPaulo();
      console.log(`[useRealTimeTimer] [Fallback] Recálculo preciso: ${preciseSaoPauloTime}s`);
      
      setTimeRemaining(prev => {
        // Si hay una gran diferencia, usar el cálculo preciso
        if (Math.abs(preciseSaoPauloTime - prev) > 60) {
          console.log(`[useRealTimeTimer] [Fallback] Gran diferencia detectada: ${prev}s → ${preciseSaoPauloTime}s`);
          return preciseSaoPauloTime;
        }
        
        // Si el timer llegó a 0 pero el cálculo preciso dice que hay tiempo, reiniciar
        if (prev <= 0 && preciseSaoPauloTime > 3600) {
          console.log(`[useRealTimeTimer] [Fallback] Timer reiniciado: ${prev}s → ${preciseSaoPauloTime}s`);
          return preciseSaoPauloTime;
        }
        
        return preciseSaoPauloTime;
      });
    }, 30000);

    // Temporizador para distribución automática de pools (cada minuto)
    poolCheckTimerRef.current = setInterval(async () => {
      // Protección adicional: no distribuir durante ventana problemática
      if (isInProblematicResetWindow()) {
        console.log(`[useRealTimeTimer] [PROTECCIÓN] Pool distribution pausada durante ventana problemática`);
        return;
      }
      
      const timeUntilDraw = getTimeUntilNextDrawSaoPaulo();
      const currentGameDay = getCurrentGameDaySaoPaulo();
      
      // Distribuir 5 minutos antes del sorteo (300 segundos)
      if (timeUntilDraw <= 300 && timeUntilDraw > 290 && !poolDistributionRef.current) {
        try {
          console.log(`[useRealTimeTimer] [Pool] Iniciando distribución automática de pool para el día ${currentGameDay}`);
          poolDistributionRef.current = true;
          
          // Verificar si la pool existe y aún no está distribuida
          const currentPool = await getDailyPrizePool(currentGameDay);
          
          if (currentPool && !currentPool.poolsDistributed && currentPool.totalTokensCollected > 0) {
            const distributionSuccess = await distributePrizePool(currentGameDay);
            
            if (distributionSuccess) {
              console.log(`[useRealTimeTimer] [Pool] ✅ Pool distribuida exitosamente: ${currentPool.totalTokensCollected} tokens`);
            } else {
              console.error(`[useRealTimeTimer] [Pool] ❌ Error distribuyendo pool del día ${currentGameDay}`);
            }
          } else {
            console.log(`[useRealTimeTimer] [Pool] ℹ️ Pool del día ${currentGameDay} ya distribuida o sin tokens`);
          }
        } catch (error) {
          console.error(`[useRealTimeTimer] [Pool] Error en distribución automática:`, error);
        }
      }
      
      // Resetear flag de distribución cuando empieza un nuevo día
      if (timeUntilDraw > 23 * 60 * 60) { // Más de 23 horas = nuevo día
        if (poolDistributionRef.current) {
          console.log(`[useRealTimeTimer] [Pool] Nuevo día detectado, reseteando flag de distribución`);
          poolDistributionRef.current = false;
        }
      }
    }, 60000); // Cada minuto

    return () => {
      console.log('[useRealTimeTimer] Limpiando suscripción y temporizadores');
      unsubscribe();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
      }
      if (poolCheckTimerRef.current) {
        clearInterval(poolCheckTimerRef.current);
      }
    };
  }, [onTimeEnd]);

  return timeRemaining;
}