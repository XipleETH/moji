import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContractAddresses } from '../contracts/addresses';

// Import ABIs
import LottoMojiTicketsABI from '../contracts/abis/LottoMojiTickets.json';

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

export const useUserStatistics = (userId: string | null) => {
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { chainId } = useAccount();
  const contracts = chainId ? getContractAddresses(chainId) : null;

  // Get user's total ticket count
  const { data: totalTicketsData } = useReadContract({
    address: contracts?.LottoMojiTickets as `0x${string}`,
    abi: LottoMojiTicketsABI.abi,
    functionName: 'balanceOf',
    args: userId ? [userId] : undefined,
    query: {
      enabled: !!contracts?.LottoMojiTickets && !!userId
    }
  });

  useEffect(() => {
    if (!userId || !contracts) {
      setStatistics(null);
      return;
    }

    const fetchStatistics = async () => {
      setLoading(true);
      setError(null);
      try {
        // For now, we'll provide basic statistics based on ticket count
        // In the future, this could be enhanced with more detailed contract queries
        const totalTickets = totalTicketsData ? Number(totalTicketsData) : 0;
        
        const stats: UserStatistics = {
          totalTickets,
          freeTickets: 0, // TODO: Query for free tickets from contract
          paidTickets: totalTickets, // For now, assume all are paid
          wins: {
            firstPrize: 0, // TODO: Query win history from contract events
            secondPrize: 0,
            thirdPrize: 0,
            freePrize: 0
          },
          totalWins: 0
        };
        
        setStatistics(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
        console.error('Error fetching user statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [userId, contracts, totalTicketsData]);

  return { statistics, loading, error };
}; 