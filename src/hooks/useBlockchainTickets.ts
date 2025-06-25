import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';
import { useWallet } from '../contexts/WalletContext';

// Interfaces simplificadas
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

// ABIs
const LOTTO_MOJI_CORE_ABI = [
  {
    inputs: [{ name: '_numbers', type: 'uint8[4]' }],
    name: 'buyTicket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'TICKET_PRICE',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'lastDrawTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'DRAW_INTERVAL',
    outputs: [{ name: '', type: 'uint256' }],
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
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserTickets',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'ticketId', type: 'uint256' }],
    name: 'getTicketInfo',
    outputs: [
      { name: 'ticketOwner', type: 'address' },
      { name: 'numbers', type: 'uint8[4]' },
      { name: 'gameDay', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'matches', type: 'uint8' }
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

export const useBlockchainTickets = () => {
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
    chain: baseSepolia,
    transport: http()
  });

  // Cargar datos cuando cambia la conexión o dirección
  useEffect(() => {
    if (isConnected && user?.walletAddress) {
      console.log('[useBlockchainTickets] Loading initial data for:', user.walletAddress);
      loadUserData();
      // Actualizar datos cada 30 segundos
      const interval = setInterval(() => {
        console.log('[useBlockchainTickets] Periodic refresh');
        loadUserData();
      }, 30000);
      return () => clearInterval(interval);
    } else {
      // Reset data when disconnected
      console.log('[useBlockchainTickets] Resetting data - user disconnected');
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
      console.log('[useBlockchainTickets] No user or not connected:', { user: !!user, isConnected });
      return;
    }

    console.log('[useBlockchainTickets] Loading data for:', user.walletAddress);
    setIsLoadingTickets(true);

    try {
      const [balance, allowance, ticketPrice, lastDrawTime, drawInterval, ticketsOwned, userTicketIds] = await Promise.all([
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
          abi: LOTTO_MOJI_CORE_ABI,
          functionName: 'TICKET_PRICE'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_ABI,
          functionName: 'lastDrawTime'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_ABI,
          functionName: 'DRAW_INTERVAL'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_ABI,
          functionName: 'balanceOf',
          args: [user.walletAddress as `0x${string}`]
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_ABI,
          functionName: 'getUserTickets',
          args: [user.walletAddress as `0x${string}`]
        })
      ]);

      if (process.env.NODE_ENV === 'development') {
        console.log('[useBlockchainTickets] Contract data loaded:', {
          ticketsOwned: ticketsOwned.toString(),
          userTicketIds: userTicketIds,
          userTicketIdsLength: userTicketIds.length,
          balance: balance.toString(),
          allowance: allowance.toString()
        });
      }

      // Calcular tiempo hasta próximo sorteo
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const nextDrawTime = lastDrawTime + drawInterval;
      const timeUntilDraw = nextDrawTime > currentTime ? nextDrawTime - currentTime : 0n;

      // Obtener información detallada de los tickets
      const userTickets: UserTicket[] = [];
      
      // Cargar más tickets pero con límite razonable - últimos 25 tickets
      const ticketIdsToLoad = userTicketIds.slice(-25);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useBlockchainTickets] Loading ticket details for IDs:', ticketIdsToLoad);
      }

      // Intentar cargar desde localStorage primero para tickets recientes
      const cacheKey = `blockchain-tickets-${user.walletAddress}`;
      let cachedTickets: UserTicket[] = [];
      
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          cachedTickets = JSON.parse(cached);
          // Solo usar cache si es reciente (últimas 2 horas)
          const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
          cachedTickets = cachedTickets.filter(ticket => ticket.purchaseTime > twoHoursAgo);
        }
      } catch (error) {
        console.warn('Error loading cached tickets:', error);
      }

      // Cargar tickets en paralelo pero con mejor manejo de errores
      const ticketPromises = ticketIdsToLoad.map(async (ticketId, index) => {
        try {
          // Verificar si ya tenemos este ticket en cache
          const cachedTicket = cachedTickets.find(t => t.tokenId === ticketId.toString());
          if (cachedTicket) {
            return cachedTicket;
          }

          // Usar getFullTicketInfo para obtener toda la información incluyendo purchaseTime
          const ticketInfo = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
            abi: LOTTO_MOJI_CORE_ABI,
            functionName: 'getFullTicketInfo',
            args: [ticketId]
          });

          const numbers = Array.from(ticketInfo[1]);
          const emojis = numbers.map(num => GAME_CONFIG.EMOJI_MAP[num] || '🎵');
          
          const ticket = {
            tokenId: ticketId.toString(),
            numbers: numbers,
            emojis: emojis,
            gameDay: ticketInfo[2].toString(),
            isActive: ticketInfo[3],
            purchaseTime: Number(ticketInfo[4]) * 1000, // Convert from seconds to milliseconds
            matches: ticketInfo[6]
          };

          return ticket;
        } catch (error) {
          console.warn(`Error loading ticket ${ticketId}:`, error);
          return null;
        }
      });

      // Usar Promise.allSettled sin timeout tan estricto
      const results = await Promise.allSettled(ticketPromises);

          results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              userTickets.push(result.value);
            }
          });

      // Ordenar tickets por tiempo de compra (más recientes primero)
      userTickets.sort((a, b) => b.purchaseTime - a.purchaseTime);

      // Guardar en localStorage para próximas cargas
      try {
        localStorage.setItem(cacheKey, JSON.stringify(userTickets));
      } catch (error) {
        console.warn('Error caching tickets:', error);
      }

      // Permitir comprar si tiene suficiente balance (el allowance se maneja en buyTicket)
      const canBuy = balance >= ticketPrice;

      const finalData = {
        usdcBalance: balance,
        usdcAllowance: allowance,
        ticketPrice: ticketPrice,
        canBuyTicket: canBuy,
        timeUntilNextDraw: timeUntilDraw,
        ticketsOwned: ticketsOwned,
        userTickets: userTickets
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('[useBlockchainTickets] Final user data:', {
          ...finalData,
          ticketsOwned: finalData.ticketsOwned.toString(),
          userTicketsCount: finalData.userTickets.length,
          usdcBalance: finalData.usdcBalance.toString()
        });
      }

      setUserData(finalData);

    } catch (error) {
      console.error('[useBlockchainTickets] Error loading user data:', error);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const buyTicket = async (emojiNumbers: string[]): Promise<string | null> => {
    if (!user?.walletAddress || !isConnected || !window.ethereum) {
      throw new Error('Wallet not connected');
    }

    // Convertir emojis a números (usando EMOJI_MAP)
    const numberArray = emojiNumbers.map(emoji => {
      const index = GAME_CONFIG.EMOJI_MAP.indexOf(emoji);
      return index >= 0 ? index : 0;
    });

    const walletClient = createWalletClient({
      chain: baseSepolia,
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
          args: [CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`, parseUnits('10', 6)], // Approve 10 USDC
          account: user.walletAddress as `0x${string}`
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setPurchaseState(prev => ({ ...prev, step: 'buying' }));
      
      // Comprar ticket
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
        abi: LOTTO_MOJI_CORE_ABI,
        functionName: 'buyTicket',
        args: [numberArray as [number, number, number, number]],
        account: user.walletAddress as `0x${string}`
      });

      setPurchaseState(prev => ({ ...prev, step: 'confirming', txHash: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (process.env.NODE_ENV === 'development') {
        console.log('[buyTicket] Transaction confirmed:', receipt);
      }

      // Limpiar cache para forzar recarga completa
      const cacheKey = `blockchain-tickets-${user.walletAddress}`;
      try {
        localStorage.removeItem(cacheKey);
      } catch (error) {
        console.warn('Error clearing cache:', error);
      }

      // Actualización inmediata después de confirmación con retry
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Esperar 1s, 2s, 3s
      await loadUserData();
          break;
        } catch (error) {
          retryCount++;
          console.warn(`Retry ${retryCount} loading data after purchase:`, error);
          if (retryCount >= maxRetries) {
            console.error('Failed to reload data after purchase, but transaction was successful');
          }
        }
      }

      setPurchaseState(prev => ({ ...prev, isLoading: false, step: 'success' }));
      return hash;

    } catch (error) {
      console.error('Error buying ticket:', error);
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

  const clearCache = () => {
    if (user?.walletAddress) {
      const cacheKey = `blockchain-tickets-${user.walletAddress}`;
      try {
        localStorage.removeItem(cacheKey);
        console.log('[useBlockchainTickets] Cache cleared for:', user.walletAddress);
      } catch (error) {
        console.warn('Error clearing cache:', error);
      }
    }
  };

  const refreshDataWithClearCache = async () => {
    clearCache();
    await loadUserData();
  };

  return {
    userData,
    userAddress: user?.walletAddress,
    isConnected,
    purchaseState,
    buyTicket,
    resetPurchaseState,
    refreshData: refreshDataWithClearCache,
    isLoadingTickets,
    clearCache
  };
}; 