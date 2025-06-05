import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getContractAddresses } from '../contracts/addresses';
import { GameState, Round, Ticket, PaymentMethod } from '../contracts/types';

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

  // Read current round info
  const { data: currentRoundData, refetch: refetchRound } = useReadContract({
    address: contracts?.LottoMojiCore as `0x${string}`,
    abi: LottoMojiCoreABI.abi,
    functionName: 'getCurrentRoundInfo',
    query: {
      enabled: !!contracts?.LottoMojiCore
    }
  });

  // Read user tickets for current round
  const { data: userTicketsData, refetch: refetchTickets } = useReadContract({
    address: contracts?.LottoMojiTickets as `0x${string}`,
    abi: LottoMojiTicketsABI.abi,
    functionName: 'getPlayerTicketsForRound',
    args: address && currentRoundData ? [address, currentRoundData[0]] : undefined,
    query: {
      enabled: !!contracts?.LottoMojiTickets && !!address && !!currentRoundData
    }
  });

  // Get ETH price for ticket
  const { data: ethPriceData } = useReadContract({
    address: contracts?.LottoMojiPrizePool as `0x${string}`,
    abi: LottoMojiPrizePoolABI.abi,
    functionName: 'getETHAmountForTicket',
    query: {
      enabled: !!contracts?.LottoMojiPrizePool
    }
  });

  // Write contracts
  const { writeContract, data: txHash, isPending } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Buy ticket with ETH
  const buyTicketWithETH = useCallback(async (emojis: number[]) => {
    if (!contracts?.LottoMojiCore || !ethPriceData) return;

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
    if (!contracts?.LottoMojiCore) return;

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
    if (currentRoundData) {
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
    }
  }, [currentRoundData]);

  // Process user tickets data
  useEffect(() => {
    const processTickets = async () => {
      if (userTicketsData && contracts?.LottoMojiTickets) {
        const ticketIds = userTicketsData as bigint[];
        const tickets: Ticket[] = [];

        // Get detailed info for each ticket
        for (const ticketId of ticketIds) {
          try {
            // This would need to be implemented with a separate read call
            // For now, we'll create a basic structure
            tickets.push({
              id: Number(ticketId),
              emojis: [], // Will be fetched separately
              roundId: gameState.currentRound?.id || 0,
              player: address || '',
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
      }
    };

    processTickets();
  }, [userTicketsData, contracts?.LottoMojiTickets, address, gameState.currentRound?.id]);

  // Timer effect
  useEffect(() => {
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
  }, []);

  // Refresh data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      refetchRound();
      refetchTickets();
    }
  }, [isConfirmed, refetchRound, refetchTickets]);

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
    }
  };
}; 