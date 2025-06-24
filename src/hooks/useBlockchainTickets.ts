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
    inputs: [{ name: '', type: 'uint256' }],
    name: 'tickets',
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'ticketOwner', type: 'address' },
      { name: 'numbers', type: 'uint8[4]' },
      { name: 'gameDay', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'purchaseTime', type: 'uint256' },
      { name: 'eligibleForReserve', type: 'bool' }
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

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  // Cargar datos cuando cambia la conexión o dirección
  useEffect(() => {
    if (isConnected && user?.walletAddress) {
      loadUserData();
      // Actualizar datos cada 30 segundos
      const interval = setInterval(loadUserData, 30000);
      return () => clearInterval(interval);
    } else {
      // Reset data when disconnected
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
      
      // Limitar a los últimos 20 tickets para evitar demasiadas llamadas
      const ticketIdsToLoad = userTicketIds.slice(-20);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useBlockchainTickets] Loading ticket details for IDs:', ticketIdsToLoad);
      }
      
      for (const ticketId of ticketIdsToLoad) {
        try {
          const [ticketInfo, ticketDetails] = await Promise.all([
            publicClient.readContract({
              address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
              abi: LOTTO_MOJI_CORE_ABI,
              functionName: 'getTicketInfo',
              args: [ticketId]
            }),
            publicClient.readContract({
              address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
              abi: LOTTO_MOJI_CORE_ABI,
              functionName: 'tickets',
              args: [ticketId]
            })
          ]);

          const numbers = Array.from(ticketInfo[1]);
          const emojis = numbers.map(num => GAME_CONFIG.EMOJI_MAP[num] || '🎵');
          
          const ticket: UserTicket = {
            tokenId: ticketId.toString(),
            numbers: numbers,
            emojis: emojis,
            gameDay: ticketInfo[2].toString(),
            isActive: ticketInfo[3],
            purchaseTime: Number(ticketDetails[5]) * 1000, // Convert to milliseconds
            matches: ticketInfo[4]
          };
          userTickets.push(ticket);
        } catch (error) {
          console.warn(`Error loading ticket ${ticketId}:`, error);
        }
      }

      // Ordenar tickets por tiempo de compra (más recientes primero)
      userTickets.sort((a, b) => b.purchaseTime - a.purchaseTime);

      const canBuy = balance >= ticketPrice && allowance >= ticketPrice;

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
        console.log('[useBlockchainTickets] Final user data:', finalData);
      }

      setUserData(finalData);

    } catch (error) {
      console.error('[useBlockchainTickets] Error loading user data:', error);
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
      await publicClient.waitForTransactionReceipt({ hash });

      // Recargar datos del usuario
      await loadUserData();

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

  return {
    userData,
    userAddress: user?.walletAddress,
    isConnected,
    purchaseState,
    buyTicket,
    resetPurchaseState,
    refreshData: loadUserData
  };
}; 