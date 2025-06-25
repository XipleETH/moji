import { getDailyPrizePool } from '../firebase/prizePools';
import { getCurrentGameDaySaoPaulo } from './timezone';

// Función para inicializar la pool del día actual
export const initializeDailyPool = async () => {
  try {
    const currentDay = getCurrentGameDaySaoPaulo();
    console.log(`[initializePools] Inicializando pool para el día: ${currentDay}`);
    
    const pool = await getDailyPrizePool(currentDay);
    console.log(`[initializePools] Pool inicializada exitosamente:`, pool);
    
    return pool;
  } catch (error) {
    console.error('[initializePools] Error inicializando pool:', error);
    throw error;
  }
};

// Función para verificar el estado de las pools
export const checkPoolsHealth = async () => {
  try {
    const currentDay = getCurrentGameDaySaoPaulo();
    
    // Verificar pool actual
    const pool = await getDailyPrizePool(currentDay);
    
    const health = {
      poolExists: !!pool,
      gameDay: currentDay,
      totalTokens: pool?.totalTokensCollected || 0,
      isDistributed: pool?.poolsDistributed || false,
      lastUpdated: pool?.lastUpdated ? new Date(pool.lastUpdated).toISOString() : 'N/A',
      status: 'healthy'
    };
    
    console.log('[checkPoolsHealth] Pool health check:', health);
    return health;
  } catch (error) {
    console.error('[checkPoolsHealth] Error checking pools health:', error);
    return {
      poolExists: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Hacer funciones disponibles globalmente en desarrollo
if (import.meta.env.DEV) {
  (window as any).initializeDailyPool = initializeDailyPool;
  (window as any).checkPoolsHealth = checkPoolsHealth;
} 