import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';

interface ContractGameHistory {
  gameDay: string;
  winningNumbers: number[];
  winningEmojis: string[];
  drawn: boolean;
  distributed: boolean;
  totalCollected: string;
  lastDrawTime: number;
  hasWinners: boolean; // Simulado por ahora, en el futuro se puede calcular
}

interface UseContractGameHistoryReturn {
  history: ContractGameHistory[];
  loading: boolean;
  error: string | null;
}

// ABI para obtener historial
const GAME_HISTORY_ABI = [
  "function lastWinningNumbers(uint256) view returns (uint8)",
  "function getCurrentDay() view returns (uint256)",
  "function dailyPools(uint256) view returns (uint256 totalCollected, uint256 mainPoolPortion, uint256 reservePortion, uint256 firstPrizeDaily, uint256 secondPrizeDaily, uint256 thirdPrizeDaily, uint256 developmentDaily, bool distributed, uint256 distributionTime, bool drawn, bool reservesSent)",
  "function lastDrawTime() view returns (uint256)",
  "function totalDrawsExecuted() view returns (uint256)",
  "function DRAW_INTERVAL() view returns (uint256)",
  "function drawTimeUTC() view returns (uint256)"
];

export function useContractGameHistory(): UseContractGameHistoryReturn {
  const [history, setHistory] = useState<ContractGameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGameHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Configurar provider para Base Sepolia
      const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, GAME_HISTORY_ABI, provider);

      // Obtener datos básicos
      const [
        currentGameDay,
        totalDrawsExecuted,
        lastDrawTime,
        drawInterval,
        drawTimeUTC
      ] = await Promise.all([
        contract.getCurrentDay(),
        contract.totalDrawsExecuted(),
        contract.lastDrawTime(),
        contract.DRAW_INTERVAL(),
        contract.drawTimeUTC()
      ]);

      const historyData: ContractGameHistory[] = [];

      // Si no hay sorteos ejecutados, crear una entrada con el estado actual
      if (totalDrawsExecuted === 0n) {
        // Obtener números ganadores actuales (que serán todos 0)
        const currentWinningNumbers = await Promise.all([
          contract.lastWinningNumbers(0),
          contract.lastWinningNumbers(1),
          contract.lastWinningNumbers(2),
          contract.lastWinningNumbers(3)
        ]);

        const currentWinningEmojis = currentWinningNumbers.map(num => GAME_CONFIG.EMOJI_MAP[Number(num)]);

        // Obtener pool actual
        let currentPool;
        try {
          currentPool = await contract.dailyPools(currentGameDay);
        } catch {
          currentPool = { totalCollected: 0, drawn: false, distributed: false };
        }

        // Calcular tiempo del próximo sorteo estimado
        const nextDrawTime = calculateNextDrawTime(Number(drawTimeUTC), Number(drawInterval));

        historyData.push({
          gameDay: currentGameDay.toString(),
          winningNumbers: currentWinningNumbers.map(Number),
          winningEmojis: currentWinningEmojis,
          drawn: false,
          distributed: false,
          totalCollected: ethers.formatUnits(currentPool.totalCollected || 0, 6),
          lastDrawTime: nextDrawTime,
          hasWinners: false
        });
      } else {
        // Si hay sorteos ejecutados, obtener el historial
        // Empezar desde el día más reciente hacia atrás
        const startDay = currentGameDay - 1n; // El último sorteo fue para el día anterior
        const maxDays = Math.min(Number(totalDrawsExecuted), 10); // Últimos 10 sorteos máximo

        for (let i = 0; i < maxDays; i++) {
          const targetDay = startDay - BigInt(i);
          
          try {
            // Obtener números ganadores del contrato (estos son los últimos guardados)
            const winningNumbers = await Promise.all([
              contract.lastWinningNumbers(0),
              contract.lastWinningNumbers(1),
              contract.lastWinningNumbers(2),
              contract.lastWinningNumbers(3)
            ]);

            const winningEmojis = winningNumbers.map(num => GAME_CONFIG.EMOJI_MAP[Number(num)]);

            // Obtener información del pool de ese día
            const dailyPool = await contract.dailyPools(targetDay);

            // Calcular tiempo estimado del sorteo
            const drawTime = calculateDrawTimeForDay(targetDay, Number(drawTimeUTC), Number(drawInterval));

            historyData.push({
              gameDay: targetDay.toString(),
              winningNumbers: winningNumbers.map(Number),
              winningEmojis,
              drawn: dailyPool.drawn,
              distributed: dailyPool.distributed,
              totalCollected: ethers.formatUnits(dailyPool.totalCollected, 6),
              lastDrawTime: drawTime,
              hasWinners: false // Por ahora simulamos que no hay ganadores, se puede mejorar
            });

          } catch (dayError) {
            console.warn(`Error fetching data for day ${targetDay}:`, dayError);
          }
        }
      }

      setHistory(historyData);

    } catch (err) {
      console.error('Error fetching game history:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular el tiempo del próximo sorteo
  const calculateNextDrawTime = (drawTimeUTC: number, drawInterval: number): number => {
    const now = Date.now() / 1000;
    const nextMidnight = Math.ceil((now + drawTimeUTC) / drawInterval) * drawInterval - drawTimeUTC;
    return nextMidnight * 1000;
  };

  // Función para calcular el tiempo del sorteo para un día específico
  const calculateDrawTimeForDay = (gameDay: bigint, drawTimeUTC: number, drawInterval: number): number => {
    const dayInSeconds = Number(gameDay) * drawInterval;
    return (dayInSeconds - drawTimeUTC) * 1000;
  };

  useEffect(() => {
    fetchGameHistory();

    // Actualizar cada 60 segundos
    const interval = setInterval(fetchGameHistory, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    history,
    loading,
    error
  };
} 