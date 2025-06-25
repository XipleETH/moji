import { useState, useEffect } from 'react';
import { useBlockchainTickets } from './useBlockchainTickets';
import { useWallet } from '../contexts/WalletContext';

interface BlockchainUserStatistics {
  totalTickets: number;
  paidTickets: number;
  freeTickets: number;
  recentTickets: number;
  wins: {
    firstPrize: number;
    secondPrize: number;
    thirdPrize: number;
    freePrize: number;
  };
  totalWins: number;
  lastUpdated: number;
  isLoading: boolean;
}

export const useUserStatistics = (userId: string | null) => {
  const [statistics, setStatistics] = useState<BlockchainUserStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const { user, isConnected } = useWallet();
  const { userData: blockchainData, isLoadingTickets, refreshData } = useBlockchainTickets();

  // Función para calcular estadísticas basadas solo en datos blockchain
  const calculateBlockchainStats = (): BlockchainUserStatistics => {
    const tickets = blockchainData.userTickets;
    const totalTickets = Number(blockchainData.ticketsOwned);
    
    // Calcular premios ganados basado en matches de los tickets
    let firstPrizeWins = 0;
    let secondPrizeWins = 0;
    let thirdPrizeWins = 0;
    let freePrizeWins = 0;

    tickets.forEach(ticket => {
      if (ticket.matches !== undefined && ticket.matches > 0) {
        switch (ticket.matches) {
          case 4:
            firstPrizeWins++;
            break;
          case 3:
            secondPrizeWins++;
            break;
          case 2:
            thirdPrizeWins++;
            break;
          case 1:
            freePrizeWins++;
            break;
        }
      }
    });

    // Calcular tickets recientes (últimos 3 días)
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const recentTickets = tickets.filter(ticket => ticket.purchaseTime >= threeDaysAgo).length;

    return {
      totalTickets: totalTickets,
      paidTickets: totalTickets, // Todos los tickets blockchain son pagados (USDC)
      freeTickets: 0, // No hay tickets gratuitos en blockchain
      recentTickets: recentTickets,
      wins: {
        firstPrize: firstPrizeWins,
        secondPrize: secondPrizeWins,
        thirdPrize: thirdPrizeWins,
        freePrize: freePrizeWins
      },
      totalWins: firstPrizeWins + secondPrizeWins + thirdPrizeWins + freePrizeWins,
      lastUpdated: Date.now(),
      isLoading: isLoadingTickets
    };
  };

  // Actualizar estadísticas cuando cambian los datos blockchain
  useEffect(() => {
    if (isConnected && user?.walletAddress) {
      try {
        const stats = calculateBlockchainStats();
        setStatistics(stats);
        setError(null);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[useUserStatistics] Blockchain-only stats updated:', {
            totalTickets: stats.totalTickets,
            recentTickets: stats.recentTickets,
            totalWins: stats.totalWins,
            userTicketsLength: blockchainData.userTickets.length
          });
        }
      } catch (err) {
        console.error('Error calculating blockchain stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to calculate statistics');
      }
    } else {
      // Reset cuando no está conectado
      setStatistics(null);
      setError(null);
    }
  }, [blockchainData.ticketsOwned, blockchainData.userTickets, isLoadingTickets, isConnected, user?.walletAddress]);

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
    if (!userId || !isConnected) return;

    console.log('[useUserStatistics] Manual refresh initiated (blockchain only)');
    setError(null);
    
    try {
      // Solo refresh de datos blockchain
      await refreshData();
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh blockchain statistics');
      console.error('Error refreshing blockchain statistics:', err);
    }
  };

  return { 
    statistics,
    loading: isLoadingTickets,
    error,
    refreshStats,
    lastUpdated: statistics?.lastUpdated || 0
  };
}; 