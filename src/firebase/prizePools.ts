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
  firstPrize: 0.80,        // 80%
  secondPrize: 0.10,       // 10%
  thirdPrize: 0.05,        // 5%
  development: 0.05        // 5%
};

// Función para obtener pools acumuladas de días anteriores sin ganadores
export const getAccumulatedPools = async (currentGameDay: string) => {
  try {
    console.log(`[getAccumulatedPools] Buscando pools acumuladas antes del día ${currentGameDay}`);
    
    // Buscar el último día con resultados para ver qué pools no tuvieron ganadores
    const gameResultsQuery = query(
      collection(db, 'game_results'),
      orderBy('gameDay', 'desc'),
      limit(10) // Últimos 10 días para evitar buscar infinitamente
    );
    
    const gameResultsSnapshot = await getDocs(gameResultsQuery);
    
    let accumulatedFirstPrize = 0;
    let accumulatedSecondPrize = 0;
    let accumulatedThirdPrize = 0;
    let totalDaysAccumulated = 0;
    let lastAccumulationDate: string | undefined;
    
    for (const gameResultDoc of gameResultsSnapshot.docs) {
      const gameResult = gameResultDoc.data();
      const resultGameDay = gameResult.gameDay;
      
      // Solo considerar días anteriores al día actual
      if (resultGameDay >= currentGameDay) continue;
      
      console.log(`[getAccumulatedPools] Revisando resultados del día ${resultGameDay}`);
      
      // Obtener la pool de ese día
      const poolDoc = await getDoc(doc(db, PRIZE_POOLS_COLLECTION, resultGameDay));
      
      if (!poolDoc.exists() || !poolDoc.data().poolsDistributed) {
        console.log(`[getAccumulatedPools] Pool del día ${resultGameDay} no distribuida, saltando`);
        continue;
      }
      
      const poolData = poolDoc.data();
      
      // Verificar qué premios no tuvieron ganadores
      const hasFirstPrizeWinners = gameResult.firstPrize && gameResult.firstPrize.length > 0;
      const hasSecondPrizeWinners = gameResult.secondPrize && gameResult.secondPrize.length > 0;
      const hasThirdPrizeWinners = gameResult.thirdPrize && gameResult.thirdPrize.length > 0;
      
      // Acumular pools sin ganadores
      if (!hasFirstPrizeWinners && poolData.pools.firstPrize > 0) {
        accumulatedFirstPrize += poolData.pools.firstPrize;
        if (poolData.reserves.firstPrizeActivated) {
          accumulatedFirstPrize += poolData.pools.firstPrizeReserve;
        }
        console.log(`[getAccumulatedPools] Acumulando primer premio del día ${resultGameDay}: ${poolData.pools.firstPrize} tokens`);
      }
      
      if (!hasSecondPrizeWinners && poolData.pools.secondPrize > 0) {
        accumulatedSecondPrize += poolData.pools.secondPrize;
        if (poolData.reserves.secondPrizeActivated) {
          accumulatedSecondPrize += poolData.pools.secondPrizeReserve;
        }
        console.log(`[getAccumulatedPools] Acumulando segundo premio del día ${resultGameDay}: ${poolData.pools.secondPrize} tokens`);
      }
      
      if (!hasThirdPrizeWinners && poolData.pools.thirdPrize > 0) {
        accumulatedThirdPrize += poolData.pools.thirdPrize;
        if (poolData.reserves.thirdPrizeActivated) {
          accumulatedThirdPrize += poolData.pools.thirdPrizeReserve;
        }
        console.log(`[getAccumulatedPools] Acumulando tercer premio del día ${resultGameDay}: ${poolData.pools.thirdPrize} tokens`);
      }
      
      // Si encontramos alguna acumulación, contar el día
      if (!hasFirstPrizeWinners || !hasSecondPrizeWinners || !hasThirdPrizeWinners) {
        totalDaysAccumulated++;
        lastAccumulationDate = resultGameDay;
      }
      
      // Si todos los premios tuvieron ganadores, podemos parar de buscar hacia atrás
      if (hasFirstPrizeWinners && hasSecondPrizeWinners && hasThirdPrizeWinners) {
        console.log(`[getAccumulatedPools] Todos los premios tuvieron ganadores el día ${resultGameDay}, deteniendo búsqueda`);
        break;
      }
    }
    
    const result = {
      firstPrize: accumulatedFirstPrize,
      secondPrize: accumulatedSecondPrize,
      thirdPrize: accumulatedThirdPrize,
      totalDaysAccumulated,
      lastAccumulationDate
    };
    
    if (totalDaysAccumulated > 0) {
      console.log(`[getAccumulatedPools] ✨ Pools acumuladas encontradas:`, result);
    } else {
      console.log(`[getAccumulatedPools] No hay pools para acumular`);
    }
    
    return result;
  } catch (error) {
    console.error('[getAccumulatedPools] Error obteniendo pools acumuladas:', error);
    return {
      firstPrize: 0,
      secondPrize: 0,
      thirdPrize: 0,
      totalDaysAccumulated: 0
    };
  }
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
        ...(data.distributionTimestamp && { distributionTimestamp: data.distributionTimestamp.toMillis() }),
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
        accumulatedFromPreviousDays: data.accumulatedFromPreviousDays || {
          firstPrize: 0,
          secondPrize: 0,
          thirdPrize: 0,
          totalDaysAccumulated: 0
        },
        finalPools: data.finalPools || {
          firstPrize: data.pools?.firstPrize || 0,
          secondPrize: data.pools?.secondPrize || 0,
          thirdPrize: data.pools?.thirdPrize || 0
        },
        lastUpdated: data.lastUpdated?.toMillis() || Date.now()
      };
    } else {
      // Crear nueva pool del día (temporalmente sin acumulación para debugging)
      console.log(`[getDailyPrizePool] Creando nueva pool básica para ${currentDay}`);
      
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
        accumulatedFromPreviousDays: {
          firstPrize: 0,
          secondPrize: 0,
          thirdPrize: 0,
          totalDaysAccumulated: 0
        },
        finalPools: {
          firstPrize: 0,
          secondPrize: 0,
          thirdPrize: 0
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
    // Verificar si la pool existe antes de la transacción
    const poolCheck = await getDoc(poolRef);
    
    if (!poolCheck.exists()) {
      console.log(`[addTokensToPool] Pool no existe, creando nueva pool para ${currentDay}`);
      // Crear la pool fuera de la transacción
      await getDailyPrizePool(currentDay);
      console.log(`[addTokensToPool] Pool creada fuera de transacción`);
    }
    
    return await runTransaction(db, async (transaction) => {
      const poolDoc = await transaction.get(poolRef);
      
      if (!poolDoc.exists()) {
        console.error(`[addTokensToPool] Pool aún no existe después de crearla`);
        return false;
      }
      
      const data = poolDoc.data();
      const currentPool: PrizePool = {
        gameDay: currentDay,
        totalTokensCollected: data.totalTokensCollected || 0,
        poolsDistributed: data.poolsDistributed || false,
        ...(data.distributionTimestamp && { distributionTimestamp: data.distributionTimestamp.toMillis() }),
        pools: data.pools || {
          firstPrize: 0, firstPrizeReserve: 0, secondPrize: 0,
          secondPrizeReserve: 0, thirdPrize: 0, thirdPrizeReserve: 0, development: 0
        },
        reserves: data.reserves || {
          firstPrizeActivated: false, secondPrizeActivated: false, thirdPrizeActivated: false
        },
        accumulatedFromPreviousDays: data.accumulatedFromPreviousDays || {
          firstPrize: 0, secondPrize: 0, thirdPrize: 0, totalDaysAccumulated: 0
        },
        finalPools: data.finalPools || {
          firstPrize: 0, secondPrize: 0, thirdPrize: 0
        },
        lastUpdated: data.lastUpdated?.toMillis() || Date.now()
      };
      
      // Verificar que la pool no esté cerrada (distribución ya realizada)
      if (currentPool.poolsDistributed) {
        console.log(`[addTokensToPool] 🔒 Pool del día ${currentDay} ya está cerrada para nuevas compras`);
        console.log(`[addTokensToPool] Estado de la pool:`, {
          gameDay: currentPool.gameDay,
          totalTokensCollected: currentPool.totalTokensCollected,
          poolsDistributed: currentPool.poolsDistributed,
          distributionTimestamp: currentPool.distributionTimestamp ? new Date(currentPool.distributionTimestamp).toISOString() : null,
          lastUpdated: new Date(currentPool.lastUpdated).toISOString()
        });
        return false;
      }
      
      console.log(`[addTokensToPool] ✅ Pool activa del día ${currentDay}, agregando ${tokensSpent} tokens. Actual: ${currentPool.totalTokensCollected}`);
      
      // Actualizar pool con los nuevos tokens
      const newTotal = currentPool.totalTokensCollected + tokensSpent;
      const updatedPool = {
        ...currentPool,
        totalTokensCollected: newTotal,
        lastUpdated: serverTimestamp()
      };
      
      console.log(`[addTokensToPool] 🔄 Actualizando pool: ${currentPool.totalTokensCollected} + ${tokensSpent} = ${newTotal}`);
      console.log(`[addTokensToPool] Pool a guardar:`, updatedPool);
      
      transaction.set(poolRef, updatedPool);
      console.log(`[addTokensToPool] ✅ Transaction.set ejecutado`);
      
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
      
      console.log(`[addTokensToPool] ${tokensSpent} tokens agregados a la pool del día ${currentDay}. Total: ${newTotal}`);
      console.log(`[addTokensToPool] 🎉 Transacción completada exitosamente`);
      return true;
    });
  } catch (error) {
    console.error('[addTokensToPool] Error agregando tokens a la pool:', error);
    return false;
  }
};

