import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Ticket } from '../types';
import { useRealTimeTimer } from './useRealTimeTimer';
import { useContractGame } from './useContractGame';
import { usePrizePools } from './usePrizePools';
import { getCurrentUser } from '../firebase/auth';
import { emojisToNumbers } from '../utils/gameLogic';

const initialGameState: GameState = {
  winningNumbers: [],
  tickets: [],
  lastResults: null,
  gameStarted: false,
  timeRemaining: 0
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  
  // Use contract-based hooks for real functionality
  const {
    gameState: contractGameState,
    buyTicketWithETH,
    buyTicketWithUSDC,
    ethPrice,
    isTransactionPending,
    isTransactionConfirmed,
    refetch,
    error: contractError
  } = useContractGame();
  
  const { formattedPools, refetch: refetchPools } = usePrizePools();
  
  const { timeRemaining, updateTimer } = useRealTimeTimer();

  // Update local game state when contract data changes
  useEffect(() => {
    if (contractGameState && !contractGameState.isLoading) {
      // Convert contract tickets to UI format
      const formattedTickets: Ticket[] = contractGameState.tickets.map(ticket => ({
        id: ticket.id.toString(),
        numbers: ticket.emojis.map(num => {
          // Convert numbers back to emojis using a mapping
          const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                          '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                          '🎁', '🎮', '🚀', '🌍', '🍀'];
          return EMOJIS[num] || EMOJIS[0];
        }),
        timestamp: ticket.mintTimestamp * 1000, // Convert to milliseconds
        userId: ticket.player,
        walletAddress: ticket.player,
        isUsed: ticket.isUsed,
        isFreeTicket: ticket.isFreeTicket,
        paymentHash: ticket.paymentHash
      }));

      setGameState(prev => ({
        ...prev,
        winningNumbers: contractGameState.currentRound?.winningNumbers?.map(num => {
          const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                          '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                          '🎁', '🎮', '🚀', '🌍', '🍀'];
          return EMOJIS[num] || EMOJIS[0];
        }) || [],
        tickets: formattedTickets,
        gameStarted: true,
        timeRemaining,
        lastResults: contractGameState.currentRound?.numbersDrawn ? {
          firstPrize: formattedPools?.eth.firstPrize || '0',
          secondPrize: formattedPools?.eth.secondPrize || '0',
          thirdPrize: formattedPools?.eth.thirdPrize || '0',
          freePrize: []
        } : null
      }));
    }
  }, [contractGameState, formattedPools, timeRemaining]);

  // Generate ticket function using contracts
  const handleGenerateTicket = useCallback(async (numbers: string[], paymentMethod: 'ETH' | 'USDC' = 'ETH') => {
    console.log('=== USE GAME STATE GENERATE TICKET START ===');
    console.log('[useGameState] Input numbers:', numbers);
    console.log('[useGameState] Payment method:', paymentMethod);
    console.log('[useGameState] Numbers length:', numbers?.length);
    
    if (!numbers?.length) {
      console.error('[useGameState] ❌ No numbers provided');
      return;
    }
    
    try {
      console.log('[useGameState] ✅ Converting emojis to numbers...');
      console.log('[useGameState] Generating ticket with emojis:', numbers);
      
      // Convert emoji strings to numbers for smart contracts
      const emojiNumbers = emojisToNumbers(numbers);
      console.log('[useGameState] ✅ Converted to numbers:', emojiNumbers);
      
      if (paymentMethod === 'ETH') {
        console.log('[useGameState] 🔷 Buying ticket with ETH...');
        await buyTicketWithETH(emojiNumbers);
        console.log('[useGameState] ✅ ETH ticket purchase completed');
      } else {
        console.log('[useGameState] 💵 Buying ticket with USDC...');
        await buyTicketWithUSDC(emojiNumbers);
        console.log('[useGameState] ✅ USDC ticket purchase completed');
      }
      
      console.log('[useGameState] ✅ Ticket generation successful!');
      console.log('=== USE GAME STATE GENERATE TICKET END ===');
      
    } catch (error) {
      console.error('=== USE GAME STATE GENERATE TICKET ERROR ===');
      console.error('[useGameState] Error type:', typeof error);
      console.error('[useGameState] Error message:', (error as any)?.message);
      console.error('[useGameState] Full error:', error);
      console.error('Error generating ticket:', error);
      throw error; // Re-throw para que el componente pueda manejarlo
    }
  }, [buyTicketWithETH, buyTicketWithUSDC]);

  // Force game draw (dev tool) - not available with automated system
  const forceGameDraw = useCallback(async () => {
    console.log('Game draws are automated every 24 hours via Chainlink. Cannot force manual draw.');
  }, []);

  // Refresh all data
  const refreshGameData = useCallback(() => {
    refetch();
    refetchPools();
  }, [refetch, refetchPools]);

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
    currentRound: contractGameState?.currentRound,
    nextDrawTime: contractGameState?.nextDrawTime,
    prizePools: formattedPools,
    error: contractError
  };
}