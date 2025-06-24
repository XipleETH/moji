import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';
import { ethers } from 'ethers';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

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
  userTickets: UserTicket[];
}

interface UserTicket {
  tokenId: string;
  numbers: number[];
  emojis: string[];
  gameDay: string;
  isActive: boolean;
  purchaseTime: number;
  matches?: number;
}

interface UserData {
  isConnected: boolean;
  usdcBalance: bigint;
  usdcAllowance: bigint;
  ticketPrice: bigint;
  canBuyTicket: boolean;
  ticketsOwned: bigint;
  timeUntilNextDraw: bigint;
  userTickets: UserTicket[];
}

interface PurchaseState {
  isLoading: boolean;
  step: 'idle' | 'checking-balance' | 'approving' | 'buying' | 'confirming' | 'success' | 'error';
  error: string | null;
  txHash: string | null;
}

// ABI para leer tickets del usuario
const TICKET_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)",
  "function getTicketInfo(uint256) view returns (address ticketOwner, uint8[4] numbers, uint256 gameDay, bool isActive, uint8 matches)",
  "function tickets(uint256) view returns (uint256 tokenId, address ticketOwner, uint8[4] numbers, uint256 gameDay, bool isActive, uint256 purchaseTime, bool eligibleForReserve)",
  "function getUserTickets(address) view returns (uint256[])",
  "function TICKET_PRICE() view returns (uint256)",
  "function getCurrentDay() view returns (uint256)",
  "function timeUntilNextDraw() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function buyTicket(uint8[4])"
];

export function useBlockchainTickets() {
  const { address: userAddress } = useAccount();
  
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

  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

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
            setUserData(prev => ({ ...prev, isConnected: true }));
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
      fetchUserData();
      // Actualizar datos cada 30 segundos
      const interval = setInterval(fetchUserData, 30000);
      return () => clearInterval(interval);
    }
  }, [userAddress]);

  const fetchUserData = async () => {
    if (!userAddress) {
      setUserData(prev => ({ ...prev, isConnected: false, userTickets: [] }));
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
      const lottoContract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, TICKET_ABI, provider);
      const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.USDC, USDC_ABI, provider);

      const [
        usdcBalance,
        usdcAllowance,
        ticketPrice,
        ticketsOwned,
        timeUntilNextDraw,
        userTicketIds
      ] = await Promise.all([
        usdcContract.balanceOf(userAddress),
        usdcContract.allowance(userAddress, CONTRACT_ADDRESSES.LOTTO_MOJI_CORE),
        lottoContract.TICKET_PRICE(),
        lottoContract.balanceOf(userAddress),
        lottoContract.timeUntilNextDraw(),
        lottoContract.getUserTickets(userAddress)
      ]);

      // Obtener información detallada de cada ticket
      const ticketDetails: UserTicket[] = [];
      
      for (let i = 0; i < Math.min(userTicketIds.length, 20); i++) { // Limit to 20 most recent
        try {
          const tokenId = userTicketIds[i];
          const ticketInfo = await lottoContract.tickets(tokenId);
          
          const ticket: UserTicket = {
            tokenId: tokenId.toString(),
            numbers: ticketInfo.numbers.map((n: any) => Number(n)),
            emojis: ticketInfo.numbers.map((n: any) => GAME_CONFIG.EMOJI_MAP[Number(n)]),
            gameDay: ticketInfo.gameDay.toString(),
            isActive: ticketInfo.isActive,
            purchaseTime: Number(ticketInfo.purchaseTime) * 1000, // Convert to milliseconds
          };
          
          ticketDetails.push(ticket);
        } catch (error) {
          console.warn(`Error fetching ticket ${userTicketIds[i]}:`, error);
        }
      }

      // Sort tickets by purchase time (newest first)
      ticketDetails.sort((a, b) => b.purchaseTime - a.purchaseTime);

      const canBuyTicket = usdcBalance >= ticketPrice && usdcAllowance >= ticketPrice;

      setUserData({
        isConnected: true,
        usdcBalance,
        usdcAllowance,
        ticketPrice,
        canBuyTicket,
        ticketsOwned,
        timeUntilNextDraw,
        userTickets: ticketDetails
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(prev => ({ 
        ...prev, 
        isConnected: !!userAddress,
        userTickets: []
      }));
    }
  };

  const buyTicket = async (selectedEmojis: string[]) => {
    if (!userAddress || selectedEmojis.length !== 4) {
      throw new Error('Invalid parameters for ticket purchase');
    }

    try {
      setPurchaseState({
        isLoading: true,
        step: 'checking-balance',
        error: null,
        txHash: null
      });

      const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
      const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.USDC, USDC_ABI, provider);
      
      // Check USDC balance and allowance
      const [balance, allowance, ticketPrice] = await Promise.all([
        usdcContract.balanceOf(userAddress),
        usdcContract.allowance(userAddress, CONTRACT_ADDRESSES.LOTTO_MOJI_CORE),
        new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, TICKET_ABI, provider).TICKET_PRICE()
      ]);

      if (balance < ticketPrice) {
        throw new Error('Insufficient USDC balance');
      }

      // Convert emojis to indices
      const emojiIndices = selectedEmojis.map(emoji => {
        const index = GAME_CONFIG.EMOJI_MAP.indexOf(emoji);
        if (index === -1) throw new Error(`Invalid emoji: ${emoji}`);
        return index;
      });

      // Approve USDC if needed
      if (allowance < ticketPrice) {
        setPurchaseState(prev => ({ ...prev, step: 'approving' }));
        
        await writeContract({
          address: CONTRACT_ADDRESSES.USDC as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, parseUnits('10', 6)] // Approve 10 USDC
        });

        // Wait for approval
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Buy ticket
      setPurchaseState(prev => ({ ...prev, step: 'buying' }));
      
      await writeContract({
        address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
        abi: TICKET_ABI,
        functionName: 'buyTicket',
        args: [emojiIndices]
      });

      setPurchaseState(prev => ({ ...prev, step: 'confirming' }));

    } catch (error: any) {
      console.error('Error buying ticket:', error);
      setPurchaseState({
        isLoading: false,
        step: 'error',
        error: error.message || 'Failed to buy ticket',
        txHash: null
      });
    }
  };

  const resetPurchaseState = () => {
    setPurchaseState({
      isLoading: false,
      step: 'idle',
      error: null,
      txHash: null
    });
  };

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      setPurchaseState({
        isLoading: false,
        step: 'success',
        error: null,
        txHash: hash
      });
      
      // Refresh user data after successful purchase
      setTimeout(fetchUserData, 2000);
    }
  }, [isSuccess, hash]);

  // Handle transaction error
  useEffect(() => {
    if (writeError) {
      setPurchaseState({
        isLoading: false,
        step: 'error',
        error: writeError.message || 'Transaction failed',
        txHash: null
      });
    }
  }, [writeError]);

  // Update loading state
  useEffect(() => {
    if (isPending || isConfirming) {
      setPurchaseState(prev => ({
        ...prev,
        isLoading: true,
        step: isPending ? 'buying' : 'confirming'
      }));
    }
  }, [isPending, isConfirming]);

  return {
    userData,
    userAddress,
    purchaseState,
    buyTicket,
    resetPurchaseState,
    refreshData: fetchUserData
  };
} 