// Distribuir la pool principal en pools específicas (5 minutos antes del sorteo)
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
      
            // Calcular distribución base del día
      const distributedPools = {
        firstPrize: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.firstPrize),
        secondPrize: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.secondPrize),
        thirdPrize: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.thirdPrize),
        development: Math.floor(totalTokens * POOL_DISTRIBUTION_PERCENTAGES.development)
      };

      // Crear finalPools con las claves correctas para distributePrizesToWinners
      const finalPools = {
        first: distributedPools.firstPrize,
        second: distributedPools.secondPrize,
        third: distributedPools.thirdPrize
      };

      // Actualizar la pool con la distribución
      transaction.update(poolRef, {
        pools: distributedPools,
        finalPools: finalPools,
        poolsDistributed: true,
        distributionTimestamp: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      
      // Registrar transacciones de distribución para pools principales
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

      // Registrar transacciones para finalPools también
      for (const [poolType, amount] of Object.entries(finalPools)) {
        if (amount > 0) {
          const transactionRef = doc(collection(db, POOL_TRANSACTIONS_COLLECTION));
          const poolTransaction: PoolTransaction = {
            id: transactionRef.id,
            gameDay: currentDay,
            type: 'pool_distribution',
            amount,
            fromPool: 'main',
            toPool: `final_${poolType}`,
            description: `Final distribution to ${poolType} prize pool`,
            timestamp: Date.now(),
            metadata: { 
              totalTokens,
              isFinalPool: true
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
      
      // Usar las pools finales que incluyen acumulación de días anteriores
      const prizePoolAmount = poolData.finalPools ? poolData.finalPools[prizeType] : (poolData.pools[prizeType] || 0);
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
        ...(data.distributionTimestamp && { distributionTimestamp: data.distributionTimestamp.toMillis() }),
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
        accumulatedFromPreviousDays: data.accumulatedFromPreviousDays || {
          firstPrize: 0,
          secondPrize: 0,
          thirdPrize: 0,
          totalDaysAccumulated: 0
        },
        finalPools: data.finalPools || {
          firstPrize: data.pools?.firstPrize || 0,
          secondPrize: data.pools?.secondPrize || 0,
          thirdPrize: data.pools?.thirdPrize || 0
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
    
    // Obtener número de participantes únicos desde player_tickets (fuente real)
    const ticketsQuery = query(
      collection(db, 'player_tickets'),
      where('gameDay', '==', currentDay)
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const uniqueParticipants = new Set(ticketsSnapshot.docs.map(doc => doc.data().userId));
    
    return {
      ...pool,
      totalParticipants: uniqueParticipants.size,
      totalTicketsSold: ticketsSnapshot.size, // Usar player_tickets como fuente real
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

// Función para reparar pools existentes agregando finalPools
const repairExistingPools = async () => {
  console.log('🔧 Reparando pools existentes agregando finalPools...');
  
  try {
    const poolsRef = collection(db, PRIZE_POOLS_COLLECTION);
    const poolsSnapshot = await getDocs(poolsRef);
    
    const poolsToFix = [];
    
    for (const poolDoc of poolsSnapshot.docs) {
      const poolData = poolDoc.data();
      
      // Si tiene pools distribuidas pero no finalPools, necesita reparación
      if (poolData.poolsDistributed && poolData.pools && !poolData.finalPools) {
        poolsToFix.push({
          id: poolDoc.id,
          data: poolData
        });
      }
    }
    
    console.log(`📊 Encontradas ${poolsToFix.length} pools que necesitan reparación`);
    
    for (const pool of poolsToFix) {
      console.log(`🔨 Reparando pool del día ${pool.id}...`);
      
      const finalPools = {
        first: pool.data.pools.firstPrize || 0,
        second: pool.data.pools.secondPrize || 0,
        third: pool.data.pools.thirdPrize || 0
      };
      
      const poolRef = doc(db, PRIZE_POOLS_COLLECTION, pool.id);
      await updateDoc(poolRef, {
        finalPools: finalPools,
        repairedAt: serverTimestamp()
      });
      
      console.log(`✅ Pool ${pool.id} reparada:`, finalPools);
    }
    
    console.log(`🎉 Reparación completada. ${poolsToFix.length} pools reparadas.`);
    return { success: true, poolsRepaired: poolsToFix.length };
    
  } catch (error) {
    console.error('❌ Error reparando pools:', error);
    return { success: false, error: error.message };
  }
};

// Hacer funciones disponibles globalmente en desarrollo
if (import.meta.env.DEV) {
  (window as any).debugPrizePool = debugPrizePool;
  (window as any).distributePrizePool = () => distributePrizePool();
  (window as any).repairExistingPools = repairExistingPools;
}
