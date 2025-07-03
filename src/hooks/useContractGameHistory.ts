import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';
import { 
  getDrawHistory, 
  type FirestoreDrawResult 
} from '../firebase/blockchainResults';

interface ContractGameHistory {
  gameDay: string;
  winningNumbers: number[];
  winningEmojis: string[];
  drawn: boolean;
  distributed: boolean;
  totalCollected: string;
  lastDrawTime: number;
  hasWinners: boolean;
}

interface UseContractGameHistoryReturn {
  history: ContractGameHistory[];
  loading: boolean;
  error: string | null;
}

// ABI para el contrato V4 - estructura correcta
const GAME_HISTORY_ABI = [
  "function currentGameDay() view returns (uint24)",
  "function dayResults(uint24) view returns (uint32 processingIndex, uint32 winnersFirst, uint32 winnersSecond, uint32 winnersThird, bool fullyProcessed)",
  "function nextDrawTs() view returns (uint256)",
  "function automationActive() view returns (bool)",
  "function emergencyPause() view returns (bool)",
  "function totalSupply() view returns (uint256)"
];

// ABI para el evento DrawNumbers
const DRAW_NUMBERS_EVENT_ABI = [
  "event DrawNumbers(uint24 indexed day, uint8[4] numbers)"
];

// Convertir FirestoreDrawResult a ContractGameHistory
function convertFirestoreToGameHistory(firestoreResult: FirestoreDrawResult): ContractGameHistory {
  return {
    gameDay: firestoreResult.gameDay,
    winningNumbers: firestoreResult.winningNumbers,
    winningEmojis: firestoreResult.winningEmojis,
    drawn: firestoreResult.processed,
    distributed: firestoreResult.processed,
    totalCollected: '0', // TODO: Agregar esta información a Firestore en el futuro
    lastDrawTime: firestoreResult.drawTime * 1000, // Convertir a milisegundos
    hasWinners: true // Asumir que hay ganadores si hay un sorteo completado
  };
}

export function useContractGameHistory(): UseContractGameHistoryReturn {
  const [history, setHistory] = useState<ContractGameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGameHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏪 Fetching game history - Firestore first, blockchain as fallback');

      // 1. Intentar obtener desde Firestore primero
      const firestoreHistory = await getDrawHistory('avalanche-fuji', 10);
      
      if (firestoreHistory.length > 0) {
        console.log(`📥 Using ${firestoreHistory.length} history entries from Firestore`);
        const contractHistory = firestoreHistory.map(convertFirestoreToGameHistory);
        setHistory(contractHistory);
        return;
      }

      // 2. Si no hay datos en Firestore, buscar en blockchain
      console.log('📡 No Firestore history found, checking blockchain...');

      // Configurar provider para Avalanche Fuji
      const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, GAME_HISTORY_ABI, provider);
      const contractWithEvents = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, DRAW_NUMBERS_EVENT_ABI, provider);

      // Obtener datos básicos
      const [
        currentGameDay,
        nextDrawTs,
        automationActive,
        emergencyPause,
        totalSupply
      ] = await Promise.all([
        contract.currentGameDay(),
        contract.nextDrawTs(),
        contract.automationActive(),
        contract.emergencyPause(),
        contract.totalSupply()
      ]);

      console.log('🔍 Contract V4 History Status:');
      console.log('   Current Game Day:', currentGameDay.toString());
      console.log('   Next Draw Timestamp:', nextDrawTs.toString());
      console.log('   Total Supply:', totalSupply.toString());

      // Buscar eventos DrawNumbers para obtener el historial
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 2000); // Buscar en los últimos 2000 bloques
      
      console.log(`   📊 Searching DrawNumbers events from block ${fromBlock} to ${latestBlock}`);
      
      const historyData: ContractGameHistory[] = [];
      
      try {
        const drawEvents = await contractWithEvents.queryFilter(
          contractWithEvents.filters.DrawNumbers(),
          fromBlock,
          'latest'
        );
        
        console.log(`   📊 Found ${drawEvents.length} DrawNumbers events`);
        
        if (drawEvents.length > 0) {
          // Procesar todos los eventos encontrados (ordenados por fecha)
          const sortedEvents = drawEvents.sort((a, b) => Number(a.args.day) - Number(b.args.day));
          
          for (const event of sortedEvents) {
            const eventDay = event.args.day;
            const winningNumbers = event.args.numbers.map((num: bigint) => Number(num));
            const winningEmojis = winningNumbers.map(index => GAME_CONFIG.EMOJI_MAP[index] || '❓');
            
            console.log(`   📅 Processing Game Day ${eventDay}:`, winningNumbers);
            
            // Verificar el estado de procesamiento para este día
            let drawn = false;
            let winnersFirst = 0;
            let winnersSecond = 0;
            let winnersThird = 0;
            
            try {
              const dayResult = await contract.dayResults(eventDay);
              drawn = dayResult.fullyProcessed;
              winnersFirst = Number(dayResult.winnersFirst);
              winnersSecond = Number(dayResult.winnersSecond);
              winnersThird = Number(dayResult.winnersThird);
              
              console.log(`     Fully Processed: ${drawn}`);
              console.log(`     Winners: ${winnersFirst} / ${winnersSecond} / ${winnersThird}`);
            } catch (resultError) {
              console.warn(`Error fetching processing status for day ${eventDay}:`, resultError);
            }
            
            // Calcular tiempo estimado del sorteo (aproximación)
            const drawTime = Number(nextDrawTs) - (24 * 60 * 60 * (Number(currentGameDay) - Number(eventDay)));
            
            // Calcular total recaudado (aproximación basada en tickets vendidos)
            const estimatedTicketsPerDay = 10; // Aproximación
            const ticketPrice = 0.2; // USDC
            const totalCollected = (estimatedTicketsPerDay * ticketPrice).toString();
            
            const hasWinners = winnersFirst > 0 || winnersSecond > 0 || winnersThird > 0;
            
            historyData.push({
              gameDay: eventDay.toString(),
              winningNumbers,
              winningEmojis,
              drawn,
              distributed: drawn, // En V4, si está fullyProcessed, está distribuido
              totalCollected,
              lastDrawTime: drawTime * 1000, // Convertir a milisegundos
              hasWinners
            });
          }
        }
        
        // Si no hay eventos, crear una entrada para el día actual
        if (historyData.length === 0) {
          console.log('   📅 No draw events found, creating current day entry');
          
          historyData.push({
            gameDay: currentGameDay.toString(),
            winningNumbers: [0, 0, 0, 0],
            winningEmojis: ['❓', '❓', '❓', '❓'],
            drawn: false,
            distributed: false,
            totalCollected: '0',
            lastDrawTime: Number(nextDrawTs) * 1000,
            hasWinners: false
          });
        }
        
      } catch (eventError) {
        console.warn('Error searching for DrawNumbers events:', eventError);
        
        // Si hay error con eventos, crear entrada básica
        historyData.push({
          gameDay: currentGameDay.toString(),
          winningNumbers: [0, 0, 0, 0],
          winningEmojis: ['❓', '❓', '❓', '❓'],
          drawn: false,
          distributed: false,
          totalCollected: '0',
          lastDrawTime: Number(nextDrawTs) * 1000,
          hasWinners: false
        });
      }

      // Ordenar por día (más reciente primero)
      historyData.sort((a, b) => Number(b.gameDay) - Number(a.gameDay));
      
      console.log(`   📊 Final history data: ${historyData.length} entries`);
      setHistory(historyData);

    } catch (err) {
      console.error('❌ Error fetching game history:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
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