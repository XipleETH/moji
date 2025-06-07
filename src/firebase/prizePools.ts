import { db } from './config';
import { 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { PrizePool, PrizeDistribution, TicketPurchase, PoolTransaction } from '../types';
import { getCurrentGameDaySaoPaulo } from '../utils/timezone';

// Colecciones
const PRIZE_POOLS_COLLECTION = 'prize_pools';
const PRIZE_DISTRIBUTIONS_COLLECTION = 'prize_distributions';
const TICKET_PURCHASES_COLLECTION = 'ticket_purchases';
const POOL_TRANSACTIONS_COLLECTION = 'pool_transactions';

// Porcentajes de distribución de la pool
export const POOL_DISTRIBUTION_PERCENTAGES = {
  firstPrize: 0.64,        // 64%
  firstPrizeReserve: 0.16, // 16%
  secondPrize: 0.08,       // 8%
  secondPrizeReserve: 0.02,// 2%
  thirdPrize: 0.04,        // 4%
  thirdPrizeReserve: 0.01, // 1%
  development: 0.05        // 5%
};

// Obtener o crear la pool de premios del día
export const getDailyPrizePool = async (gameDay?: string): Promise<PrizePool> => {
  const currentDay = gameDay || getCurrentGameDaySaoPaulo();
  const poolRef = doc(db, PRIZE_POOLS_COLLECTION, currentDay);
  
  try {
    const poolDoc = await getDoc(poolRef);
    
    if (poolDoc.exists()) {
      const data = poolDoc.data();
      return {
        gameDay: currentDay,
        totalTokensCollected: data.totalTokensCollected || 0,
        poolsDistributed: data.poolsDistributed || false,
        distributionTimestamp: data.distributionTimestamp?.toMillis(),
        pools: {
          firstPrize: data.pools?.firstPrize || 0,
          firstPrizeReserve: data.pools?.firstPrizeReserve || 0,
          secondPrize: data.pools?.secondPrize || 0,
          secondPrizeReserve: data.pools?.secondPrizeReserve || 0,
          thirdPrize: data.pools?.thirdPrize || 0,
          thirdPrizeReserve: data.pools?.thirdPrizeReserve || 0,
          development: data.pools?.development || 0
        },
        reserves: {
          firstPrizeActivated: data.reserves?.firstPrizeActivated || false,
          secondPrizeActivated: data.reserves?.secondPrizeActivated || false,
          thirdPrizeActivated: data.reserves?.thirdPrizeActivated || false
        },
        lastUpdated: data.lastUpdated?.toMillis() || Date.now()
      };
    } else {
      // Crear nueva pool del día
      const newPool: PrizePool = {
        gameDay: currentDay,
        totalTokensCollected: 0,
        poolsDistributed: false,
        pools: {
          firstPrize: 0,
          firstPrizeReserve: 0,
          secondPrize: 0,
          secondPrizeReserve: 0,
          thirdPrize: 0,
          thirdPrizeReserve: 0,
          development: 0
        },
        reserves: {
          firstPrizeActivated: false,
          secondPrizeActivated: false,
          thirdPrizeActivated: false
        },
        lastUpdated: Date.now()
      };
      
      await setDoc(poolRef, {
        ...newPool,
        lastUpdated: serverTimestamp()
      });
      
      console.log(`[getDailyPrizePool] Nueva pool creada para el día ${currentDay}`);
      return newPool;
    }
  } catch (error) {
    console.error('[getDailyPrizePool] Error obteniendo pool de premios:', error);
    throw error;
  }
};

// Agregar tokens a la pool cuando se compra un ticket
export const addTokensToPool = async (userId: string, walletAddress: string, tokensSpent: number, ticketId: string): Promise<boolean> => {
  const currentDay = getCurrentGameDaySaoPaulo();
  const poolRef = doc(db, PRIZE_POOLS_COLLECTION, currentDay);
  
  try {
    return await runTransaction(db, async (transaction) => {
      const poolDoc = await transaction.get(poolRef);
      
      let currentPool: PrizePool;
      if (poolDoc.exists()) {
        const data = poolDoc.data();
        currentPool = {
          gameDay: currentDay,
          totalTokensCollected: data.totalTokensCollected || 0,
          poolsDistributed: data.poolsDistributed || false,
          distributionTimestamp: data.distributionTimestamp?.toMillis(),
          pools: data.pools || {
            firstPrize: 0, firstPrizeReserve: 0, secondPrize: 0,
            secondPrizeReserve: 0, thirdPrize: 0, thirdPrizeReserve: 0, development: 0
          },
          reserves: data.reserves || {
            firstPrizeActivated: false, secondPrizeActivated: false, thirdPrizeActivated: false
          },
          lastUpdated: data.lastUpdated?.toMillis() || Date.now()
        };
      } else {
        currentPool = await getDailyPrizePool(currentDay);
      }
      
      // Verificar que la pool no esté cerrada (distribución ya realizada)
      if (currentPool.poolsDistributed) {
        console.log(`[addTokensToPool] Pool del día ${currentDay} ya está cerrada para nuevas compras`);
        return false;
      }
      
      // Actualizar pool con los nuevos tokens
      const updatedPool = {
        ...currentPool,
        totalTokensCollected: currentPool.totalTokensCollected + tokensSpent,
        lastUpdated: serverTimestamp()
      };
      
      transaction.set(poolRef, updatedPool);
      
      // Registrar la compra del ticket
      const purchaseRef = doc(collection(db, TICKET_PURCHASES_COLLECTION));
      const purchase: TicketPurchase = {
        id: purchaseRef.id,
        userId,
        walletAddress,
        gameDay: currentDay,
        tokensSpent,
        ticketId,
        timestamp: Date.now()
      };
      
      transaction.set(purchaseRef, {
        ...purchase,
        timestamp: serverTimestamp()
      });
      
      // Registrar transacción de la pool
      const transactionRef = doc(collection(db, POOL_TRANSACTIONS_COLLECTION));
      const poolTransaction: PoolTransaction = {
        id: transactionRef.id,
        gameDay: currentDay,
        type: 'ticket_purchase',
        amount: tokensSpent,
        toPool: 'main',
        description: `Ticket purchase by user ${userId}`,
        timestamp: Date.now(),
        metadata: { userId, ticketId, walletAddress }
      };
      
      transaction.set(transactionRef, {
        ...poolTransaction,
        timestamp: serverTimestamp()
      });
      
      console.log(`[addTokensToPool] ${tokensSpent} tokens agregados a la pool del día ${currentDay}. Total: ${updatedPool.totalTokensCollected}`);
      return true;
    });
  } catch (error) {
    console.error('[addTokensToPool] Error agregando tokens a la pool:', error);
    return false;
  }
};

// Distribuir la pool principal en pools específicas (10 minutos antes del sorteo)
export const distributePrizePool = async (gameDay?: string): Promise<boolean> => {
  const currentDay = gameDay || getCurrentGameDaySaoPaulo();
  const poolRef = doc(db, PRIZE_POOLS_COLLECTION, currentDay);
  
  try {
    return await runTransaction(db, async (transaction) => {
      const poolDoc = await transaction.get(poolRef);
      
      if (!poolDoc.exists()) {
        console.log(`[distributePrizePool] No existe pool para el día ${currentDay}`);
        return false;
      }
      
      const poolData = poolDoc.data();
      
      if (poolData.poolsDistributed) {
        console.log(`[distributePrizePool] Pool del día ${currentDay} ya está distribuida`);
        return true;
      }
      
      const totalTokens = poolData.totalTokensCollected || 0;
      
      if (totalTokens === 0) {
        console.log(`[distributePrizePool] No hay tokens para distribuir en el día ${currentDay}`);
        return true;
      }
      
      // Calcular distribución
      const distributedPools = {
        firstPrize: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.firstPrize),
        firstPrizeReserve: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.firstPrizeReserve),
        secondPrize: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.secondPrize),
        secondPrizeReserve: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.secondPrizeReserve),
        thirdPrize: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.thirdPrize),
        thirdPrizeReserve: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.thirdPrizeReserve),
        development: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.development)
      };
      
      // Actualizar pool con distribución
      const updatedPool = {
        ...poolData,
        pools: distributedPools,
        poolsDistributed: true,
        distributionTimestamp: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      
      transaction.update(poolRef, updatedPool);
      
      // Registrar transacciones de distribución
      for (const [poolType, amount] of Object.entries(distributedPools)) {
        if (amount > 0) {
          const transactionRef = doc(collection(db, POOL_TRANSACTIONS_COLLECTION));
          const poolTransaction: PoolTransaction = {
            id: transactionRef.id,
            gameDay: currentDay,
            type: 'pool_distribution',
            amount,
            fromPool: 'main',
            toPool: poolType,
            description: `Distribution to ${poolType} pool`,
            timestamp: Date.now(),
            metadata: { 
              totalTokens,
              percentage: POOL_DISTRIBUTION_PERCENTAGES[poolType as keyof typeof POOL_DISTRIBUTION_PERCENTAGES] || 0
            }
          };
          
          transaction.set(transactionRef, {
            ...poolTransaction,
            timestamp: serverTimestamp()
          });
        }
      }
      
      console.log(`[distributePrizePool] Pool distribuida para el día ${currentDay}:`, distributedPools);
      return true;
    });
  } catch (error) {
    console.error('[distributePrizePool] Error distribuyendo pool:', error);
    return false;
  }
};

