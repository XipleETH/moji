import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';

export interface BlockchainPools {
  // Pools principales
  mainPools: {
    firstPrize: bigint;
    secondPrize: bigint;  
    thirdPrize: bigint;
    development: bigint;
  };
  
  // Reservas (nuevo sistema)
  reserves: {
    firstPrizeReserve: bigint;
    secondPrizeReserve: bigint;
    thirdPrizeReserve: bigint;
  };
  
  // Acumulados de días anteriores
  accumulated: {
    firstPrize: bigint;
    secondPrize: bigint;
    thirdPrize: bigint;
    totalDaysAccumulated: number;
  };
  
  // Estado del sistema
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  currentGameDay: number;
  nextDrawTime: number;
}

export interface BlockchainPoolActions {
  refreshPools: () => Promise<void>;
  getPastPoolsForDay: (gameDay: number) => Promise<BlockchainPools | null>;
  subscribeToPoolUpdates: (callback: (pools: BlockchainPools) => void) => () => void;
}

/**
 * Hook para integrar el sistema de pools con los contratos blockchain
 * Combina el sistema de reservas mejorado con Chainlink Automation
 */
export const useBlockchainPools = (): BlockchainPools & BlockchainPoolActions => {
  const [pools, setPools] = useState<BlockchainPools>({
    mainPools: {
      firstPrize: 0n,
      secondPrize: 0n,
      thirdPrize: 0n,
      development: 0n
    },
    reserves: {
      firstPrizeReserve: 0n,
      secondPrizeReserve: 0n,
      thirdPrizeReserve: 0n
    },
    accumulated: {
      firstPrize: 0n,
      secondPrize: 0n,
      thirdPrize: 0n,
      totalDaysAccumulated: 0
    },
    isLoading: true,
    error: null,
    lastUpdated: Date.now(),
    currentGameDay: Math.floor(Date.now() / (24 * 60 * 60 * 1000)),
    nextDrawTime: Date.now() + (24 * 60 * 60 * 1000) // Próximo día
  });

  /**
   * Obtiene los pools actuales desde el contrato V5 integrado
   */
  const fetchPoolsFromContract = async (): Promise<BlockchainPools> => {
    try {
      console.log('[useBlockchainPools] Conectando con contrato V5 integrado...');
      console.log('Dirección del contrato:', CONTRACT_ADDRESSES.LOTTO_MOJI_CORE);

      // Crear cliente público para leer contratos
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http()
      });

      console.log('🔗 Cliente viem conectado a Base Sepolia');
      
      // ABI del contrato V5 integrado
      const LOTTO_MOJI_CORE_ABI = [
        {
          inputs: [],
          name: 'getMainPoolBalances',
          outputs: [
            { name: 'firstPrizeAccumulated', type: 'uint256' },
            { name: 'secondPrizeAccumulated', type: 'uint256' },
            { name: 'thirdPrizeAccumulated', type: 'uint256' },
            { name: 'developmentAccumulated', type: 'uint256' }
          ],
          stateMutability: 'view',
          type: 'function'
        },
        {
          inputs: [],
          name: 'getReserveBalances',
          outputs: [
            { name: 'firstPrizeReserve', type: 'uint256' },
            { name: 'secondPrizeReserve', type: 'uint256' },
            { name: 'thirdPrizeReserve', type: 'uint256' }
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
        }
      ] as const;

      // Obtener datos del contrato V5
      const [mainPools, reserves, currentGameDay, lastDrawTime, drawInterval] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_ABI,
          functionName: 'getMainPoolBalances'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_ABI,
          functionName: 'getReserveBalances'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_CORE as `0x${string}`,
          abi: LOTTO_MOJI_CORE_ABI,
          functionName: 'getCurrentDay'
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
        })
      ]);

      // Calcular próximo sorteo
      const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
      
      console.log('✅ Datos del contrato V5 obtenidos:', {
        mainPools,
        reserves,
        currentGameDay: Number(currentGameDay),
        nextDrawTime
      });
      
      // Formatear datos reales del contrato V5
      const realPools: BlockchainPools = {
        mainPools: {
          firstPrize: mainPools[0], // firstPrizeAccumulated
          secondPrize: mainPools[1], // secondPrizeAccumulated
          thirdPrize: mainPools[2], // thirdPrizeAccumulated
          development: mainPools[3] // developmentAccumulated
        },
        reserves: {
          firstPrizeReserve: reserves[0], // firstPrizeReserve
          secondPrizeReserve: reserves[1], // secondPrizeReserve
          thirdPrizeReserve: reserves[2] // thirdPrizeReserve
        },
        accumulated: {
          firstPrize: mainPools[0], // Same as main pools en V5
          secondPrize: mainPools[1],
          thirdPrize: mainPools[2],
          totalDaysAccumulated: 0 // TODO: Calcular desde contratos si es necesario
        },
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
        currentGameDay: Number(currentGameDay),
        nextDrawTime: nextDrawTime * 1000 // Convertir a milisegundos
      };
      
      return realPools;
    } catch (error) {
      console.error('[useBlockchainPools] Error obteniendo pools:', error);
      throw error;
    }
  };

  /**
   * Refresca los pools desde los contratos
   */
  const refreshPools = async (): Promise<void> => {
    try {
      setPools(prev => ({ ...prev, isLoading: true, error: null }));
      const newPools = await fetchPoolsFromContract();
      setPools(newPools);
    } catch (error) {
      setPools(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  };

  /**
   * Obtiene pools históricos para un día específico
   */
  const getPastPoolsForDay = async (gameDay: number): Promise<BlockchainPools | null> => {
    try {
      // TODO: Implementar consulta histórica
      console.log(`[useBlockchainPools] Obteniendo pools históricos para día ${gameDay}`);
      return null;
    } catch (error) {
      console.error('[useBlockchainPools] Error obteniendo pools históricos:', error);
      return null;
    }
  };

  /**
   * Suscripción a eventos de pools en tiempo real
   */
  const subscribeToPoolUpdates = (callback: (pools: BlockchainPools) => void): (() => void) => {
    // TODO: Implementar suscripción a eventos del contrato
    console.log('[useBlockchainPools] Suscripción a eventos activada');
    
    // Simulación temporal
    const interval = setInterval(() => {
      fetchPoolsFromContract()
        .then(callback)
        .catch(error => console.error('Error en suscripción:', error));
    }, 30000); // Cada 30 segundos
    
    return () => {
      clearInterval(interval);
      console.log('[useBlockchainPools] Suscripción a eventos desactivada');
    };
  };

  // Efecto inicial para cargar pools
  useEffect(() => {
    refreshPools();
    
    // Auto-refresh cada 2 minutos
    const interval = setInterval(refreshPools, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    ...pools,
    refreshPools,
    getPastPoolsForDay,
    subscribeToPoolUpdates
  };
};

// Utilidades para formateo
export const formatUSDC = (amount: bigint): string => {
  const decimals = GAME_CONFIG.USDC_DECIMALS;
  const formatted = Number(amount) / Math.pow(10, decimals);
  return formatted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatUSDCCompact = (amount: bigint): string => {
  const usdcAmount = Number(amount) / Math.pow(10, GAME_CONFIG.USDC_DECIMALS);
  
  if (usdcAmount >= 1000000) {
    return `$${(usdcAmount / 1000000).toFixed(1)}M`;
  } else if (usdcAmount >= 1000) {
    return `$${(usdcAmount / 1000).toFixed(1)}K`;
  } else {
    return `$${usdcAmount.toFixed(2)}`;
  }
}; 