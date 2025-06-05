import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getContractAddresses } from '../contracts/addresses';

// Use blockchain types instead of main types
interface Round {
  id: number;
  startTime: number;
  endTime: number;
  winningNumbers: number[];
  isActive: boolean;
  numbersDrawn: boolean;
  vrfRequestId: number;
  prizesDistributed: boolean;
}

interface Ticket {
  id: number;
  emojis: number[];
  roundId: number;
  player: string;
  isUsed: boolean;
  isFreeTicket: boolean;
  mintTimestamp: number;
  paymentHash: string;
}

interface GameState {
  currentRound: Round | null;
  nextDrawTime: Date | null;
  timeRemaining: number;
  tickets: Ticket[];
  isLoading: boolean;
}

// Import ABIs
import LottoMojiCoreABI from '../contracts/abis/LottoMojiCore.json';
import LottoMojiTicketsABI from '../contracts/abis/LottoMojiTickets.json';
import LottoMojiPrizePoolABI from '../contracts/abis/LottoMojiPrizePool.json';

export const useContractGame = () => {
  const { address, chainId } = useAccount();
  const [gameState, setGameState] = useState<GameState>({
    currentRound: null,
    nextDrawTime: null,
    timeRemaining: 0,
    tickets: [],
    isLoading: true
  });

  // Get contract addresses for current chain
  const contracts = chainId ? getContractAddresses(chainId) : null;

  // Only enable reads if we have valid contracts
  const isEnabled = !!contracts?.LottoMojiCore && !!chainId && chainId === 84532; // Only Base Sepolia

  // Read current round info
  const { data: currentRoundData, refetch: refetchRound, error: roundError } = useReadContract({
    address: contracts?.LottoMojiCore as `0x${string}`,
    abi: LottoMojiCoreABI.abi,
    functionName: 'getCurrentRoundInfo',
    query: {
      enabled: isEnabled,
      retry: 2,
      retryDelay: 1000
    }
  });

  // Read user tickets for current round
  const { data: userTicketsData, refetch: refetchTickets } = useReadContract({
    address: contracts?.LottoMojiTickets as `0x${string}`,
    abi: LottoMojiTicketsABI.abi,
    functionName: 'getPlayerTicketsForRound',
    args: address && currentRoundData ? [address, currentRoundData[0]] : undefined,
    query: {
      enabled: isEnabled && !!address && !!currentRoundData,
      retry: 2,
      retryDelay: 1000
    }
  });

  // Get ETH price for ticket
  const { data: ethPriceData } = useReadContract({
    address: contracts?.LottoMojiPrizePool as `0x${string}`,
    abi: LottoMojiPrizePoolABI.abi,
    functionName: 'getETHAmountForTicket',
    query: {
      enabled: isEnabled,
      retry: 2,
      retryDelay: 1000
    }
  });

  // Write contracts
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Buy ticket with ETH
  const buyTicketWithETH = useCallback(async (emojis: number[]) => {
    if (!contracts?.LottoMojiCore || !ethPriceData) {
      console.error('Missing contract or ETH price data');
      return;
    }

    try {
      writeContract({
        address: contracts.LottoMojiCore as `0x${string}`,
        abi: LottoMojiCoreABI.abi,
        functionName: 'buyTicketWithETH',
        args: [emojis],
        value: ethPriceData as bigint
      });
    } catch (error) {
      console.error('Error buying ticket with ETH:', error);
      throw error;
    }
  }, [contracts?.LottoMojiCore, ethPriceData, writeContract]);

  // Buy ticket with USDC (requires approval first)
  const buyTicketWithUSDC = useCallback(async (emojis: number[]) => {
    if (!contracts?.LottoMojiCore) {
      console.error('Missing contract data');
      return;
    }

    try {
      writeContract({
        address: contracts.LottoMojiCore as `0x${string}`,
        abi: LottoMojiCoreABI.abi,
        functionName: 'buyTicketWithUSDC',
        args: [emojis]
      });
    } catch (error) {
      console.error('Error buying ticket with USDC:', error);
      throw error;
    }
  }, [contracts?.LottoMojiCore, writeContract]);

  // Process current round data
  useEffect(() => {
    if (currentRoundData && !roundError) {
      try {
        const [roundId, startTime, endTime, winningNumbers, isActive, numbersDrawn, vrfRequestId, prizesDistributed] = currentRoundData as any[];
        
        const round: Round = {
          id: Number(roundId),
          startTime: Number(startTime),
          endTime: Number(endTime),
          winningNumbers: winningNumbers || [],
          isActive,
          numbersDrawn,
          vrfRequestId: Number(vrfRequestId),
          prizesDistributed
        };

        const nextDrawTime = new Date(Number(endTime) * 1000);
        const now = Date.now();
        const timeRemaining = Math.max(0, nextDrawTime.getTime() - now);

        setGameState(prev => ({
          ...prev,
          currentRound: round,
          nextDrawTime,
          timeRemaining,
          isLoading: false
        }));
      } catch (error) {
        console.error('Error processing round data:', error);
        setGameState(prev => ({ ...prev, isLoading: false }));
      }
    } else if (roundError) {
      console.error('Error reading round data:', roundError);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, [currentRoundData, roundError]);

  // Process user tickets data
  useEffect(() => {
    const processTickets = async () => {
      if (userTicketsData && contracts?.LottoMojiTickets && address) {
        try {
          const ticketIds = userTicketsData as bigint[];
          const tickets: Ticket[] = [];

          // Get detailed info for each ticket
          for (const ticketId of ticketIds) {
            try {
              // For now, we'll create a basic structure
              // You might need to add separate contract calls to get emoji data
              tickets.push({
                id: Number(ticketId),
                emojis: [], // Will be fetched separately if needed
                roundId: gameState.currentRound?.id || 0,
                player: address,
                isUsed: false,
                isFreeTicket: false,
                mintTimestamp: Date.now(),
                paymentHash: ''
              });
            } catch (error) {
              console.error('Error fetching ticket details:', error);
            }
          }

          setGameState(prev => ({
            ...prev,
            tickets
          }));
        } catch (error) {
          console.error('Error processing tickets:', error);
        }
      }
    };

    processTickets();
  }, [userTicketsData, contracts?.LottoMojiTickets, address, gameState.currentRound?.id]);

  // Timer effect
  useEffect(() => {
    if (!gameState.nextDrawTime) return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (!prev.nextDrawTime) return prev;
        
        const now = Date.now();
        const timeRemaining = Math.max(0, prev.nextDrawTime.getTime() - now);
        
        return {
          ...prev,
          timeRemaining
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.nextDrawTime]);

  // Refresh data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        refetchRound();
        refetchTickets();
      }, 2000); // Wait 2 seconds for blockchain to update
    }
  }, [isConfirmed, refetchRound, refetchTickets]);

  // Log errors for debugging
  useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', writeError);
    }
  }, [writeError]);

  return {
    gameState,
    buyTicketWithETH,
    buyTicketWithUSDC,
    ethPrice: ethPriceData ? formatEther(ethPriceData as bigint) : null,
    isTransactionPending: isPending || isConfirming,
    isTransactionConfirmed: isConfirmed,
    refetch: () => {
      refetchRound();
      refetchTickets();
    },
    error: roundError || writeError,
    isValidChain: chainId === 84532
  };
}; 