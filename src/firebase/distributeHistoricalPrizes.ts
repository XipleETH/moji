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
  serverTimestamp
} from 'firebase/firestore';
import { GameResult, PrizeDistribution } from '../types';
import { distributePrizesToWinners } from './prizePools';

const GAME_RESULTS_COLLECTION = 'game_results';
const PRIZE_POOLS_COLLECTION = 'prize_pools';
const PRIZE_DISTRIBUTIONS_COLLECTION = 'prize_distributions';

export const distributeHistoricalPrizes = async () => {
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
      ...doc.data()
    })) as GameResult[];

    console.log(`[distributeHistoricalPrizes] Encontrados ${results.length} resultados recientes`);

    for (const result of results) {
      const gameDay = result.gameDay;
      console.log(`[distributeHistoricalPrizes] Procesando sorteo del día ${gameDay}`);

      // Verificar si ya se distribuyeron los premios
      if (result.prizesDistributed) {
        console.log(`[distributeHistoricalPrizes] Los premios del día ${gameDay} ya fueron distribuidos`);
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