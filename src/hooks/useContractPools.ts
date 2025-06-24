import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../utils/contractAddresses';

// ABI mínimo para las funciones que necesitamos
const LOTTO_MOJI_ABI = [
  "function mainPools() view returns (uint256 firstPrizeAccumulated, uint256 secondPrizeAccumulated, uint256 thirdPrizeAccumulated, uint256 developmentAccumulated)",
  "function reserves() view returns (uint256 firstPrizeReserve1, uint256 secondPrizeReserve2, uint256 thirdPrizeReserve3)",
  "function dailyPools(uint256) view returns (uint256 totalCollected, uint256 mainPoolPortion, uint256 reservePortion, uint256 firstPrizeDaily, uint256 secondPrizeDaily, uint256 thirdPrizeDaily, uint256 developmentDaily, bool distributed, uint256 distributionTime, uint8[4] winningNumbers, bool drawn, bool reservesSent)",
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
  winningNumbers: number[];
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
}

export const useContractPools = () => {
  const [data, setData] = useState<ContractPoolsData>({
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
      winningNumbers: [0, 0, 0, 0],
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
    error: null
  });

  const fetchContractData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Configurar provider para Base Sepolia
      const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, LOTTO_MOJI_ABI, provider);

      // Obtener datos básicos primero
      const [
        mainPools,
        reserves,
        currentGameDay,
        drawInterval,
        drawTimeUTC,
        lastDrawTime,
        automationActive,
        gameActive
      ] = await Promise.all([
        contract.mainPools(),
        contract.reserves(),
        contract.getCurrentDay(),
        contract.DRAW_INTERVAL(),
        contract.drawTimeUTC(),
        contract.lastDrawTime(),
        contract.automationActive(),
        contract.gameActive()
      ]);

      // Obtener datos del pool diario actual con manejo de errores
      let dailyPool;
      try {
        dailyPool = await contract.dailyPools(currentGameDay);
      } catch (poolError) {
        console.warn('Error fetching daily pool, using defaults:', poolError);
        // Usar valores por defecto si hay error
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
          winningNumbers: [0, 0, 0, 0],
          drawn: false,
          reservesSent: false
        };
      }

      // Verificar upkeep separadamente
      let checkUpkeepResult = [false, '0x'];
      try {
        checkUpkeepResult = await contract.checkUpkeep('0x');
      } catch (upkeepError) {
        console.warn('Error checking upkeep:', upkeepError);
      }

      // Calcular tiempo hasta próximo sorteo
      const now = Math.floor(Date.now() / 1000);
      const currentDayStart = Number(currentGameDay) * Number(drawInterval) - Number(drawTimeUTC);
      const nextDrawTime = currentDayStart + Number(drawInterval);
      const timeToNextDraw = Math.max(0, nextDrawTime - now);

      // Calcular totales
      const totalMainPools = 
        Number(ethers.formatUnits(mainPools.firstPrizeAccumulated, 6)) +
        Number(ethers.formatUnits(mainPools.secondPrizeAccumulated, 6)) +
        Number(ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6)) +
        Number(ethers.formatUnits(mainPools.developmentAccumulated, 6)) +
        Number(ethers.formatUnits(dailyPool.mainPoolPortion, 6));

      const totalReserves = 
        Number(ethers.formatUnits(reserves.firstPrizeReserve1, 6)) +
        Number(ethers.formatUnits(reserves.secondPrizeReserve2, 6)) +
        Number(ethers.formatUnits(reserves.thirdPrizeReserve3, 6));

      setData({
        mainPools: {
          firstPrizeAccumulated: ethers.formatUnits(mainPools.firstPrizeAccumulated, 6),
          secondPrizeAccumulated: ethers.formatUnits(mainPools.secondPrizeAccumulated, 6),
          thirdPrizeAccumulated: ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6),
          developmentAccumulated: ethers.formatUnits(mainPools.developmentAccumulated, 6)
        },
        reserves: {
          firstPrizeReserve1: ethers.formatUnits(reserves.firstPrizeReserve1, 6),
          secondPrizeReserve2: ethers.formatUnits(reserves.secondPrizeReserve2, 6),
          thirdPrizeReserve3: ethers.formatUnits(reserves.thirdPrizeReserve3, 6)
        },
        dailyPool: {
          totalCollected: ethers.formatUnits(dailyPool.totalCollected, 6),
          mainPoolPortion: ethers.formatUnits(dailyPool.mainPoolPortion, 6),
          reservePortion: ethers.formatUnits(dailyPool.reservePortion, 6),
          firstPrizeDaily: ethers.formatUnits(dailyPool.firstPrizeDaily, 6),
          secondPrizeDaily: ethers.formatUnits(dailyPool.secondPrizeDaily, 6),
          thirdPrizeDaily: ethers.formatUnits(dailyPool.thirdPrizeDaily, 6),
          developmentDaily: ethers.formatUnits(dailyPool.developmentDaily, 6),
          distributed: dailyPool.distributed,
          distributionTime: dailyPool.distributionTime.toString(),
          winningNumbers: Array.from(dailyPool.winningNumbers).map(Number),
          drawn: dailyPool.drawn,
          reservesSent: dailyPool.reservesSent
        },
        currentGameDay: currentGameDay.toString(),
        timeToNextDraw,
        automationActive,
        gameActive,
        upkeepNeeded: checkUpkeepResult[0],
        totalUSDC: totalMainPools.toFixed(1),
        reserveTotalUSDC: totalReserves.toFixed(1),
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching contract data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  useEffect(() => {
    fetchContractData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchContractData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { ...data, refetch: fetchContractData };
}; 