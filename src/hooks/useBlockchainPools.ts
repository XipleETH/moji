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
   * Obtiene los pools actuales desde los contratos
   */
  const fetchPoolsFromContract = async (): Promise<BlockchainPools> => {
    try {
      console.log('[useBlockchainPools] Conectando con contratos desplegados...');
      console.log('Direcciones:', {
        main: CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN,
        reserves: CONTRACT_ADDRESSES.LOTTO_MOJI_RESERVES,
        tickets: CONTRACT_ADDRESSES.LOTTO_MOJI_TICKETS
      });

      // Verificar que tenemos las direcciones
      if (CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN === '0x0000000000000000000000000000000000000000') {
        throw new Error('Direcciones de contratos no configuradas');
      }
      
      // Crear cliente público para leer contratos
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http()
      });

      console.log('🔗 Cliente viem conectado a Base Sepolia');
      
      // Por ahora usar datos simulados - implementar lectura real de contratos
      console.log('⚠️ Usando datos simulados - implementar lectura real próximamente');
      
      const mockPools: BlockchainPools = {
        mainPools: {
          firstPrize: BigInt(Math.floor(Math.random() * 10000) * 1e6), // USDC tiene 6 decimales
          secondPrize: BigInt(Math.floor(Math.random() * 2000) * 1e6),
          thirdPrize: BigInt(Math.floor(Math.random() * 1000) * 1e6),
          development: BigInt(Math.floor(Math.random() * 500) * 1e6)
        },
        reserves: {
          firstPrizeReserve: BigInt(Math.floor(Math.random() * 5000) * 1e6),
          secondPrizeReserve: BigInt(Math.floor(Math.random() * 1000) * 1e6),
          thirdPrizeReserve: BigInt(Math.floor(Math.random() * 500) * 1e6)
        },
        accumulated: {
          firstPrize: BigInt(Math.floor(Math.random() * 3000) * 1e6),
          secondPrize: BigInt(Math.floor(Math.random() * 800) * 1e6),
          thirdPrize: BigInt(Math.floor(Math.random() * 400) * 1e6),
          totalDaysAccumulated: Math.floor(Math.random() * 5)
        },
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
        currentGameDay: Math.floor(Date.now() / (24 * 60 * 60 * 1000)),
        nextDrawTime: Date.now() + (24 * 60 * 60 * 1000)
      };
      
      return mockPools;
      
      // TODO: Implementación real con contratos
      /*
      if (!window.ethereum) {
        throw new Error('No hay wallet conectado');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const mainContract = new ethers.Contract(
        CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN,
        LottoMojiMainABI.abi,
        provider
      );
      
      const reservesContract = new ethers.Contract(
        CONTRACT_ADDRESSES.LOTTO_MOJI_RESERVES, 
        LottoMojiReservesABI.abi,
        provider
      );
      
      // Obtener pools principales
      const [firstPrize, secondPrize, thirdPrize, development] = await Promise.all([
        mainContract.getPrizePool(1), // Primer premio
        mainContract.getPrizePool(2), // Segundo premio  
        mainContract.getPrizePool(3), // Tercer premio
        mainContract.getDevelopmentPool()
      ]);
      
      // Obtener reservas (nuevo sistema)
      const [firstReserve, secondReserve, thirdReserve] = await Promise.all([
        reservesContract.getReservePool(1),
        reservesContract.getReservePool(2), 
        reservesContract.getReservePool(3)
      ]);
      
      // Obtener acumulados de días anteriores
      const currentGameDay = await mainContract.getCurrentGameDay();
      const accumulatedData = await mainContract.getAccumulatedPools(currentGameDay);
      
      return {
        mainPools: { firstPrize, secondPrize, thirdPrize, development },
        reserves: { 
          firstPrizeReserve: firstReserve,
          secondPrizeReserve: secondReserve,
          thirdPrizeReserve: thirdReserve
        },
        accumulated: {
          firstPrize: accumulatedData.firstPrize,
          secondPrize: accumulatedData.secondPrize,
          thirdPrize: accumulatedData.thirdPrize,
          totalDaysAccumulated: accumulatedData.totalDays
        },
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
        currentGameDay: Number(currentGameDay),
        nextDrawTime: Date.now() + (24 * 60 * 60 * 1000) // TODO: Calcular próximo sorteo
      };
      */
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