// Distribuir premios a los ganadores
export const distributePrizesToWinners = async (
  gameDay: string,
  prizeType: 'first' | 'second' | 'third',
  winners: Array<{ userId: string; walletAddress: string; ticketId: string }>
): Promise<PrizeDistribution | null> => {
  
  if (winners.length === 0) {
    console.log(`[distributePrizesToWinners] No hay ganadores para ${prizeType} prize en ${gameDay}`);
    return null;
  }
  
  const poolRef = doc(db, PRIZE_POOLS_COLLECTION, gameDay);
  
  try {
    return await runTransaction(db, async (transaction) => {
      const poolDoc = await transaction.get(poolRef);
      
      if (!poolDoc.exists()) {
        throw new Error(`Pool no existe para el día ${gameDay}`);
      }
      
      const poolData = poolDoc.data();
      
      if (!poolData.poolsDistributed) {
        throw new Error(`Pool del día ${gameDay} aún no está distribuida`);
      }
      
      const prizePoolAmount = poolData.pools[prizeType] || 0;
      const reservePoolAmount = poolData.pools[`${prizeType}Reserve`] || 0;
      
      if (prizePoolAmount === 0) {
        console.log(`[distributePrizesToWinners] No hay tokens en la pool de ${prizeType} para el día ${gameDay}`);
        return null;
      }
      
      // Calcular tokens por ganador
      const tokensPerWinner = Math.floor(prizePoolAmount / winners.length);
      const totalDistributed = tokensPerWinner * winners.length;
      
      // Activar reserva si hay ganadores
      const reserveActivated = !poolData.reserves[`${prizeType}Activated`];
      let reserveTokensDistributed = 0;
      
      if (reserveActivated && reservePoolAmount > 0) {
        const reservePerWinner = Math.floor(reservePoolAmount / winners.length);
        reserveTokensDistributed = reservePerWinner * winners.length;
        
        // Marcar reserva como activada
        transaction.update(poolRef, {
          [`reserves.${prizeType}Activated`]: true,
          lastUpdated: serverTimestamp()
        });
      }
      
      // Crear distribución
      const distributionRef = doc(collection(db, PRIZE_DISTRIBUTIONS_COLLECTION));
      const distribution: PrizeDistribution = {
        id: distributionRef.id,
        gameDay,
        prizeType,
        totalWinners: winners.length,
        totalPrizePool: prizePoolAmount,
        tokensPerWinner: tokensPerWinner + (reserveActivated ? Math.floor(reserveTokensDistributed / winners.length) : 0),
        winners: winners.map(winner => ({
          ...winner,
          tokensAwarded: tokensPerWinner + (reserveActivated ? Math.floor(reserveTokensDistributed / winners.length) : 0)
        })),
        reserveActivated,
        reserveTokensDistributed,
        distributionTimestamp: Date.now()
      };
      
      transaction.set(distributionRef, {
        ...distribution,
        distributionTimestamp: serverTimestamp()
      });
      
      // Registrar transacción de distribución de premios
      const transactionRef = doc(collection(db, POOL_TRANSACTIONS_COLLECTION));
      const poolTransaction: PoolTransaction = {
        id: transactionRef.id,
        gameDay,
        type: 'prize_distribution',
        amount: totalDistributed + reserveTokensDistributed,
        fromPool: prizeType,
        description: `Prize distribution for ${prizeType} to ${winners.length} winners`,
        timestamp: Date.now(),
        metadata: {
          winners: winners.length,
          tokensPerWinner: distribution.tokensPerWinner,
          reserveActivated,
          reserveTokensDistributed
        }
      };
      
      transaction.set(transactionRef, {
        ...poolTransaction,
        timestamp: serverTimestamp()
      });
      
      console.log(`[distributePrizesToWinners] Distribuidos ${distribution.tokensPerWinner} tokens a cada uno de ${winners.length} ganadores de ${prizeType} prize`);
      
      if (reserveActivated) {
        console.log(`[distributePrizesToWinners] Reserva activada! ${reserveTokensDistributed} tokens adicionales distribuidos`);
      }
      
      return distribution;
    });
  } catch (error) {
    console.error('[distributePrizesToWinners] Error distribuyendo premios:', error);
    return null;
  }
};

