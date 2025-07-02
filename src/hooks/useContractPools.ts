import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../utils/contractAddresses';
import { verifyBlockchainPools, forcePoolSync } from '../utils/blockchainVerification';
import contractABI from '../utils/contract-abi-v3.json';

// ABI mínimo para las funciones que necesitamos (LottoMojiCoreV3)
const LOTTO_MOJI_ABI = [
  "function pools() view returns (uint256 firstPrize, uint256 secondPrize, uint256 thirdPrize, uint256 devPool, uint256 firstReserve, uint256 secondReserve, uint256 thirdReserve)",
  "function currentGameDay() view returns (uint24)",
  "function nextDrawTs() view returns (uint256)",
  "function dailyDrawHourUTC() view returns (uint8)",
  "function ticketPrice() view returns (uint256)",
  "function automationActive() view returns (bool)",
  "function emergencyPause() view returns (bool)",
  "function dayResults(uint24) view returns (uint8[4] winningNumbers, uint32 processingIndex, uint32 winnersFirst, uint32 winnersSecond, uint32 winnersThird, bool fullyProcessed)",
  "function checkUpkeep(bytes) view returns (bool upkeepNeeded, bytes performData)"
];

interface MainPools {
  firstPrizeAccumulated: string;
  secondPrizeAccumulated: string;
  thirdPrizeAccumulated: string;
  developmentAccumulated: string;
}

interface ReservePools {
  firstPrizeReserve1: string;
  secondPrizeReserve2: string;
  thirdPrizeReserve3: string;
}

interface DailyPool {
  totalCollected: string;
  mainPoolPortion: string;
  reservePortion: string;
  firstPrizeDaily: string;
  secondPrizeDaily: string;
  thirdPrizeDaily: string;
  developmentDaily: string;
  distributed: boolean;
  distributionTime: string;
  drawn: boolean;
  reservesSent: boolean;
}

interface ContractPoolsData {
  mainPools: MainPools;
  reserves: ReservePools;
  dailyPool: DailyPool;
  currentGameDay: string;
  timeToNextDraw: number;
  automationActive: boolean;
  gameActive: boolean;
  upkeepNeeded: boolean;
  totalUSDC: string;
  reserveTotalUSDC: string;
  loading: boolean;
  error: string | null;
  lastSyncTime: number;
  syncAttempts: number;
}

// Clave para LocalStorage
const POOLS_CACHE_KEY = 'lottoMoji_poolsCache';
const CACHE_DURATION = 30000; // 30 segundos

export interface PoolsData {
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  devPool: string;
  firstReserve: string;
  secondReserve: string;
  thirdReserve: string;
  loading: boolean;
  error: string | null;
}

export function useContractPools(): PoolsData {
  const [poolsData, setPoolsData] = useState<PoolsData>({
    firstPrize: '0',
    secondPrize: '0',
    thirdPrize: '0',
    devPool: '0',
    firstReserve: '0',
    secondReserve: '0',
    thirdReserve: '0',
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
        const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, contractABI.abi, provider);

        const pools = await contract.pools();

        setPoolsData({
          firstPrize: ethers.formatUnits(pools.firstPrize, 6),
          secondPrize: ethers.formatUnits(pools.secondPrize, 6),
          thirdPrize: ethers.formatUnits(pools.thirdPrize, 6),
          devPool: ethers.formatUnits(pools.devPool, 6),
          firstReserve: ethers.formatUnits(pools.firstReserve, 6),
          secondReserve: ethers.formatUnits(pools.secondReserve, 6),
          thirdReserve: ethers.formatUnits(pools.thirdReserve, 6),
          loading: false,
          error: null
        });
      } catch (err) {
        console.error("Error fetching pools:", err);
        setPoolsData(prev => ({
          ...prev,
          loading: false,
          error: "Failed to fetch pools data"
        }));
      }
    };

    fetchPools();
    const interval = setInterval(fetchPools, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return poolsData;
}

