import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';

// ABI del contrato LottoMojiCore desplegado
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
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
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
    inputs: [],
    name: 'totalDrawsExecuted',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'round', type: 'uint256' }],
    name: 'roundWinners',
    outputs: [{ name: '', type: 'uint8[4]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'lastWinningNumbers',
    outputs: [{ name: '', type: 'uint8[4]' }],
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

export interface BlockchainTicket {
  id: string;
  tokenId: number;
  numbers: number[];
  buyer: string;
  gameDay: number;
  timestamp: number;
  txHash: string;
}

export interface TicketPurchaseState {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  step: 'idle' | 'checking-balance' | 'approving' | 'buying' | 'confirming' | 'success';
}

export interface UserTicketData {
  usdcBalance: bigint;
  usdcAllowance: bigint;
  ticketPrice: bigint;
  canBuyTicket: boolean;
  timeUntilNextDraw: bigint;
  ticketsOwned: bigint;
}

export const useBlockchainTickets = () => {
  const [userData, setUserData] = useState<UserTicketData>({
    usdcBalance: 0n,
    usdcAllowance: 0n,
    ticketPrice: 0n,
    canBuyTicket: false,
    timeUntilNextDraw: 0n,
    ticketsOwned: 0n
  });
  const [purchaseState, setPurchaseState] = useState<TicketPurchaseState>({
    isLoading: false,
    error: null,
    txHash: null,
    step: 'idle'
  });
  const [userAddress, setUserAddress] = useState<string | null>(null);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  useEffect(() => {
    const detectWallet = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setUserAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error detectando wallet:', error);
        }
      }
    };
    detectWallet();
  }, []);

  useEffect(() => {
    if (userAddress) {
      loadUserData();
      // Actualizar datos cada 30 segundos
      const interval = setInterval(loadUserData, 30000);
      return () => clearInterval(interval);
    }
  }, [userAddress]);

  const loadUserData = async () => {
    if (!userAddress) return;

    try {
      const [balance, allowance, ticketPrice, lastDrawTime, drawInterval, ticketsOwned] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.USDC as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`]
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.USDC as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [userAddress as `0x${string}`, CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`]
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
          args: [userAddress as `0x${string}`]
        })
      ]);

      // Calcular tiempo hasta próximo sorteo
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const nextDrawTime = lastDrawTime + drawInterval;
      const timeUntilDraw = nextDrawTime > currentTime ? nextDrawTime - currentTime : 0n;

      const canBuy = balance >= ticketPrice;

      setUserData({
        usdcBalance: balance,
        usdcAllowance: allowance,
        ticketPrice: ticketPrice,
        canBuyTicket: canBuy,
        timeUntilNextDraw: timeUntilDraw,
        ticketsOwned: ticketsOwned
      });

    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  };

  const buyTicket = async (emojiNumbers: string[]): Promise<string | null> => {
    if (!userAddress || !window.ethereum) {
      throw new Error('Wallet no conectada');
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
      // Verificar allowance
      if (userData.usdcAllowance < userData.ticketPrice) {
        setPurchaseState(prev => ({ ...prev, step: 'approving' }));
        
        const approveHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.USDC as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`, userData.ticketPrice * 10n],
          account: userAddress as `0x${string}`
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
        account: userAddress as `0x${string}`
      });

      setPurchaseState(prev => ({ ...prev, step: 'confirming', txHash: hash }));
      await publicClient.waitForTransactionReceipt({ hash });

      // Recargar datos del usuario
      await loadUserData();

      setPurchaseState(prev => ({ ...prev, isLoading: false, step: 'success' }));
      return hash;

    } catch (error) {
      console.error('Error comprando ticket:', error);
      setPurchaseState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
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
    purchaseState,
    buyTicket,
    resetPurchaseState,
    userAddress
  };
}; 