// Suscribirse a la pool de premios del día actual
export const subscribeToPrizePool = (callback: (pool: PrizePool | null) => void) => {
  const currentDay = getCurrentGameDaySaoPaulo();
  const poolRef = doc(db, PRIZE_POOLS_COLLECTION, currentDay);
  
  return onSnapshot(poolRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const pool: PrizePool = {
        gameDay: currentDay,
        totalTokensCollected: data.totalTokensCollected || 0,
        poolsDistributed: data.poolsDistributed || false,
        distributionTimestamp: data.distributionTimestamp?.toMillis(),
        pools: {
          firstPrize: data.pools?.firstPrize || 0,
          firstPrizeReserve: data.pools?.firstPrizeReserve || 0,
          secondPrize: data.pools?.secondPrize || 0,
          secondPrizeReserve: data.pools?.secondPrizeReserve || 0,
          thirdPrize: data.pools?.thirdPrize || 0,
          thirdPrizeReserve: data.pools?.thirdPrizeReserve || 0,
          development: data.pools?.development || 0
        },
        reserves: {
          firstPrizeActivated: data.reserves?.firstPrizeActivated || false,
          secondPrizeActivated: data.reserves?.secondPrizeActivated || false,
          thirdPrizeActivated: data.reserves?.thirdPrizeActivated || false
        },
        lastUpdated: data.lastUpdated?.toMillis() || Date.now()
      };
      callback(pool);
    } else {
      // Auto-crear pool si no existe
      getDailyPrizePool(currentDay).then(pool => {
        callback(pool);
      }).catch(error => {
        console.error('Error auto-creando pool:', error);
        callback(null);
      });
    }
  }, (error) => {
    console.error('Error en suscripción a prize pool:', error);
    callback(null);
  });
};

