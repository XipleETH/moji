import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, parseUnits } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';
import { useWallet } from '../contexts/WalletContext';

// Interfaces
export interface UserTicket {
  tokenId: string;
  numbers: number[];
  emojis: string[];
  gameDay: string;
  isActive: boolean;
  purchaseTime: number;
  matches?: number;
}

export interface UserTicketData {
  usdcBalance: bigint;
  usdcAllowance: bigint;
  ticketPrice: bigint;
  canBuyTicket: boolean;
  timeUntilNextDraw: bigint;
  ticketsOwned: bigint;
  userTickets: UserTicket[];
}

export interface TicketPurchaseState {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  step: 'idle' | 'checking-balance' | 'approving' | 'buying' | 'confirming' | 'success';
}

// V4 ABIs optimizadas
const LOTTO_MOJI_CORE_V4_ABI = [
  {
    inputs: [{ name: '_numbers', type: 'uint8[4]' }],
    name: 'buyTicket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'ticketPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'nextDrawTs',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'currentGameDay',
    outputs: [{ name: '', type: 'uint24' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tickets',
    outputs: [
      { name: 'purchaseTime', type: 'uint40' },
      { name: 'gameDay', type: 'uint24' },
      { name: 'claimed', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

const USDC_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export const useBlockchainTicketsV4 = () => {
  const { user, isConnected } = useWallet();
  
  const [userData, setUserData] = useState<UserTicketData>({
    usdcBalance: 0n,
    usdcAllowance: 0n,
    ticketPrice: 0n,
    canBuyTicket: false,
    timeUntilNextDraw: 0n,
    ticketsOwned: 0n,
    userTickets: []
  });
  
  const [purchaseState, setPurchaseState] = useState<TicketPurchaseState>({
    isLoading: false,
    error: null,
    txHash: null,
    step: 'idle'
  });

  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http()
  });

  // Cargar datos cuando cambia la conexión o dirección
  useEffect(() => {
    if (isConnected && user?.walletAddress) {
      console.log('[useBlockchainTicketsV4] Loading data for:', user.walletAddress);
      loadUserData();
      
      // Actualizar datos cada 30 segundos
      const interval = setInterval(() => {
        console.log('[useBlockchainTicketsV4] Periodic refresh');
        loadUserData();
      }, 30000);
      
      return () => clearInterval(interval);
    } else {
      // Reset data when disconnected
      console.log('[useBlockchainTicketsV4] Resetting data - user disconnected');
      setUserData({
        usdcBalance: 0n,
        usdcAllowance: 0n,
        ticketPrice: 0n,
        canBuyTicket: false,
        timeUntilNextDraw: 0n,
        ticketsOwned: 0n,
        userTickets: []
      });
    }
  }, [isConnected, user?.walletAddress]);

  const loadUserData = async () => {
    if (!user?.walletAddress || !isConnected) {
      console.log('[useBlockchainTicketsV4] No user or not connected');
      return;
    }

    console.log('[useBlockchainTicketsV4] Loading data for V4 contract:', user.walletAddress);
    setIsLoadingTickets(true);

    try {
      // Cargar datos básicos del contrato V4
      const [balance, allowance, ticketPrice, nextDrawTs, ticketsOwned, currentGameDay] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.USDC as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [user.walletAddress as `0x${string}`]
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.USDC as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [user.walletAddress as `0x${string}`, CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`]
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'ticketPrice'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'nextDrawTs'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'balanceOf',
          args: [user.walletAddress as `0x${string}`]
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'currentGameDay'
        })
      ]);

      console.log('[useBlockchainTicketsV4] Basic data loaded:', {
        ticketsOwned: ticketsOwned.toString(),
        balance: balance.toString(),
        allowance: allowance.toString(),
        ticketPrice: ticketPrice.toString(),
        currentGameDay: currentGameDay.toString()
      });

      // Calcular tiempo hasta próximo sorteo
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilDraw = Math.max(0, Number(nextDrawTs) - currentTime);

      console.log('[useBlockchainTicketsV4] Time calculation:', {
        currentTime,
        nextDrawTs: Number(nextDrawTs),
        timeUntilDraw
      });

      // Cargar tickets usando ERC721Enumerable (V4 feature!)
      const userTickets: UserTicket[] = [];

      if (Number(ticketsOwned) > 0) {
        console.log('[useBlockchainTicketsV4] Loading tickets via ERC721Enumerable:', Number(ticketsOwned));

        // Usar ERC721Enumerable para obtener IDs de tickets directamente
        const ticketPromises = [];
        for (let i = 0; i < Number(ticketsOwned); i++) {
          ticketPromises.push(
            publicClient.readContract({
              address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
              abi: LOTTO_MOJI_CORE_V4_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [user.walletAddress as `0x${string}`, BigInt(i)]
            }).then(async (tokenId) => {
              try {
                // Obtener información del ticket
                const ticketInfo = await publicClient.readContract({
                  address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
                  abi: LOTTO_MOJI_CORE_V4_ABI,
                  functionName: 'tickets',
                  args: [tokenId]
                });

                // V4 estructura: [purchaseTime, gameDay, claimed]
                const purchaseTime = Number(ticketInfo[0]);
                const gameDay = Number(ticketInfo[1]);
                const claimed = ticketInfo[2] as boolean;

                // Como no tenemos acceso directo a los números, usar números placeholder
                // TODO: Implementar función getter en el contrato o usar eventos
                const numbers = [0, 1, 2, 3]; // Placeholder
                const emojis = numbers.map(num => GAME_CONFIG.EMOJI_MAP[num] || '🎵');

                const ticket: UserTicket = {
                  tokenId: tokenId.toString(),
                  numbers: numbers,
                  emojis: emojis,
                  gameDay: gameDay.toString(),
                  isActive: !claimed,
                  purchaseTime: purchaseTime * 1000, // Convertir de segundos a milisegundos
                  matches: 0
                };

                return ticket;
              } catch (error) {
                console.warn(`[useBlockchainTicketsV4] Error loading ticket ${tokenId}:`, error);
                return null;
              }
            })
          );
        }

        // Resolver todas las promesas
        const results = await Promise.allSettled(ticketPromises);

        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            userTickets.push(result.value);
          }
        });

        // Ordenar tickets por gameDay y tokenId (más recientes primero)
        userTickets.sort((a, b) => {
          const gameDayDiff = Number(b.gameDay) - Number(a.gameDay);
          if (gameDayDiff !== 0) return gameDayDiff;
          return Number(b.tokenId) - Number(a.tokenId);
        });

        console.log('[useBlockchainTicketsV4] Loaded tickets:', userTickets.length);
        console.log('[useBlockchainTicketsV4] Tickets details:', userTickets.map(t => ({
          tokenId: t.tokenId,
          gameDay: t.gameDay,
          numbers: t.numbers,
          emojis: t.emojis,
          isActive: t.isActive
        })));
      }

      // Verificar si puede comprar tickets
      const canBuy = balance >= ticketPrice && allowance >= ticketPrice;

      const finalData: UserTicketData = {
        usdcBalance: balance,
        usdcAllowance: allowance,
        ticketPrice: ticketPrice,
        canBuyTicket: canBuy,
        timeUntilNextDraw: BigInt(timeUntilDraw),
        ticketsOwned: ticketsOwned,
        userTickets: userTickets
      };

      console.log('[useBlockchainTicketsV4] Final data:', {
        canBuyTicket: canBuy,
        ticketsCount: userTickets.length,
        usdcBalance: balance.toString(),
        allowance: allowance.toString(),
        ticketPrice: ticketPrice.toString()
      });

      setUserData(finalData);

    } catch (error) {
      console.error('[useBlockchainTicketsV4] Error loading user data:', error);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const buyTicket = async (emojiNumbers: string[]): Promise<string | null> => {
    if (!user?.walletAddress || !isConnected || !window.ethereum) {
      throw new Error('Wallet not connected');
    }

    // Convertir emojis a números
    const numberArray = emojiNumbers.map(emoji => {
      const index = GAME_CONFIG.EMOJI_MAP.indexOf(emoji);
      return index >= 0 ? index : 0;
    });

    const walletClient = createWalletClient({
      chain: avalancheFuji,
      transport: custom(window.ethereum)
    });

    setPurchaseState({ isLoading: true, error: null, txHash: null, step: 'checking-balance' });

    try {
      // Verificar allowance primero
      if (userData.usdcAllowance < userData.ticketPrice) {
        setPurchaseState(prev => ({ ...prev, step: 'approving' }));
        
        const approveHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.USDC as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`, parseUnits('10', 6)],
          account: user.walletAddress as `0x${string}`
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setPurchaseState(prev => ({ ...prev, step: 'buying' }));
      
      // Comprar ticket con V4 ABI
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
        abi: LOTTO_MOJI_CORE_V4_ABI,
        functionName: 'buyTicket',
        args: [numberArray as [number, number, number, number]],
        account: user.walletAddress as `0x${string}`
      });

      setPurchaseState(prev => ({ ...prev, step: 'confirming', txHash: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[buyTicket] V4 transaction confirmed:', receipt);

      // Actualizar datos después de la compra
      setTimeout(() => {
        loadUserData();
      }, 2000);

      setPurchaseState(prev => ({ ...prev, isLoading: false, step: 'success' }));
      return hash;

    } catch (error) {
      console.error('[buyTicket] V4 error:', error);
      setPurchaseState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        txHash: null,
        step: 'idle'
      });
      return null;
    }
  };

  const resetPurchaseState = () => {
    setPurchaseState({
      isLoading: false,
      error: null,
      txHash: null,
      step: 'idle'
    });
  };

  const refreshData = async () => {
    await loadUserData();
  };

  return {
    userData,
    userAddress: user?.walletAddress,
    isConnected,
    purchaseState,
    buyTicket,
    resetPurchaseState,
    refreshData,
    isLoadingTickets
  };
}; 