export const useContractPools = () => {
  const [data, setData] = useState<ContractPoolsData>(() => {
    // Intentar cargar datos del cache al inicializar
    try {
      const cached = localStorage.getItem(POOLS_CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const now = Date.now();
        // Si el cache es reciente (menos de 30 segundos), usarlo como inicial
        if (now - parsedCache.timestamp < CACHE_DURATION) {
          console.log('[useContractPools] Usando datos del cache como inicial');
          return {
            ...parsedCache.data,
            loading: true, // Seguir cargando datos frescos
            lastSyncTime: now,
            syncAttempts: 0
          };
        }
      }
    } catch (error) {
      console.warn('[useContractPools] Error leyendo cache:', error);
    }

    // Valores por defecto si no hay cache
    return {
      mainPools: {
        firstPrizeAccumulated: '0',
        secondPrizeAccumulated: '0',
        thirdPrizeAccumulated: '0',
        developmentAccumulated: '0'
      },
      reserves: {
        firstPrizeReserve1: '0',
        secondPrizeReserve2: '0',
        thirdPrizeReserve3: '0'
      },
      dailyPool: {
        totalCollected: '0',
        mainPoolPortion: '0',
        reservePortion: '0',
        firstPrizeDaily: '0',
        secondPrizeDaily: '0',
        thirdPrizeDaily: '0',
        developmentDaily: '0',
        distributed: false,
        distributionTime: '0',
        drawn: false,
        reservesSent: false
      },
      currentGameDay: '0',
      timeToNextDraw: 0,
      automationActive: false,
      gameActive: false,
      upkeepNeeded: false,
      totalUSDC: '0',
      reserveTotalUSDC: '0',
      loading: true,
      error: null,
      lastSyncTime: 0,
      syncAttempts: 0
    };
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const isLoadingRef = useRef<boolean>(false);

  // Función para guardar en cache
  const saveToCache = (poolData: ContractPoolsData) => {
    try {
      const cacheData = {
        data: poolData,
        timestamp: Date.now()
      };
      localStorage.setItem(POOLS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[useContractPools] Error guardando cache:', error);
    }
  };

  // Función mejorada para validar datos
  const validatePoolData = (pools: any, reserves: any, dailyPool: any): boolean => {
    try {
      // Verificar que los valores numéricos sean válidos
      const totalMain = 
        Number(ethers.formatUnits(pools.firstPrizeAccumulated || 0, 6)) +
        Number(ethers.formatUnits(pools.secondPrizeAccumulated || 0, 6)) +
        Number(ethers.formatUnits(pools.thirdPrizeAccumulated || 0, 6)) +
        Number(ethers.formatUnits(pools.developmentAccumulated || 0, 6));

      const totalReserves = 
        Number(ethers.formatUnits(reserves.firstPrizeReserve1 || 0, 6)) +
        Number(ethers.formatUnits(reserves.secondPrizeReserve2 || 0, 6)) +
        Number(ethers.formatUnits(reserves.thirdPrizeReserve3 || 0, 6));

      const dailyCollected = Number(ethers.formatUnits(dailyPool.totalCollected || 0, 6));

      // Los datos son válidos si no son todos NaN
      const isValid = !isNaN(totalMain) && !isNaN(totalReserves) && !isNaN(dailyCollected);
      
      if (!isValid) {
        console.warn('[useContractPools] Datos numéricos inválidos detectados');
      }

      return isValid;
    } catch (error) {
      console.error('[useContractPools] Error validando datos:', error);
      return false;
    }
  };

  const fetchContractData = async (showLoading = true) => {
    // Prevenir múltiples llamadas simultáneas
    if (isLoadingRef.current) {
      console.log('[useContractPools] Ya hay una sincronización en progreso');
      return;
    }

    try {
      isLoadingRef.current = true;

      if (showLoading) {
        setData(prev => ({ 
          ...prev, 
          loading: true, 
          error: null,
          syncAttempts: prev.syncAttempts + 1 
        }));
      }

      console.log('[useContractPools] Iniciando sincronización robusta con blockchain...');

      // USAR EL SISTEMA DE VERIFICACIÓN ROBUSTO
      try {
        const blockchainData = await verifyBlockchainPools();
        
        // Convertir datos del sistema de verificación al formato del hook
        const newData: ContractPoolsData = {
          mainPools: {
            firstPrizeAccumulated: blockchainData.mainPools.firstPrize,
            secondPrizeAccumulated: blockchainData.mainPools.secondPrize,
            thirdPrizeAccumulated: blockchainData.mainPools.thirdPrize,
            developmentAccumulated: blockchainData.mainPools.development
          },
          reserves: {
            firstPrizeReserve1: blockchainData.reserves.firstPrize,
            secondPrizeReserve2: blockchainData.reserves.secondPrize,
            thirdPrizeReserve3: blockchainData.reserves.thirdPrize
          },
          dailyPool: {
            totalCollected: blockchainData.dailyPool.totalCollected,
            mainPoolPortion: blockchainData.dailyPool.mainPortion,
            reservePortion: blockchainData.dailyPool.reservePortion,
            firstPrizeDaily: '0', // No disponible en el sistema de verificación
            secondPrizeDaily: '0',
            thirdPrizeDaily: '0',
            developmentDaily: '0',
            distributed: blockchainData.dailyPool.distributed,
            distributionTime: '0',
            drawn: blockchainData.dailyPool.drawn,
            reservesSent: false
          },
          currentGameDay: blockchainData.contractInfo.currentGameDay,
          timeToNextDraw: 0, // Calcular después si es necesario
          automationActive: blockchainData.contractInfo.automationActive,
          gameActive: blockchainData.contractInfo.gameActive,
          upkeepNeeded: false,
          totalUSDC: blockchainData.totals.mainTotal,
          reserveTotalUSDC: blockchainData.totals.reserveTotal,
          loading: false,
          error: null,
          lastSyncTime: blockchainData.timestamp,
          syncAttempts: 0 // Reset attempts on success
        };

        // Actualizar estado
        setData(newData);

        // Guardar en cache
        saveToCache(newData);

        console.log('[useContractPools] ✅ Sincronización robusta exitosa:', {
          totalUSDC: newData.totalUSDC,
          reserveTotalUSDC: newData.reserveTotalUSDC,
          dailyCollected: newData.dailyPool.totalCollected,
          gameDay: newData.currentGameDay,
          blockNumber: blockchainData.blockNumber
        });

      } catch (verificationError) {
        console.warn('[useContractPools] Sistema de verificación falló, intentando método legacy:', verificationError);
        
        // FALLBACK AL MÉTODO LEGACY SI EL SISTEMA ROBUSTO FALLA
        await fetchContractDataLegacy();
      }

    } catch (error) {
      console.error('[useContractPools] Error en sincronización:', error);
      
      // En caso de error, no resetear datos a cero, mantener datos previos
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
        syncAttempts: prev.syncAttempts + 1
      }));

      // Si hay muchos intentos fallidos, intentar usar cache más antiguo
      if (data.syncAttempts > 3) {
        try {
          const cached = localStorage.getItem(POOLS_CACHE_KEY);
          if (cached) {
            const parsedCache = JSON.parse(cached);
            console.log('[useContractPools] Usando cache de respaldo después de múltiples errores');
            setData(prev => ({
              ...parsedCache.data,
              loading: false,
              error: 'Usando datos de respaldo - verifique su conexión',
              syncAttempts: prev.syncAttempts
            }));
          }
        } catch (cacheError) {
          console.warn('[useContractPools] Error usando cache de respaldo:', cacheError);
        }
      }
    } finally {
      isLoadingRef.current = false;
    }
  };

  // Método legacy como fallback
  const fetchContractDataLegacy = async () => {
    console.log('[useContractPools] Ejecutando método legacy...');

    // Configurar provider con múltiples endpoints de respaldo para Avalanche Fuji
    const providers = [
      'https://api.avax-test.network/ext/bc/C/rpc',
      'https://avalanche-fuji-c-chain.publicnode.com',
      'https://rpc.ankr.com/avalanche_fuji',
      'https://avalanche-fuji.blockpi.network/v1/rpc/public',
      'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc'
    ];

    let provider: ethers.JsonRpcProvider | null = null;
    let contract: ethers.Contract | null = null;

    // Intentar conectar con diferentes providers
    for (const providerUrl of providers) {
      try {
        provider = new ethers.JsonRpcProvider(providerUrl);
        contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, LOTTO_MOJI_ABI, provider);
        
        // Test de conexión rápido
        await contract.gameActive();
        console.log(`[useContractPools] Conectado exitosamente a: ${providerUrl}`);
        break;
      } catch (providerError) {
        console.warn(`[useContractPools] Error con provider ${providerUrl}:`, providerError);
        provider = null;
        contract = null;
      }
    }

    if (!contract || !provider) {
      throw new Error('No se pudo conectar a ningún provider RPC');
    }

    // Obtener datos básicos con timeout
    const contractPromises = [
      contract.mainPools(),
      contract.reserves(),
      contract.getCurrentDay(),
      contract.DRAW_INTERVAL(),
      contract.drawTimeUTC(),
      contract.lastDrawTime(),
      contract.automationActive(),
      contract.gameActive()
    ];

    // Aplicar timeout a las promesas
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout en llamadas al contrato')), 10000); // 10 segundos
    });

    const [
      mainPools,
      reserves,
      currentGameDay,
      drawInterval,
      drawTimeUTC,
      lastDrawTime,
      automationActive,
      gameActive
    ] = await Promise.race([
      Promise.all(contractPromises),
      timeoutPromise
    ]) as any[];

    console.log('[useContractPools] Datos básicos obtenidos:', {
      currentGameDay: Number(currentGameDay),
      gameActive,
      automationActive
    });

    // Obtener pool diario con manejo robusto de errores
    let dailyPool;
    try {
      dailyPool = await contract.dailyPools(currentGameDay);
      console.log('[useContractPools] Pool diaria obtenida:', {
        totalCollected: ethers.formatUnits(dailyPool.totalCollected, 6),
        drawn: dailyPool.drawn,
        distributed: dailyPool.distributed
      });
    } catch (poolError) {
      console.warn('[useContractPools] Error obteniendo pool diaria, usando defaults:', poolError);
      dailyPool = {
        totalCollected: 0,
        mainPoolPortion: 0,
        reservePortion: 0,
        firstPrizeDaily: 0,
        secondPrizeDaily: 0,
        thirdPrizeDaily: 0,
        developmentDaily: 0,
        distributed: false,
        distributionTime: 0,
        drawn: false,
        reservesSent: false
      };
    }

    // Verificar upkeep
    let checkUpkeepResult = [false, '0x'];
    try {
      checkUpkeepResult = await contract.checkUpkeep('0x');
    } catch (upkeepError) {
      console.warn('[useContractPools] Error verificando upkeep:', upkeepError);
    }

    // Validar datos antes de procesar
    if (!validatePoolData(mainPools, reserves, dailyPool)) {
      throw new Error('Datos del contrato inválidos o corruptos');
    }

    // Calcular tiempo hasta próximo sorteo
    const now = Math.floor(Date.now() / 1000);
    const currentDayStart = Number(currentGameDay) * Number(drawInterval) - Number(drawTimeUTC);
    const nextDrawTime = currentDayStart + Number(drawInterval);
    const timeToNextDraw = Math.max(0, nextDrawTime - now);

    // Procesar y formatear datos
    const processedMainPools = {
      firstPrizeAccumulated: ethers.formatUnits(mainPools.firstPrizeAccumulated, 6),
      secondPrizeAccumulated: ethers.formatUnits(mainPools.secondPrizeAccumulated, 6),
      thirdPrizeAccumulated: ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6),
      developmentAccumulated: ethers.formatUnits(mainPools.developmentAccumulated, 6)
    };

    const processedReserves = {
      firstPrizeReserve1: ethers.formatUnits(reserves.firstPrizeReserve1, 6),
      secondPrizeReserve2: ethers.formatUnits(reserves.secondPrizeReserve2, 6),
      thirdPrizeReserve3: ethers.formatUnits(reserves.thirdPrizeReserve3, 6)
    };

    const processedDailyPool = {
      totalCollected: ethers.formatUnits(dailyPool.totalCollected, 6),
      mainPoolPortion: ethers.formatUnits(dailyPool.mainPoolPortion, 6),
      reservePortion: ethers.formatUnits(dailyPool.reservePortion, 6),
      firstPrizeDaily: ethers.formatUnits(dailyPool.firstPrizeDaily, 6),
      secondPrizeDaily: ethers.formatUnits(dailyPool.secondPrizeDaily, 6),
      thirdPrizeDaily: ethers.formatUnits(dailyPool.thirdPrizeDaily, 6),
      developmentDaily: ethers.formatUnits(dailyPool.developmentDaily, 6),
      distributed: dailyPool.distributed,
      distributionTime: dailyPool.distributionTime.toString(),
      drawn: dailyPool.drawn,
      reservesSent: dailyPool.reservesSent
    };

    // Calcular totales
    const totalMainPools = 
      Number(processedMainPools.firstPrizeAccumulated) +
      Number(processedMainPools.secondPrizeAccumulated) +
      Number(processedMainPools.thirdPrizeAccumulated) +
      Number(processedMainPools.developmentAccumulated) +
      Number(processedDailyPool.mainPoolPortion);

    const totalReserves = 
      Number(processedReserves.firstPrizeReserve1) +
      Number(processedReserves.secondPrizeReserve2) +
      Number(processedReserves.thirdPrizeReserve3);

    const newData: ContractPoolsData = {
      mainPools: processedMainPools,
      reserves: processedReserves,
      dailyPool: processedDailyPool,
      currentGameDay: currentGameDay.toString(),
      timeToNextDraw,
      automationActive,
      gameActive,
      upkeepNeeded: checkUpkeepResult[0],
      totalUSDC: totalMainPools.toFixed(1),
      reserveTotalUSDC: totalReserves.toFixed(1),
      loading: false,
      error: null,
      lastSyncTime: Date.now(),
      syncAttempts: 0 // Reset attempts on success
    };

    // Actualizar estado
    setData(newData);

    // Guardar en cache
    saveToCache(newData);

    console.log('[useContractPools] ✅ Sincronización legacy exitosa:', {
      totalUSDC: newData.totalUSDC,
      reserveTotalUSDC: newData.reserveTotalUSDC,
      dailyCollected: processedDailyPool.totalCollected,
      gameDay: newData.currentGameDay
    });
  };

  // Hook de efecto para inicializar y mantener sincronización
  useEffect(() => {
    // Sincronización inicial
    fetchContractData(true);

    // Configurar actualización automática cada 15 segundos
    intervalRef.current = setInterval(() => {
      fetchContractData(false); // No mostrar loading en actualizaciones automáticas
    }, 15000);

    // Listener para refrescar cuando la ventana vuelve a tener foco
    const handleFocus = () => {
      console.log('[useContractPools] Ventana enfocada, refrescando datos...');
      fetchContractData(false);
    };

    // Listener para cambios de red
    const handleOnline = () => {
      console.log('[useContractPools] Conexión restaurada, refrescando datos...');
      fetchContractData(false);
    };

    // Listener para eventos de sincronización del sistema de verificación
    const handleBlockchainSync = (event: CustomEvent) => {
      console.log('[useContractPools] Evento de sincronización blockchain recibido');
      const blockchainData = event.detail;
      
      const syncedData: ContractPoolsData = {
        mainPools: {
          firstPrizeAccumulated: blockchainData.mainPools.firstPrize,
          secondPrizeAccumulated: blockchainData.mainPools.secondPrize,
          thirdPrizeAccumulated: blockchainData.mainPools.thirdPrize,
          developmentAccumulated: blockchainData.mainPools.development
        },
        reserves: {
          firstPrizeReserve1: blockchainData.reserves.firstPrize,
          secondPrizeReserve2: blockchainData.reserves.secondPrize,
          thirdPrizeReserve3: blockchainData.reserves.thirdPrize
        },
        dailyPool: {
          totalCollected: blockchainData.dailyPool.totalCollected,
          mainPoolPortion: blockchainData.dailyPool.mainPortion,
          reservePortion: blockchainData.dailyPool.reservePortion,
          firstPrizeDaily: '0',
          secondPrizeDaily: '0',
          thirdPrizeDaily: '0',
          developmentDaily: '0',
          distributed: blockchainData.dailyPool.distributed,
          distributionTime: '0',
          drawn: blockchainData.dailyPool.drawn,
          reservesSent: false
        },
        currentGameDay: blockchainData.contractInfo.currentGameDay,
        timeToNextDraw: 0,
        automationActive: blockchainData.contractInfo.automationActive,
        gameActive: blockchainData.contractInfo.gameActive,
        upkeepNeeded: false,
        totalUSDC: blockchainData.totals.mainTotal,
        reserveTotalUSDC: blockchainData.totals.reserveTotal,
        loading: false,
        error: null,
        lastSyncTime: blockchainData.timestamp,
        syncAttempts: 0
      };
      
      setData(syncedData);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('blockchainPoolsSync', handleBlockchainSync as EventListener);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('blockchainPoolsSync', handleBlockchainSync as EventListener);
    };
  }, []);

  // Función manual de refresh mejorada
  const refreshPools = async () => {
    console.log('[useContractPools] Refresh manual solicitado - usando forcePoolSync');
    try {
      await forcePoolSync();
    } catch (error) {
      console.error('[useContractPools] Error en forcePoolSync, usando fetchContractData:', error);
      fetchContractData(true);
    }
  };

  // Exponer refreshPools globalmente para el sistema de verificación
  useEffect(() => {
    (window as any).refreshPools = refreshPools;
    return () => {
      delete (window as any).refreshPools;
    };
  }, []);

  return {
    ...data,
    refreshPools
  };
}; 