import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../utils/contractAddresses';
import { GAME_CONFIG } from '../utils/emojiData';

interface ContractDrawResult {
  gameDay: string;
  winningNumbers: number[];
  winningEmojis: string[];
  drawn: boolean;
  distributed: boolean;
  lastDrawTime: number;
  totalDrawsExecuted: number;
}

interface UseContractDrawResultsReturn {
  latestResult: ContractDrawResult | null;
  loading: boolean;
  error: string | null;
}

// ABI mínimo para obtener resultados de sorteos
const DRAW_RESULTS_ABI = [
  "function lastWinningNumbers() view returns (uint8[4])",
  "function getCurrentDay() view returns (uint256)",
  "function dailyPools(uint256) view returns (uint256 totalCollected, uint256 mainPoolPortion, uint256 reservePortion, uint256 firstPrizeDaily, uint256 secondPrizeDaily, uint256 thirdPrizeDaily, uint256 developmentDaily, bool distributed, uint256 distributionTime, bool drawn, bool reservesSent)",
  "function lastDrawTime() view returns (uint256)",
  "function totalDrawsExecuted() view returns (uint256)",
  "function gameActive() view returns (bool)"
];

export function useContractDrawResults(): UseContractDrawResultsReturn {
  const [latestResult, setLatestResult] = useState<ContractDrawResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrawResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // Configurar provider para Base Sepolia
      const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, DRAW_RESULTS_ABI, provider);

      // Obtener datos básicos
      const [
        lastWinningNumbers,
        currentGameDay,
        lastDrawTime,
        totalDrawsExecuted,
        gameActive
      ] = await Promise.all([
        contract.lastWinningNumbers(),
        contract.getCurrentDay(),
        contract.lastDrawTime(),
        contract.totalDrawsExecuted(),
        contract.gameActive()
      ]);

      // Determinar qué día revisar para el último sorteo
      // Si hay sorteos ejecutados, revisar el día anterior
      const targetGameDay = totalDrawsExecuted > 0 ? currentGameDay - 1n : currentGameDay;

      // Obtener información del pool del día objetivo
      let dailyPool;
      try {
        dailyPool = await contract.dailyPools(targetGameDay);
      } catch (poolError) {
        console.warn('Error fetching daily pool for draw results:', poolError);
        // Usar valores por defecto si hay error
        dailyPool = {
          drawn: false,
          distributed: false
        };
      }

      // Convertir números ganadores a emojis
      const winningNumbersArray = Array.from(lastWinningNumbers).map(Number);
      const winningEmojis = winningNumbersArray.map(index => GAME_CONFIG.EMOJI_MAP[index] || '❓');

      const result: ContractDrawResult = {
        gameDay: targetGameDay.toString(),
        winningNumbers: winningNumbersArray,
        winningEmojis,
        drawn: dailyPool.drawn,
        distributed: dailyPool.distributed,
        lastDrawTime: Number(lastDrawTime),
        totalDrawsExecuted: Number(totalDrawsExecuted)
      };

      setLatestResult(result);

    } catch (err) {
      console.error('Error fetching draw results:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawResults();

    // Actualizar cada 30 segundos
    const interval = setInterval(fetchDrawResults, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    latestResult,
    loading,
    error
  };
} 