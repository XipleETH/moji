import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState } from '../types';
import { useContractGame } from './useContractGame';
import { usePrizePools } from './usePrizePools';
import { useRealTimeTimer } from './useRealTimeTimer';

const initialGameState: GameState = {
  winningNumbers: [],
  tickets: [],
  lastResults: null,
  gameStarted: true,
  timeRemaining: 0
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  
  // Use contract-based hooks
  const {
    gameState: contractGameState,
    buyTicketWithETH,
    buyTicketWithUSDC,
    ethPrice,
    isTransactionPending,
    isTransactionConfirmed,
    refetch
  } = useContractGame();

  const { formattedPools, refetch: refetchPools } = usePrizePools();

  // Timer hook
  const { timeRemaining, updateTimer } = useRealTimeTimer(() => {
    console.log('[useGameState] Timer ended, refreshing game data...');
    refreshGameData();
  });

  // Update local game state when contract data changes
  useEffect(() => {
    if (contractGameState && !contractGameState.isLoading) {
      setGameState(prev => ({
        ...prev,
        winningNumbers: contractGameState.currentRound?.winningNumbers?.map(n => n.toString()) || [],
        tickets: contractGameState.tickets.map(ticket => ({
          id: ticket.id.toString(),
          numbers: ticket.emojis.map(emoji => emoji.toString()),
          timestamp: ticket.mintTimestamp,
          userId: ticket.player,
          walletAddress: ticket.player,
          isUsed: ticket.isUsed,
          isFreeTicket: ticket.isFreeTicket,
          paymentHash: ticket.paymentHash
        })),
        timeRemaining,
        gameStarted: true,
        lastResults: contractGameState.currentRound?.numbersDrawn ? {
          firstPrize: formattedPools?.eth.firstPrize || '0',
          secondPrize: formattedPools?.eth.secondPrize || '0',
          thirdPrize: formattedPools?.eth.thirdPrize || '0',
          freePrize: []
        } : null
      }));
      
      // Update timer from contract data
      if (contractGameState.timeRemaining && contractGameState.timeRemaining !== timeRemaining * 1000) {
        updateTimer(Math.floor(contractGameState.timeRemaining / 1000));
      }
    }
  }, [contractGameState, formattedPools, timeRemaining, updateTimer]);

  // Generate ticket function using contracts
  const generateTicket = useCallback(async (numbers: string[], paymentMethod: 'ETH' | 'USDC' = 'ETH') => {
    if (!numbers?.length) return;
    
    try {
      // Convert emoji strings to numbers
      const emojiNumbers = numbers.map(num => parseInt(num));
      
      if (paymentMethod === 'ETH') {
        await buyTicketWithETH(emojiNumbers);
      } else {
        await buyTicketWithUSDC(emojiNumbers);
      }
      
    } catch (error) {
      console.error('Error generating ticket:', error);
      throw error;
    }
  }, [buyTicketWithETH, buyTicketWithUSDC]);

  // Force game draw is not needed - it's automated by Chainlink Automation
  const forceGameDraw = useCallback(() => {
    console.log('[useGameState] Los sorteos son automáticos cada 24 horas. No se puede forzar manualmente.');
  }, []);

  // Refresh all data
  const refreshGameData = useCallback(() => {
    refetch();
    refetchPools();
  }, [refetch, refetchPools]);

  return {
    gameState,
    generateTicket,
    forceGameDraw,
    ethPrice,
    isTransactionPending,
    isTransactionConfirmed,
    refreshGameData,
    currentRound: contractGameState?.currentRound,
    nextDrawTime: contractGameState?.nextDrawTime,
    prizePools: formattedPools
  };
}