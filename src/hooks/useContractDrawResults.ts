import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from '../utils/contractAddresses';
import { 
  getLatestDrawResult, 
  saveDrawResult, 
  createFirestoreResult,
  drawResultExists,
  type FirestoreDrawResult 
} from '../firebase/blockchainResults';

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

// Convertir FirestoreDrawResult a ContractDrawResult
function convertFirestoreToContract(firestoreResult: FirestoreDrawResult): ContractDrawResult {
  return {
    gameDay: firestoreResult.gameDay,
    winningNumbers: firestoreResult.winningNumbers,
    winningEmojis: firestoreResult.winningEmojis,
    drawn: firestoreResult.processed,
    distributed: firestoreResult.processed,
    lastDrawTime: firestoreResult.drawTime,
    totalDrawsExecuted: 1 // Esto se puede mejorar contando documentos
  };
}

// Función para buscar nuevos resultados en blockchain y guardarlos en Firestore
async function checkForNewDraws(currentGameDay: number): Promise<FirestoreDrawResult | null> {
  try {
    console.log('🔍 Checking blockchain for new draws...');
    
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    const contractWithEvents = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, DRAW_NUMBERS_EVENT_ABI, provider);

    // Buscar eventos DrawNumbers recientes
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 2000); // Últimos 2000 bloques
    
    const drawEvents = await contractWithEvents.queryFilter(
      contractWithEvents.filters.DrawNumbers(),
      fromBlock,
      'latest'
    );
    
    console.log(`🎯 Found ${drawEvents.length} DrawNumbers events in recent blocks`);
    
    if (drawEvents.length === 0) {
      return null;
    }
    
    // Procesar el evento más reciente
    const latestEvent = drawEvents[drawEvents.length - 1];
    const eventGameDay = latestEvent.args.day.toString();
    
    // Verificar si ya tenemos este resultado en Firestore
    const exists = await drawResultExists(eventGameDay);
    if (exists) {
      console.log('📋 Draw result already exists in Firestore:', eventGameDay);
      return null;
    }
    
    // Obtener datos del evento
    const winningNumbers = latestEvent.args.numbers.map((num: bigint) => Number(num));
    const winningEmojis = winningNumbers.map(index => GAME_CONFIG.EMOJI_MAP[index] || '❓');
    
    // Obtener timestamp del bloque
    const block = await provider.getBlock(latestEvent.blockNumber);
    const drawTime = block ? block.timestamp : Math.floor(Date.now() / 1000);
    
    console.log('🆕 New draw found:');
    console.log('   Game Day:', eventGameDay);
    console.log('   Numbers:', winningNumbers);
    console.log('   Emojis:', winningEmojis);
    console.log('   Block:', latestEvent.blockNumber);
    
    // Crear resultado para Firestore
    const firestoreResult = createFirestoreResult(
      eventGameDay,
      winningNumbers,
      winningEmojis,
      latestEvent.blockNumber,
      latestEvent.transactionHash,
      drawTime,
      'avalanche-fuji',
      CONTRACT_ADDRESSES.LOTTO_MOJI_CORE,
      true
    );
    
    // Guardar en Firestore
    const saved = await saveDrawResult(firestoreResult);
    if (saved) {
      console.log('✅ New draw result saved to Firestore');
      return firestoreResult;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error checking for new draws:', error);
    return null;
  }
}

export function useContractDrawResults(): UseContractDrawResultsReturn {
  const [latestResult, setLatestResult] = useState<ContractDrawResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrawResults = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏪 Fetching draw results - Firestore first, blockchain as fallback');

      // 1. Intentar obtener desde Firestore primero
      const firestoreResult = await getLatestDrawResult('avalanche-fuji');
      
      if (firestoreResult) {
        console.log('📥 Using result from Firestore:', firestoreResult.gameDay);
        const contractResult = convertFirestoreToContract(firestoreResult);
        setLatestResult(contractResult);
        
        // En background, verificar si hay nuevos sorteos
        checkForNewDraws(parseInt(firestoreResult.gameDay))
          .then((newResult) => {
            if (newResult) {
              console.log('🔄 Found newer result, updating display');
              const updatedResult = convertFirestoreToContract(newResult);
              setLatestResult(updatedResult);
            }
          })
          .catch((error) => {
            console.warn('⚠️ Background check failed:', error);
          });
        
        return;
      }

      // 2. Si no hay datos en Firestore, buscar en blockchain
      console.log('📡 No Firestore data found, checking blockchain...');
      
      const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, DRAW_RESULTS_ABI, provider);
      const contractWithEvents = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, DRAW_NUMBERS_EVENT_ABI, provider);

      // Obtener datos básicos del contrato
      const [currentGameDay, nextDrawTs] = await Promise.all([
        contract.currentGameDay(),
        contract.nextDrawTs()
      ]);

      console.log('🔍 Contract V4 Status:');
      console.log('   Current Game Day:', currentGameDay.toString());
      console.log('   Next Draw Timestamp:', nextDrawTs.toString());

      // Buscar eventos DrawNumbers
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 2000);
      
      const drawEvents = await contractWithEvents.queryFilter(
        contractWithEvents.filters.DrawNumbers(),
        fromBlock,
        'latest'
      );
      
      console.log('   Found DrawNumbers events:', drawEvents.length);
      
      if (drawEvents.length === 0) {
        // No hay sorteos aún
        const result: ContractDrawResult = {
          gameDay: currentGameDay.toString(),
          winningNumbers: [],
          winningEmojis: [],
          drawn: false,
          distributed: false,
          lastDrawTime: Number(nextDrawTs) - 24 * 60 * 60,
          totalDrawsExecuted: 0
        };
        
        setLatestResult(result);
        return;
      }

      // Procesar el evento más reciente
      const latestEvent = drawEvents[drawEvents.length - 1];
      const eventDay = latestEvent.args.day;
      const winningNumbers = latestEvent.args.numbers.map((num: bigint) => Number(num));
      const winningEmojis = winningNumbers.map(index => GAME_CONFIG.EMOJI_MAP[index] || '❓');
      
      // Verificar procesamiento
      let processed = false;
      try {
        const dayResult = await contract.dayResults(eventDay);
        processed = dayResult.fullyProcessed;
      } catch (resultError) {
        console.warn('Error checking processing status:', resultError);
      }

      const result: ContractDrawResult = {
        gameDay: eventDay.toString(),
        winningNumbers,
        winningEmojis,
        drawn: processed,
        distributed: processed,
        lastDrawTime: Number(nextDrawTs) - 24 * 60 * 60,
        totalDrawsExecuted: drawEvents.length
      };

      setLatestResult(result);

      // Guardar este resultado en Firestore para el futuro
      const block = await provider.getBlock(latestEvent.blockNumber);
      const drawTime = block ? block.timestamp : Math.floor(Date.now() / 1000);
      
      const firestoreResultToSave = createFirestoreResult(
        eventDay.toString(),
        winningNumbers,
        winningEmojis,
        latestEvent.blockNumber,
        latestEvent.transactionHash,
        drawTime,
        'avalanche-fuji',
        CONTRACT_ADDRESSES.LOTTO_MOJI_CORE,
        processed
      );
      
      // Guardar en background
      saveDrawResult(firestoreResultToSave)
        .then(() => console.log('💾 Result saved to Firestore for future use'))
        .catch((error) => console.warn('⚠️ Failed to save to Firestore:', error));

    } catch (err) {
      console.error('❌ Error fetching draw results:', err);
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