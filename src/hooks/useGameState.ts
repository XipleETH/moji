import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Ticket } from '../types';
import { useRealTimeTimer } from './useRealTimeTimer';
import { getCurrentUser } from '../firebase/auth';

const initialGameState: GameState = {
  winningNumbers: [],
  tickets: [],
  lastResults: null,
  gameStarted: false,
  timeRemaining: 0
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [isTransactionConfirmed, setIsTransactionConfirmed] = useState(false);
  const [ethPrice, setEthPrice] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [nextDrawTime, setNextDrawTime] = useState<Date | null>(null);
  const [prizePools, setPrizePools] = useState<any>(null);

  const { timeRemaining, updateTimer } = useRealTimeTimer();

  // Initialize with mock data for now
  useEffect(() => {
    console.log('Initializing game state...');
    
    // Set mock game data
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      timeRemaining
    }));

    // Set mock values for UI
    setEthPrice('0.0005');
    setPrizePools({
      eth: {
        firstPrize: '0.01',
        secondPrize: '0.005',
        thirdPrize: '0.002',
        total: '0.017'
      }
    });
    setCurrentRound({
      id: 1,
      isActive: true,
      numbersDrawn: false
    });

    // Set next draw time (every 24 hours as per the repo)
    const now = new Date();
    const nextDraw = new Date(now);
    nextDraw.setDate(nextDraw.getDate() + 1);
    nextDraw.setHours(0, 0, 0, 0); // Next day at midnight
    setNextDrawTime(nextDraw);

  }, [timeRemaining]);

  // Generate ticket function (simplified for now)
  const handleGenerateTicket = useCallback(async (numbers: string[], paymentMethod: 'ETH' | 'USDC' = 'ETH') => {
    if (!numbers?.length) return;
    
    try {
      setIsTransactionPending(true);
      console.log('Generating ticket with numbers:', numbers);
      
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create mock ticket
      const newTicket: Ticket = {
        id: `temp-${Date.now()}`,
        numbers,
        timestamp: Date.now(),
        userId: user.id,
        walletAddress: user.walletAddress,
      };
      
      console.log('Ticket generated successfully:', newTicket);
      
      // Add ticket to local state
      setGameState(prev => ({
        ...prev,
        tickets: [...prev.tickets, newTicket]
      }));
      
      setIsTransactionConfirmed(true);
      setTimeout(() => setIsTransactionConfirmed(false), 5000);
      
    } catch (error) {
      console.error('Error generating ticket:', error);
      throw error;
    } finally {
      setIsTransactionPending(false);
    }
  }, []);

  // Force game draw (dev tool)
  const forceGameDraw = useCallback(async () => {
    try {
      console.log('Forcing manual game draw...');
      
      // Generate mock winning numbers
      const mockWinningNumbers = ['🌟', '🎈', '🎨', '🌈'];
      
      setGameState(prev => ({
        ...prev,
        winningNumbers: mockWinningNumbers,
        lastResults: {
          firstPrize: '0.01',
          secondPrize: '0.005',
          thirdPrize: '0.002',
          freePrize: []
        }
      }));
      
      console.log('Mock game draw completed');
    } catch (error) {
      console.error('Error forcing game draw:', error);
    }
  }, []);

  // Refresh data function
  const refreshGameData = useCallback(() => {
    console.log('Refreshing game data...');
    // For now, this just logs - in a real implementation it would refetch from Firebase
  }, []);

  return {
    gameState: {
      ...gameState,
      timeRemaining
    },
    generateTicket: handleGenerateTicket,
    forceGameDraw,
    ethPrice,
    isTransactionPending,
    isTransactionConfirmed,
    refreshGameData,
    currentRound,
    nextDrawTime,
    prizePools
  };
}