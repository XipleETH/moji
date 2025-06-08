import { useState, useEffect } from 'react';
import { PrizePool } from '../types';
import { subscribeToPrizePool, getPoolStatistics, distributePrizePool } from '../firebase/prizePools';
import { getCurrentGameDaySaoPaulo, getTimeUntilNextDrawSaoPaulo } from '../utils/timezone';

export interface PrizePoolStats {
  pool: PrizePool | null;
  totalParticipants: number;
  totalTicketsSold: number;
  averageTokensPerParticipant: number;
  timeUntilDistribution: number | null;
  canDistribute: boolean;
  isLoading: boolean;
  error: string | null;
}

export const usePrizePool = () => {
  const [stats, setStats] = useState<PrizePoolStats>({
    pool: null,
    totalParticipants: 0,
    totalTicketsSold: 0,
    averageTokensPerParticipant: 0,
    timeUntilDistribution: null,
    canDistribute: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    console.log('[usePrizePool] Iniciando suscripción a prize pool');
    
    // Suscribirse a la pool del día actual
    const unsubscribePool = subscribeToPrizePool(async (pool) => {
      if (pool) {
        try {
          // Obtener estadísticas extendidas
          const poolStats = await getPoolStatistics(pool.gameDay);
          
          if (poolStats) {
            // Calcular tiempo hasta distribución (5 minutos antes del sorteo)
            const timeUntilDrawSeconds = getTimeUntilNextDrawSaoPaulo(); // En segundos
            const timeUntilDistributionMs = timeUntilDrawSeconds > 5 * 60 ? (timeUntilDrawSeconds - 5 * 60) * 1000 : null;
            
            // Puede distribuir si faltan menos de 5 minutos y aún no se ha distribuido
            const canDistribute = timeUntilDrawSeconds <= 5 * 60 && !pool.poolsDistributed;
            
                          setStats({
                pool,
                totalParticipants: poolStats.totalParticipants,
                totalTicketsSold: poolStats.totalTicketsSold,
                averageTokensPerParticipant: poolStats.averageTokensPerParticipant,
                timeUntilDistribution: timeUntilDistributionMs,
                canDistribute,
                isLoading: false,
                error: null
              });
          } else {
            // Si no hay stats pero sí hay pool, usar valores básicos
            setStats(prev => ({
              ...prev,
              pool,
              isLoading: false,
              error: null
            }));
          }
        } catch (error) {
          console.error('[usePrizePool] Error obteniendo estadísticas:', error);
          setStats(prev => ({
            ...prev,
            pool,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
          }));
        }
      } else {
        setStats(prev => ({
          ...prev,
          pool: null,
          isLoading: false,
          error: 'No se pudo cargar la pool de premios'
        }));
      }
    });

    // Actualizar tiempo hasta distribución cada minuto
    const updateTimer = setInterval(() => {
      const timeUntilDrawSeconds = getTimeUntilNextDrawSaoPaulo(); // En segundos
      const timeUntilDistributionMs = timeUntilDrawSeconds > 5 * 60 ? (timeUntilDrawSeconds - 5 * 60) * 1000 : null;
      const canDistribute = timeUntilDrawSeconds <= 5 * 60 && stats.pool && !stats.pool.poolsDistributed;
      
      setStats(prev => ({
        ...prev,
        timeUntilDistribution: timeUntilDistributionMs,
        canDistribute: canDistribute || false
      }));
    }, 60000); // Cada minuto

    return () => {
      unsubscribePool();
      clearInterval(updateTimer);
    };
  }, []);

  // Función para forzar distribución manual (solo para testing/administración)
  const triggerDistribution = async (): Promise<boolean> => {
    if (!stats.pool || stats.pool.poolsDistributed) {
      console.warn('[usePrizePool] No se puede distribuir: pool no existe o ya está distribuida');
      return false;
    }

    try {
      const success = await distributePrizePool(stats.pool.gameDay);
      if (success) {
        console.log('[usePrizePool] Distribución de pool ejecutada exitosamente');
      }
      return success;
    } catch (error) {
      console.error('[usePrizePool] Error en distribución manual:', error);
      setStats(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error en distribución'
      }));
      return false;
    }
  };

  // Función para refrescar estadísticas
  const refreshStats = async () => {
    if (!stats.pool) return;

    try {
      setStats(prev => ({ ...prev, isLoading: true }));
      const poolStats = await getPoolStatistics(stats.pool.gameDay);
      
      if (poolStats) {
        setStats(prev => ({
          ...prev,
          totalParticipants: poolStats.totalParticipants,
          totalTicketsSold: poolStats.totalTicketsSold,
          averageTokensPerParticipant: poolStats.averageTokensPerParticipant,
          isLoading: false,
          error: null
        }));
      }
    } catch (error) {
      console.error('[usePrizePool] Error refrescando estadísticas:', error);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error refrescando estadísticas'
      }));
    }
  };

  return {
    ...stats,
    triggerDistribution,
    refreshStats
  };
};

// Función helper para formatear tiempo hasta distribución
export const formatTimeUntilDistribution = (milliseconds: number | null): string => {
  if (!milliseconds || milliseconds <= 0) {
    return 'Pool cerrada para distribución';
  }

  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m hasta distribución`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s hasta distribución`;
  } else {
    return `${seconds}s hasta distribución`;
  }
};

// Función helper para formatear porcentajes de distribución
export const formatPoolPercentage = (poolType: keyof PrizePool['pools']): string => {
  const percentages = {
    firstPrize: '64%',
    firstPrizeReserve: '16%',
    secondPrize: '8%',
    secondPrizeReserve: '2%',
    thirdPrize: '4%',
    thirdPrizeReserve: '1%',
    development: '5%'
  };
  
  return percentages[poolType] || '0%';
};

// Función helper para obtener nombres amigables de pools
export const getPoolDisplayName = (poolType: keyof PrizePool['pools']): string => {
  const names = {
    firstPrize: 'Primer Premio',
    firstPrizeReserve: 'Reserva 1er Premio',
    secondPrize: 'Segundo Premio',
    secondPrizeReserve: 'Reserva 2do Premio',
    thirdPrize: 'Tercer Premio',
    thirdPrizeReserve: 'Reserva 3er Premio',
    development: 'Desarrollo'
  };
  
  return names[poolType] || poolType;
}; 