import { useState, useEffect } from 'react';
import { getUserStatistics } from '../firebase/game';

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

  useEffect(() => {
    if (!userId) {
      setStatistics(null);
      return;
    }

    const fetchStatistics = async () => {
      setLoading(true);
      setError(null);
      try {
        const stats = await getUserStatistics(userId);
        setStatistics(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
        console.error('Error fetching user statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [userId]);

  return { statistics, loading, error };
}; 