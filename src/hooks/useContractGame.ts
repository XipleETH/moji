import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getContractAddresses } from '../contracts/addresses';
import { numbersToEmojis } from '../utils/gameLogic';

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

  // Prepare ticket info calls for batch reading
  const ticketInfoCalls = userTicketsData ? 
    (userTicketsData as bigint[]).map(ticketId => ({
      address: contracts?.LottoMojiTickets as `0x${string}`,
      abi: LottoMojiTicketsABI.abi,
      functionName: 'getTicketInfo',
      args: [ticketId]
    })) : [];

  // Read all ticket details in batch
  const { data: ticketInfosData, refetch: refetchTicketInfos } = useReadContracts({
    contracts: ticketInfoCalls,
    query: {
      enabled: isEnabled && !!userTicketsData && ticketInfoCalls.length > 0,
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
    console.log('=== BUY TICKET WITH ETH START ===');
    console.log('Input emojis:', emojis);
    console.log('User address:', address);
    console.log('Chain ID:', chainId);
    console.log('Contracts available:', !!contracts);
    console.log('ETH price data available:', !!ethPriceData);
    
    // Validaciones mejoradas
    if (!address) {
      console.error('❌ No wallet address');
      throw new Error('Wallet not connected');
    }
    
    if (chainId !== 84532) {
      console.error('❌ Wrong network. Current:', chainId, 'Expected: 84532');
      throw new Error('Please switch to Base Sepolia network');
    }
    
    if (!contracts?.LottoMojiCore) {
      console.error('❌ Missing contract address');
      console.log('Available contracts:', contracts);
      throw new Error('Smart contract not available. Please refresh the page.');
    }
    
    if (!ethPriceData) {
      console.error('❌ Missing ETH price data');
      throw new Error('Unable to calculate ticket price. Please try again.');
    }

    if (!emojis || emojis.length !== 4) {
      console.error('❌ Invalid emojis length:', emojis?.length);
      throw new Error('You must select exactly 4 emojis');
    }

    // Validar que todos los emojis sean válidos (0-24)
    if (emojis.some(emoji => emoji < 0 || emoji > 24)) {
      console.error('❌ Invalid emoji values:', emojis);
      throw new Error('Invalid emoji selection');
    }

    try {
      console.log('✅ All validations passed, initiating transaction...');
      console.log('Contract address:', contracts.LottoMojiCore);
      console.log('Function: buyTicketWithETH');
      console.log('Args:', [emojis]);
      console.log('Value (wei):', ethPriceData?.toString());
      console.log('Value (ether):', formatEther(ethPriceData as bigint));
      console.log('Gas limit: 300000');
      
      // Usar writeContract de forma más explícita
      const result = writeContract({
        address: contracts.LottoMojiCore as `0x${string}`,
        abi: LottoMojiCoreABI.abi,
        functionName: 'buyTicketWithETH',
        args: [emojis],
        value: ethPriceData as bigint,
        gas: 300000n, // Gas limit explícito
      });
      
      console.log('✅ Transaction initiated successfully');
      console.log('=== BUY TICKET WITH ETH END ===');
      return result;
    } catch (error: any) {
      console.error('=== BUY TICKET WITH ETH ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error);
      
      // Mensajes de error más específicos
      if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient ETH balance for transaction');
      } else if (error.message?.includes('user rejected') || error.code === 4001) {
        throw new Error('Transaction was rejected by user');
      } else if (error.message?.includes('execution reverted')) {
        throw new Error('Transaction failed - please check game status');
      } else if (error.message?.includes('network')) {
        throw new Error('Network error - please check your connection');
      } else if (error.message?.includes('gas')) {
        throw new Error('Gas estimation failed - please try again');
      } else {
        // Log completo del error para debugging
        console.error('Unknown error details:', JSON.stringify(error, null, 2));
        throw new Error(`Transaction failed: ${error.message || 'Unknown error occurred'}`);
      }
    }
  }, [contracts?.LottoMojiCore, ethPriceData, writeContract, address, chainId]);

  // Read USDC allowance
  const { data: usdcAllowance } = useReadContract({
    address: contracts?.USDC as `0x${string}`,
    abi: [
      {
        "inputs": [
          {"internalType": "address", "name": "owner", "type": "address"},
          {"internalType": "address", "name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'allowance',
    args: address && contracts?.LottoMojiCore ? [address, contracts.LottoMojiCore] : undefined,
    query: {
      enabled: isEnabled && !!address && !!contracts?.LottoMojiCore,
    }
  });

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: contracts?.USDC as `0x${string}`,
    abi: [
      {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isEnabled && !!address,
    }
  });

  // Approve USDC spending
  const approveUSDC = useCallback(async () => {
    if (!contracts?.LottoMojiCore) {
      throw new Error('Contract not available');
    }

    console.log('Approving USDC spending...');
    console.log('Spender:', contracts.LottoMojiCore);
    console.log('Amount: 2000000 (2 USDC)');

    try {
      const result = writeContract({
        address: contracts.USDC as `0x${string}`,
        abi: [
          {
            "inputs": [
              {"internalType": "address", "name": "spender", "type": "address"},
              {"internalType": "uint256", "name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'approve',
        args: [contracts.LottoMojiCore, 2000000n], // 2 USDC (6 decimals)
        gas: 100000n,
      });

      console.log('USDC approval initiated');
      return result;
    } catch (error: any) {
      console.error('Error approving USDC:', error);
      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction was rejected by user');
      } else {
        throw new Error(`Approval failed: ${error.message || 'Unknown error'}`);
      }
    }
  }, [contracts?.LottoMojiCore, writeContract]);

  // Buy ticket with USDC (requires approval first)
  const buyTicketWithUSDC = useCallback(async (emojis: number[]) => {
    console.log('=== BUY TICKET WITH USDC START ===');
    console.log('USDC Balance:', usdcBalance?.toString());
    console.log('USDC Allowance:', usdcAllowance?.toString());
    console.log('Required USDC: 2000000 (2 USDC)');

    // Validaciones mejoradas
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    if (chainId !== 84532) {
      throw new Error('Please switch to Base Sepolia network');
    }
    
    if (!contracts?.LottoMojiCore) {
      throw new Error('Smart contract not available');
    }

    if (!emojis || emojis.length !== 4) {
      throw new Error('You must select exactly 4 emojis');
    }

    // Validar que todos los emojis sean válidos (0-24)
    if (emojis.some(emoji => emoji < 0 || emoji > 24)) {
      throw new Error('Invalid emoji selection');
    }

    // Check USDC balance
    if (!usdcBalance || usdcBalance < 2000000n) {
      throw new Error('Insufficient USDC balance. You need at least 2 USDC.');
    }

    // Check USDC allowance
    if (!usdcAllowance || usdcAllowance < 2000000n) {
      throw new Error('Please approve USDC spending first. Click "Approve USDC" button.');
    }

    try {
      console.log('✅ All validations passed, buying ticket with USDC...');
      
      const result = writeContract({
        address: contracts.LottoMojiCore as `0x${string}`,
        abi: LottoMojiCoreABI.abi,
        functionName: 'buyTicketWithUSDC',
        args: [emojis],
        gas: 300000n,
      });
      
      console.log('✅ USDC ticket transaction initiated');
      console.log('=== BUY TICKET WITH USDC END ===');
      return result;
    } catch (error: any) {
      console.error('=== BUY TICKET WITH USDC ERROR ===');
      console.error('Error details:', error);
      
      // Mensajes de error más específicos
      if (error.message?.includes('insufficient allowance') || error.message?.includes('ERC20: transfer amount exceeds allowance')) {
        throw new Error('USDC allowance insufficient. Please approve USDC spending first.');
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('ERC20: transfer amount exceeds balance')) {
        throw new Error('Insufficient USDC balance');
      } else if (error.message?.includes('user rejected') || error.code === 4001) {
        throw new Error('Transaction was rejected by user');
      } else if (error.message?.includes('execution reverted')) {
        throw new Error('Transaction failed - please check game status and try again');
      } else {
        throw new Error(`Transaction failed: ${error.message || 'Unknown error occurred'}`);
      }
    }
  }, [contracts?.LottoMojiCore, writeContract, address, chainId, usdcBalance, usdcAllowance]);

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

  // Process user tickets data with full information
  useEffect(() => {
    if (userTicketsData && ticketInfosData && contracts?.LottoMojiTickets && address) {
      try {
        const ticketIds = userTicketsData as bigint[];
        const tickets: Ticket[] = [];

        ticketIds.forEach((ticketId, index) => {
          try {
            const ticketInfo = ticketInfosData[index];
            if (ticketInfo?.status === 'success' && ticketInfo.result) {
              const [emojis, roundId, player, isUsed, isFreeTicket, isValid, mintTimestamp, paymentHash] = ticketInfo.result as any[];
              
              tickets.push({
                id: Number(ticketId),
                emojis: emojis || [],
                roundId: Number(roundId),
                player: player,
                isUsed: isUsed,
                isFreeTicket: isFreeTicket,
                mintTimestamp: Number(mintTimestamp),
                paymentHash: paymentHash
              });
            }
          } catch (error) {
            console.error('Error processing ticket info for ticket:', ticketId, error);
          }
        });

        setGameState(prev => ({
          ...prev,
          tickets
        }));
      } catch (error) {
        console.error('Error processing tickets:', error);
      }
    }
  }, [userTicketsData, ticketInfosData, contracts?.LottoMojiTickets, address]);

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
        refetchTicketInfos();
      }, 2000); // Wait 2 seconds for blockchain to update
    }
  }, [isConfirmed, refetchRound, refetchTickets, refetchTicketInfos]);

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
    approveUSDC,
    ethPrice: ethPriceData ? formatEther(ethPriceData as bigint) : null,
    usdcBalance: usdcBalance ? Number(usdcBalance) / 1e6 : 0, // Convert to readable format
    usdcAllowance: usdcAllowance ? Number(usdcAllowance) / 1e6 : 0, // Convert to readable format
    needsUsdcApproval: !usdcAllowance || usdcAllowance < 2000000n,
    isTransactionPending: isPending || isConfirming,
    isTransactionConfirmed: isConfirmed,
    refetch: () => {
      refetchRound();
      refetchTickets();
      refetchTicketInfos();
    },
    error: roundError || writeError,
    isValidChain: chainId === 84532
  };
}; 