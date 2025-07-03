import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';

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

// ABI para el contrato V4 - estructura correcta
const DRAW_RESULTS_ABI = [
  "function currentGameDay() view returns (uint24)",
  "function dayResults(uint24) view returns (uint32 processingIndex, uint32 winnersFirst, uint32 winnersSecond, uint32 winnersThird, bool fullyProcessed)",
  "function nextDrawTs() view returns (uint256)",
  "function automationActive() view returns (bool)",
  "function emergencyPause() view returns (bool)"
];

// ABI para el evento DrawNumbers
const DRAW_NUMBERS_EVENT_ABI = [
  "event DrawNumbers(uint24 indexed day, uint8[4] numbers)"
];

export function useContractDrawResults(): UseContractDrawResultsReturn {
  const [latestResult, setLatestResult] = useState<ContractDrawResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrawResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // Configurar provider para Avalanche Fuji
      const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, DRAW_RESULTS_ABI, provider);
      const contractWithEvents = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, DRAW_NUMBERS_EVENT_ABI, provider);

      // Obtener datos básicos
      const [
        currentGameDay,
        nextDrawTs,
        automationActive,
        emergencyPause
      ] = await Promise.all([
        contract.currentGameDay(),
        contract.nextDrawTs(),
        contract.automationActive(),
        contract.emergencyPause()
      ]);

      console.log('🔍 Contract V4 Status:');
      console.log('   Current Game Day:', currentGameDay.toString());
      console.log('   Next Draw Timestamp:', nextDrawTs.toString());
      console.log('   Automation Active:', automationActive);
      console.log('   Emergency Pause:', emergencyPause);

      // Buscar eventos DrawNumbers para obtener los números ganadores
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 2000); // Últimos 2000 bloques
      
      let winningNumbersArray: number[] = [];
      let drawn = false;
      let eventDay = 0n;
      let drawEvents: any[] = [];
      
      try {
        drawEvents = await contractWithEvents.queryFilter(
          contractWithEvents.filters.DrawNumbers(),
          fromBlock,
          'latest'
        );
        
        console.log('   Found DrawNumbers events:', drawEvents.length);
        
        if (drawEvents.length > 0) {
          // Obtener el evento más reciente
          const latestEvent = drawEvents[drawEvents.length - 1];
          eventDay = latestEvent.args.day;
          winningNumbersArray = latestEvent.args.numbers.map((num: bigint) => Number(num));
          
          console.log('   Latest Draw Event:');
          console.log('     Day:', eventDay.toString());
          console.log('     Numbers:', winningNumbersArray);
          console.log('     Block:', latestEvent.blockNumber);
          
          // Verificar si el procesamiento está completo
          try {
            const dayResult = await contract.dayResults(eventDay);
            drawn = dayResult.fullyProcessed;
            console.log('     Fully Processed:', drawn);
          } catch (resultError) {
            console.warn('Error fetching processing status:', resultError);
            drawn = false;
          }
        }
      } catch (eventError) {
        console.warn('Error searching for DrawNumbers events:', eventError);
      }

      // Convertir números ganadores a emojis
      const winningEmojis = winningNumbersArray.map(index => GAME_CONFIG.EMOJI_MAP[index] || '❓');

      const result: ContractDrawResult = {
        gameDay: eventDay.toString(),
        winningNumbers: winningNumbersArray,
        winningEmojis,
        drawn: drawn,
        distributed: drawn, // En V4, si está fullyProcessed, está distribuido
        lastDrawTime: Number(nextDrawTs) - 24 * 60 * 60, // Aproximación: nextDrawTs - 1 día
        totalDrawsExecuted: drawEvents?.length || 0
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