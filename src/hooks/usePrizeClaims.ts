import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '../utils/contractAddresses';
import { useWallet } from '../contexts/WalletContext';
import { useBlockchainTickets } from './useBlockchainTickets';

// Interfaces para premios
export interface WinningTicket {
  tokenId: string;
  numbers: number[];
  emojis: string[];
  gameDay: string;
  prizeType: 'first' | 'second' | 'third' | 'free';
  prizeAmount?: string; // En USDC
  isClaimable: boolean;
  isClaimed: boolean;
}

export interface ClaimState {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  step: 'idle' | 'checking' | 'claiming' | 'confirming' | 'success';
  claimedTickets: string[];
}

// ABI específico para reclamación de premios
const PRIZE_CLAIM_ABI = [
  {
    inputs: [{ name: '_ticketId', type: 'uint256' }],
    name: 'claimPrize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameDay', type: 'uint256' }],
    name: 'dailyPools',
    outputs: [
      { name: 'totalCollected', type: 'uint256' },
      { name: 'mainPoolPortion', type: 'uint256' },
      { name: 'reservePortion', type: 'uint256' },
      { name: 'firstPrizeDaily', type: 'uint256' },
      { name: 'secondPrizeDaily', type: 'uint256' },
      { name: 'thirdPrizeDaily', type: 'uint256' },
      { name: 'developmentDaily', type: 'uint256' },
      { name: 'distributed', type: 'bool' },
      { name: 'distributionTime', type: 'uint256' },
      { name: 'drawn', type: 'bool' },
      { name: 'reservesSent', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'ticketId', type: 'uint256' }],
    name: 'getFullTicketInfo',
    outputs: [
      { name: 'ticketOwner', type: 'address' },
      { name: 'numbers', type: 'uint8[4]' },
      { name: 'gameDay', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'purchaseTime', type: 'uint256' },
      { name: 'eligibleForReserve', type: 'bool' },
      { name: 'matches', type: 'uint8' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getCurrentDay',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export const usePrizeClaims = () => {
  const { user, isConnected } = useWallet();
  const { userData } = useBlockchainTickets();
  
  const [winningTickets, setWinningTickets] = useState<WinningTicket[]>([]);
  const [claimState, setClaimState] = useState<ClaimState>({
    isLoading: false,
    error: null,
    txHash: null,
    step: 'idle',
    claimedTickets: []
  });
  const [isLoadingWinners, setIsLoadingWinners] = useState(false);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  // Función para determinar el tipo de premio basado en coincidencias
  const getPrizeType = (ticketNumbers: number[], winningNumbers: number[]): 'first' | 'second' | 'third' | 'free' | null => {
    if (!winningNumbers || winningNumbers.length !== 4) return null;

    // Contar coincidencias exactas (posición correcta)
    let exactMatches = 0;
    for (let i = 0; i < 4; i++) {
      if (ticketNumbers[i] === winningNumbers[i]) {
        exactMatches++;
      }
    }

    // Contar coincidencias totales (cualquier posición)
    let totalMatches = 0;
    const winningCounts = new Map<number, number>();
    const ticketCounts = new Map<number, number>();
    
    // Contar ocurrencias en números ganadores
    winningNumbers.forEach(num => {
      winningCounts.set(num, (winningCounts.get(num) || 0) + 1);
    });
    
    // Contar coincidencias
    ticketNumbers.forEach(num => {
      if (winningCounts.has(num) && (ticketCounts.get(num) || 0) < winningCounts.get(num)!) {
        totalMatches++;
        ticketCounts.set(num, (ticketCounts.get(num) || 0) + 1);
      }
    });

    // Lógica de premios según el contrato
    if (exactMatches === 4) {
      return 'first'; // 🥇 Primer Premio: 4 en posición exacta
    } else if (totalMatches === 4) {
      return 'second'; // 🥈 Segundo Premio: 4 en cualquier orden
    } else if (exactMatches === 3) {
      return 'third'; // 🥉 Tercer Premio: 3 en posición exacta
    } else if (totalMatches >= 3) {
      return 'free'; // 🎫 Ticket Gratis: 3+ en cualquier orden
    }
    
    return null;
  };

  // Función para obtener números ganadores de un día específico
  const getWinningNumbers = async (gameDay: string): Promise<number[] | null> => {
    try {
      const dailyPool = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
        abi: PRIZE_CLAIM_ABI,
        functionName: 'dailyPools',
        args: [BigInt(gameDay)]
      });

      // Si el sorteo no se ha ejecutado, no hay números ganadores
      if (!dailyPool[9]) { // drawn field
        return null;
      }

      // Los números ganadores están almacenados en el contrato
      // Para obtenerlos necesitaríamos más funciones del ABI
      // Por ahora usaremos los números conocidos del día 20267
      if (gameDay === '20267') {
        return [18, 20, 23, 17]; // Números ganadores conocidos
      }

      return null;
    } catch (error) {
      console.error('Error getting winning numbers:', error);
      return null;
    }
  };

  // Función para detectar tickets ganadores
  const detectWinningTickets = async () => {
    if (!user?.walletAddress || !isConnected || userData.userTickets.length === 0) {
      return;
    }

    setIsLoadingWinners(true);

    try {
      const winners: WinningTicket[] = [];
      
      // Agrupar tickets por día de juego
      const ticketsByDay = new Map<string, typeof userData.userTickets>();
      userData.userTickets.forEach(ticket => {
        const day = ticket.gameDay;
        if (!ticketsByDay.has(day)) {
          ticketsByDay.set(day, []);
        }
        ticketsByDay.get(day)!.push(ticket);
      });

      // Revisar tickets de cada día
      for (const [gameDay, tickets] of ticketsByDay) {
        const winningNumbers = await getWinningNumbers(gameDay);
        
        if (!winningNumbers) continue;

        // Revisar cada ticket del día
        for (const ticket of tickets) {
          const prizeType = getPrizeType(ticket.numbers, winningNumbers);
          
          if (prizeType) {
            // Verificar si el ticket sigue activo (no reclamado)
            try {
              const ticketInfo = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
                abi: PRIZE_CLAIM_ABI,
                functionName: 'getFullTicketInfo',
                args: [BigInt(ticket.tokenId)]
              });

              const isActive = ticketInfo[3];
              
              winners.push({
                tokenId: ticket.tokenId,
                numbers: ticket.numbers,
                emojis: ticket.emojis,
                gameDay: ticket.gameDay,
                prizeType,
                prizeAmount: getPrizeAmount(prizeType, gameDay),
                isClaimable: isActive,
                isClaimed: !isActive
              });
            } catch (error) {
              console.warn(`Error checking ticket ${ticket.tokenId}:`, error);
            }
          }
        }
      }

      setWinningTickets(winners);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[usePrizeClaims] Found winning tickets:', winners);
      }

    } catch (error) {
      console.error('Error detecting winning tickets:', error);
    } finally {
      setIsLoadingWinners(false);
    }
  };

  // Función para estimar el monto del premio
  const getPrizeAmount = (prizeType: 'first' | 'second' | 'third' | 'free', gameDay: string): string => {
    // Montos estimados basados en los pools conocidos
    if (gameDay === '20267') {
      switch (prizeType) {
        case 'first': return '6.528'; // USDC
        case 'second': return '0.816'; // USDC
        case 'third': return '0.408'; // USDC
        case 'free': return '1'; // Ticket gratis
        default: return '0';
      }
    }
    return '0';
  };

  // Función para reclamar un premio específico
  const claimPrize = async (ticketId: string): Promise<string | null> => {
    if (!user?.walletAddress || !isConnected || !window.ethereum) {
      throw new Error('Wallet not connected');
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    setClaimState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      txHash: null, 
      step: 'checking' 
    }));

    try {
      setClaimState(prev => ({ ...prev, step: 'claiming' }));
      
      // Ejecutar claimPrize
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
        abi: PRIZE_CLAIM_ABI,
        functionName: 'claimPrize',
        args: [BigInt(ticketId)],
        account: user.walletAddress as `0x${string}`
      });

      setClaimState(prev => ({ ...prev, step: 'confirming', txHash: hash }));
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (process.env.NODE_ENV === 'development') {
        console.log('[claimPrize] Transaction confirmed:', receipt);
      }

      // Actualizar estado
      setClaimState(prev => ({ 
        ...prev, 
        isLoading: false, 
        step: 'success',
        claimedTickets: [...prev.claimedTickets, ticketId]
      }));

      // Actualizar lista de tickets ganadores
      setWinningTickets(prev => 
        prev.map(ticket => 
          ticket.tokenId === ticketId 
            ? { ...ticket, isClaimable: false, isClaimed: true }
            : ticket
        )
      );

      return hash;

    } catch (error) {
      console.error('Error claiming prize:', error);
      setClaimState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error claiming prize',
        step: 'idle'
      }));
      return null;
    }
  };

  // Función para reclamar múltiples premios
  const claimMultiplePrizes = async (ticketIds: string[]): Promise<string[]> => {
    const results: string[] = [];
    
    for (const ticketId of ticketIds) {
      try {
        const hash = await claimPrize(ticketId);
        if (hash) {
          results.push(hash);
        }
        // Pequeña pausa entre reclamaciones
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error claiming ticket ${ticketId}:`, error);
      }
    }
    
    return results;
  };

  const resetClaimState = () => {
    setClaimState({
      isLoading: false,
      error: null,
      txHash: null,
      step: 'idle',
      claimedTickets: []
    });
  };

  // Detectar tickets ganadores cuando cambian los datos
  useEffect(() => {
    console.log('[usePrizeClaims] Effect triggered:', {
      isConnected,
      userWalletAddress: user?.walletAddress,
      userTicketsLength: userData.userTickets.length,
      userTickets: userData.userTickets
    });
    
    if (isConnected && user?.walletAddress && userData.userTickets.length > 0) {
      console.log('[usePrizeClaims] Starting detection for wallet:', user.walletAddress);
      detectWinningTickets();
    } else {
      console.log('[usePrizeClaims] Skipping detection:', {
        isConnected,
        hasWallet: !!user?.walletAddress,
        hasTickets: userData.userTickets.length > 0
      });
    }
  }, [isConnected, user?.walletAddress, userData.userTickets.length]);

  // DEBUGGING: Mostrar siempre al menos información básica
  useEffect(() => {
    console.log('[usePrizeClaims] Current state:', {
      winningTickets: winningTickets.length,
      claimableTickets: winningTickets.filter(t => t.isClaimable).length,
      claimedTickets: winningTickets.filter(t => t.isClaimed).length,
      totalPrizeValue,
      isLoadingWinners,
      claimState
    });
  }, [winningTickets, totalPrizeValue, isLoadingWinners, claimState]);

  // Estadísticas de resumen
  const claimableTickets = winningTickets.filter(t => t.isClaimable);
  const claimedTickets = winningTickets.filter(t => t.isClaimed);
  const totalPrizeValue = claimableTickets.reduce((sum, ticket) => {
    return sum + (ticket.prizeType === 'free' ? 0 : parseFloat(ticket.prizeAmount || '0'));
  }, 0);

  return {
    winningTickets,
    claimableTickets,
    claimedTickets,
    totalPrizeValue,
    claimState,
    isLoadingWinners,
    claimPrize,
    claimMultiplePrizes,
    resetClaimState,
    detectWinningTickets
  };
};
