import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';

// ABIs simplificados
const LOTTO_MOJI_MAIN_ABI = [
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
}

export const useBlockchainTickets = () => {
  const [userData, setUserData] = useState<UserTicketData>({
    usdcBalance: 0n,
    usdcAllowance: 0n,
    ticketPrice: 0n,
    canBuyTicket: false
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
    }
  }, [userAddress]);

  const loadUserData = async () => {
    if (!userAddress) return;

    try {
      const [balance, allowance, ticketPrice] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.USDC_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`]
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.USDC_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [userAddress as `0x${string}`, CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN as `0x${string}`]
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN as `0x${string}`,
          abi: LOTTO_MOJI_MAIN_ABI,
          functionName: 'TICKET_PRICE'
        })
      ]);

      const canBuy = balance >= ticketPrice;

      setUserData({
        usdcBalance: balance,
        usdcAllowance: allowance,
        ticketPrice: ticketPrice,
        canBuyTicket: canBuy
      });

    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  };

  const buyTicket = async (emojiNumbers: string[]): Promise<string | null> => {
    if (!userAddress || !window.ethereum) {
      throw new Error('Wallet no conectada');
    }

    // Convertir emojis a números
    const numberArray = emojiNumbers.map(emoji => {
      const index = GAME_CONFIG.EMOJIS.indexOf(emoji);
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
          address: CONTRACT_ADDRESSES.USDC_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN as `0x${string}`, userData.ticketPrice * 10n],
          account: userAddress as `0x${string}`
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setPurchaseState(prev => ({ ...prev, step: 'buying' }));

      // Comprar ticket
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN as `0x${string}`,
        abi: LOTTO_MOJI_MAIN_ABI,
        functionName: 'buyTicket',
        args: [numberArray as [number, number, number, number]],
        account: userAddress as `0x${string}`
      });

      setPurchaseState(prev => ({ ...prev, step: 'confirming', txHash: hash }));
      await publicClient.waitForTransactionReceipt({ hash });

      setPurchaseState({ isLoading: false, error: null, txHash: hash, step: 'success' });
      await loadUserData();
      
      return hash;

    } catch (error: any) {
      setPurchaseState({ 
        isLoading: false, 
        error: error.message || 'Error comprando ticket', 
        txHash: null, 
        step: 'idle' 
      });
      return null;
    }
  };

  const resetPurchaseState = () => {
    setPurchaseState({ isLoading: false, error: null, txHash: null, step: 'idle' });
  };

  return {
    userData,
    userAddress,
    purchaseState,
    buyTicket,
    loadUserData,
    resetPurchaseState,
    formatUSDC: (amount: bigint) => formatUnits(amount, 6)
  };
}; 