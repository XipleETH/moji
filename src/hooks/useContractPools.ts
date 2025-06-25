import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../utils/contractAddresses';
import { getUserTimezone } from '../utils/timezone';

// ABI mínimo para las funciones que necesitamos (basado en el ABI compilado real)
const LOTTO_MOJI_ABI = [
  "function mainPools() view returns (uint256 firstPrizeAccumulated, uint256 secondPrizeAccumulated, uint256 thirdPrizeAccumulated, uint256 developmentAccumulated)",
  "function reserves() view returns (uint256 firstPrizeReserve1, uint256 secondPrizeReserve2, uint256 thirdPrizeReserve3)",
  "function dailyPools(uint256) view returns (uint256 totalCollected, uint256 mainPoolPortion, uint256 reservePortion, uint256 firstPrizeDaily, uint256 secondPrizeDaily, uint256 thirdPrizeDaily, uint256 developmentDaily, bool distributed, uint256 distributionTime, bool drawn, bool reservesSent)",
  "function getCurrentDay() view returns (uint256)",
  "function DRAW_INTERVAL() view returns (uint256)",
  "function drawTimeUTC() view returns (uint256)",
  "function lastDrawTime() view returns (uint256)",
  "function checkUpkeep(bytes) view returns (bool upkeepNeeded, bytes performData)",
  "function automationActive() view returns (bool)",
  "function gameActive() view returns (bool)"
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

      console.log('[useContractPools] Iniciando sincronización con blockchain...');

      // Configurar provider con múltiples endpoints de respaldo
      const providers = [
        'https://sepolia.base.org',
        'https://base-sepolia.g.alchemy.com/v2/demo',
        'https://base-sepolia-rpc.publicnode.com'
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

      console.log('[useContractPools] ✅ Sincronización exitosa:', {
        totalUSDC: newData.totalUSDC,
        reserveTotalUSDC: newData.reserveTotalUSDC,
        dailyCollected: processedDailyPool.totalCollected,
        gameDay: newData.currentGameDay
      });

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

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Función manual de refresh
  const refreshPools = () => {
    console.log('[useContractPools] Refresh manual solicitado');
    fetchContractData(true);
  };

  return {
    ...data,
    refreshPools
  };
}; 