// Obtener estadísticas de la pool
export const getPoolStatistics = async (gameDay?: string) => {
  const currentDay = gameDay || getCurrentGameDaySaoPaulo();
  
  try {
    const pool = await getDailyPrizePool(currentDay);
    
    // Obtener número de participantes únicos
    const purchasesQuery = query(
      collection(db, TICKET_PURCHASES_COLLECTION),
      where('gameDay', '==', currentDay),
      orderBy('timestamp', 'desc')
    );
    
    const purchasesSnapshot = await getDocs(purchasesQuery);
    const uniqueParticipants = new Set(purchasesSnapshot.docs.map(doc => doc.data().userId));
    
    return {
      ...pool,
      totalParticipants: uniqueParticipants.size,
      totalTicketsSold: purchasesSnapshot.size,
      averageTokensPerParticipant: uniqueParticipants.size > 0 ? pool.totalTokensCollected / uniqueParticipants.size : 0
    };
  } catch (error) {
    console.error('[getPoolStatistics] Error obteniendo estadísticas:', error);
    return null;
  }
};

// Funciones de debug/administración
export const debugPrizePool = async (gameDay?: string) => {
  const currentDay = gameDay || getCurrentGameDaySaoPaulo();
  const stats = await getPoolStatistics(currentDay);
  
  console.log(`🏆 Prize Pool Debug - ${currentDay}`);
  console.table(stats);
  
  return stats;
};

// Hacer funciones disponibles globalmente en desarrollo
if (import.meta.env.DEV) {
  (window as any).debugPrizePool = debugPrizePool;
  (window as any).distributePrizePool = () => distributePrizePool();
}
