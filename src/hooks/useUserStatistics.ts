import { useState, useEffect } from 'react';
import { getUserStatistics } from '../firebase/game';
import { useBlockchainTickets } from './useBlockchainTickets';
import { useWallet } from '../contexts/WalletContext';

interface UserStatistics {
  totalTickets: number;
  freeTickets: number;
  paidTickets: number;
  wins: {
    firstPrize: number;
    secondPrize: number;
    thirdPrize: number;
    freePrize: number;
  };
  totalWins: number;
}

interface EnhancedUserStatistics extends UserStatistics {
  blockchainTickets: number;
  recentTickets: number;
  lastUpdated: number;
  isLoadingBlockchain: boolean;
  isLoadingFirebase: boolean;
}

export const useUserStatistics = (userId: string | null) => {
  const [firebaseStats, setFirebaseStats] = useState<UserStatistics | null>(null);
  const [enhancedStats, setEnhancedStats] = useState<EnhancedUserStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const { user, isConnected } = useWallet();
  const { userData: blockchainData, isLoadingTickets, refreshData } = useBlockchainTickets();

  // Función para combinar datos de Firebase y blockchain
  const combineStatistics = (firebase: UserStatistics | null, blockchainTickets: number, isLoadingBC: boolean, isLoadingFB: boolean): EnhancedUserStatistics | null => {
    if (!firebase && isLoadingFB) return null;

    // Si no hay datos de Firebase, crear estructura básica
    const baseStats = firebase || {
      totalTickets: 0,
      freeTickets: 0,
      paidTickets: 0,
      wins: {
        firstPrize: 0,
        secondPrize: 0,
        thirdPrize: 0,
        freePrize: 0
      },
      totalWins: 0
    };

    // Combinar datos de Firebase con datos blockchain
    const combinedStats: EnhancedUserStatistics = {
      ...baseStats,
      // Usar el máximo entre Firebase y blockchain para total de tickets
      totalTickets: Math.max(baseStats.totalTickets, blockchainTickets),
      // Si blockchain tiene más tickets, la diferencia son tickets pagados
      paidTickets: Math.max(baseStats.paidTickets, blockchainTickets - baseStats.freeTickets),
      // Información adicional del blockchain
      blockchainTickets: blockchainTickets,
      recentTickets: blockchainData.userTickets.length,
      lastUpdated: Date.now(),
      isLoadingBlockchain: isLoadingBC,
      isLoadingFirebase: isLoadingFB
    };

    return combinedStats;
  };

  // Cargar datos de Firebase
  useEffect(() => {
    if (!userId) {
      setFirebaseStats(null);
      setEnhancedStats(null);
      return;
    }

    const fetchFirebaseStats = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[useUserStatistics] Loading Firebase stats for:', userId);
        const stats = await getUserStatistics(userId);
        setFirebaseStats(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
        console.error('Error fetching user statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFirebaseStats();
  }, [userId]);

  // Actualizar estadísticas combinadas cuando cambian los datos
  useEffect(() => {
    const combined = combineStatistics(
      firebaseStats,
      Number(blockchainData.ticketsOwned),
      isLoadingTickets,
      loading
    );
    
    if (combined) {
      setEnhancedStats(combined);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useUserStatistics] Enhanced stats updated:', {
          firebase: firebaseStats,
          blockchain: Number(blockchainData.ticketsOwned),
          combined: combined
        });
      }
    }
  }, [firebaseStats, blockchainData.ticketsOwned, blockchainData.userTickets.length, isLoadingTickets, loading]);

  // Auto-refresh cada 30 segundos cuando hay un usuario conectado
  useEffect(() => {
    if (!userId || !isConnected) return;

    const interval = setInterval(() => {
      const now = Date.now();
      // Solo refrescar si han pasado más de 30 segundos
      if (now - lastRefresh > 30000) {
        console.log('[useUserStatistics] Auto-refreshing blockchain data');
        refreshData();
        setLastRefresh(now);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, isConnected, refreshData, lastRefresh]);

  // Función manual de refresh
  const refreshStats = async () => {
    if (!userId) return;

    console.log('[useUserStatistics] Manual refresh initiated');
    setError(null);
    
    try {
      // Refresh blockchain data
      await refreshData();
      
      // Refresh Firebase data
      const stats = await getUserStatistics(userId);
      setFirebaseStats(stats);
      
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh statistics');
      console.error('Error refreshing statistics:', err);
    }
  };

  return { 
    statistics: enhancedStats,
    loading: loading || isLoadingTickets,
    error,
    refreshStats,
    lastUpdated: enhancedStats?.lastUpdated || 0
  };
}; 