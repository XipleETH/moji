import { db } from './config';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { GameResult, PrizeDistribution } from '../types';
import { distributePrizesToWinners } from './prizePools';

const GAME_RESULTS_COLLECTION = 'game_results';
const PRIZE_POOLS_COLLECTION = 'prize_pools';
const PRIZE_DISTRIBUTIONS_COLLECTION = 'prize_distributions';
const TOKEN_TRANSACTIONS_COLLECTION = 'token_transactions';

// Función para verificar si los premios fueron realmente distribuidos
const verifyPrizeDistribution = async (gameDay: string): Promise<boolean> => {
  try {
    // Verificar si hay transacciones de premios para este día
    const transactionsQuery = query(
      collection(db, TOKEN_TRANSACTIONS_COLLECTION),
      where('gameDay', '==', gameDay),
      where('type', '==', 'prize')
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    return !transactionsSnapshot.empty;
  } catch (error) {
    console.error(`[verifyPrizeDistribution] Error verificando distribución para ${gameDay}:`, error);
    return false;
  }
};

export const distributeHistoricalPrizes = async (forceRedistribution: boolean = false) => {
  try {
    console.log('[distributeHistoricalPrizes] Iniciando distribución de premios históricos...');

    // Obtener los últimos 5 resultados
    const resultsQuery = query(
      collection(db, GAME_RESULTS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const resultsSnapshot = await getDocs(resultsQuery);
    const results = resultsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toMillis() || Date.now()
    })) as GameResult[];

    console.log(`[distributeHistoricalPrizes] Encontrados ${results.length} resultados recientes`);
    console.log('[distributeHistoricalPrizes] Estructura del primer resultado:', JSON.stringify(results[0], null, 2));

    for (const result of results) {
      const gameDay = result.dayKey || (result.timestamp ? new Date(result.timestamp).toISOString().split('T')[0] : null);
      
      if (!gameDay) {
        console.log(`[distributeHistoricalPrizes] No se pudo determinar el día para el resultado ${result.id}`);
        continue;
      }

      console.log(`[distributeHistoricalPrizes] Procesando sorteo del día ${gameDay}`);
      console.log('[distributeHistoricalPrizes] Estructura del resultado:', {
        id: result.id,
        gameDay,
        timestamp: result.timestamp,
        prizesDistributed: result.prizesDistributed,
        firstPrize: result.firstPrize?.length || 0,
        secondPrize: result.secondPrize?.length || 0,
        thirdPrize: result.thirdPrize?.length || 0
      });

      // Verificar si realmente se distribuyeron los premios
      const werePrizesDistributed = await verifyPrizeDistribution(gameDay);
      
      if (result.prizesDistributed && !forceRedistribution && werePrizesDistributed) {
        console.log(`[distributeHistoricalPrizes] Los premios del día ${gameDay} ya fueron distribuidos y verificados`);
        continue;
      }

      // Obtener la pool del día
      const poolRef = doc(db, PRIZE_POOLS_COLLECTION, gameDay);
      const poolDoc = await getDoc(poolRef);

      if (!poolDoc.exists()) {
        console.log(`[distributeHistoricalPrizes] No se encontró la pool para el día ${gameDay}`);
        continue;
      }

      const poolData = poolDoc.data();
      console.log('[distributeHistoricalPrizes] Datos de la pool:', {
        gameDay,
        poolsDistributed: poolData.poolsDistributed,
        pools: poolData.pools
      });

      if (!poolData.poolsDistributed) {
        console.log(`[distributeHistoricalPrizes] La pool del día ${gameDay} no está distribuida`);
        continue;
      }

      // Distribuir premios para cada categoría
      const prizeTypes = ['firstPrize', 'secondPrize', 'thirdPrize'] as const;
      
      for (const prizeType of prizeTypes) {
        const winners = result[prizeType];
        if (winners && winners.length > 0) {
          console.log(`[distributeHistoricalPrizes] Distribuyendo ${prizeType} para ${winners.length} ganadores`);
          console.log('[distributeHistoricalPrizes] Datos de los ganadores:', winners.map(w => ({
            userId: w.userId,
            walletAddress: w.walletAddress,
            ticketId: w.id
          })));
          
          try {
            await distributePrizesToWinners(
              gameDay,
              prizeType,
              winners.map(winner => ({
                userId: winner.userId,
                walletAddress: winner.walletAddress || '',
                ticketId: winner.id
              }))
            );
            
            console.log(`[distributeHistoricalPrizes] Premios ${prizeType} distribuidos exitosamente`);
          } catch (error) {
            console.error(`[distributeHistoricalPrizes] Error al distribuir ${prizeType}:`, error);
          }
        }
      }

      // Marcar como distribuido
      await runTransaction(db, async (transaction) => {
        const resultRef = doc(db, GAME_RESULTS_COLLECTION, result.id);
        transaction.update(resultRef, {
          prizesDistributed: true,
          lastUpdated: serverTimestamp()
        });
      });

      console.log(`[distributeHistoricalPrizes] Sorteo del día ${gameDay} procesado completamente`);
    }

    console.log('[distributeHistoricalPrizes] Proceso completado');
    return { success: true, processedResults: results.length };
  } catch (error) {
    console.error('[distributeHistoricalPrizes] Error:', error);
    return { success: false, error };
  }
}; 