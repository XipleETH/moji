import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  orderBy, 
  query, 
  limit,
  where,
  getDoc 
} from 'firebase/firestore';
import { db } from './config';

export interface FirestoreDrawResult {
  gameDay: string;
  winningNumbers: number[];
  winningEmojis: string[];
  blockNumber: number;
  transactionHash: string;
  drawTime: number;
  network: string;
  contractAddress: string;
  processed: boolean;
  createdAt: number;
}

const COLLECTION_NAME = 'drawResults';

// Guardar resultado en Firestore
export async function saveDrawResult(result: FirestoreDrawResult): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, `${result.network}_${result.gameDay}`);
    await setDoc(docRef, result);
    console.log('✅ Draw result saved to Firestore:', result.gameDay);
    return true;
  } catch (error) {
    console.error('❌ Error saving draw result to Firestore:', error);
    return false;
  }
}

// Obtener el resultado más reciente
export async function getLatestDrawResult(network: string = 'avalanche-fuji'): Promise<FirestoreDrawResult | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('network', '==', network),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('📭 No draw results found in Firestore');
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const result = doc.data() as FirestoreDrawResult;
    console.log('📥 Latest draw result from Firestore:', result.gameDay);
    return result;
  } catch (error) {
    console.error('❌ Error getting latest draw result from Firestore:', error);
    return null;
  }
}

// Obtener historial de resultados (para Game History)
export async function getDrawHistory(network: string = 'avalanche-fuji', limitCount: number = 10): Promise<FirestoreDrawResult[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('network', '==', network),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const results: FirestoreDrawResult[] = [];
    
    querySnapshot.forEach((doc) => {
      results.push(doc.data() as FirestoreDrawResult);
    });
    
    console.log(`📚 Retrieved ${results.length} draw results from Firestore`);
    return results;
  } catch (error) {
    console.error('❌ Error getting draw history from Firestore:', error);
    return [];
  }
}

// Verificar si un resultado ya existe
export async function drawResultExists(gameDay: string, network: string = 'avalanche-fuji'): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, `${network}_${gameDay}`);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('❌ Error checking if draw result exists:', error);
    return false;
  }
}

// Función helper para crear un resultado desde datos del blockchain
export function createFirestoreResult(
  gameDay: string,
  winningNumbers: number[],
  winningEmojis: string[],
  blockNumber: number,
  transactionHash: string,
  drawTime: number,
  network: string = 'avalanche-fuji',
  contractAddress: string,
  processed: boolean = true
): FirestoreDrawResult {
  return {
    gameDay,
    winningNumbers,
    winningEmojis,
    blockNumber,
    transactionHash,
    drawTime,
    network,
    contractAddress,
    processed,
    createdAt: Date.now()
  };
} 