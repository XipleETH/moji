import { db } from './config';
import { 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { getCurrentUser } from './auth';
import { getUserTokenTransactions } from './tokens';

const PRIZE_CLAIMS_COLLECTION = 'prize_claims';
const TOKEN_TRANSACTIONS_COLLECTION = 'token_transactions';

export interface PrizeClaim {
  id: string;
  userId: string;
  tokensAmount: number;
  claimType: 'cash' | 'nft' | 'special_raffle';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedAt: number;
  processedAt?: number;
  transactionHash?: string;
  notes?: string;
}

// Obtener tokens ganados disponibles para reclamar
export const getAvailableWonTokens = async (userId: string): Promise<number> => {
  try {
    const transactions = await getUserTokenTransactions(userId);
    
    // Calcular tokens ganados
    const wonTokens = transactions
      .filter(tx => 
        tx.type === 'prize_first' || 
        tx.type === 'prize_second' || 
        tx.type === 'prize_third' ||
        tx.type === 'prize_received'
      )
      .reduce((total, tx) => total + tx.amount, 0);
    
    // Calcular tokens ya reclamados
    const claimedTokens = transactions
      .filter(tx => tx.type === 'prize_claimed')
      .reduce((total, tx) => total + Math.abs(tx.amount), 0);
    
    return Math.max(0, wonTokens - claimedTokens);
  } catch (error) {
    console.error('Error obteniendo tokens disponibles:', error);
    return 0;
  }
};

// Crear una solicitud de reclamación de premio
export const createPrizeClaim = async (
  tokensAmount: number,
  claimType: 'cash' | 'nft' | 'special_raffle'
): Promise<{ success: boolean; claimId?: string; error?: string }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Verificar tokens disponibles
    const availableTokens = await getAvailableWonTokens(user.id);
    if (availableTokens < tokensAmount) {
      return { 
        success: false, 
        error: `Tokens insuficientes. Disponibles: ${availableTokens}, Solicitados: ${tokensAmount}` 
      };
    }

    // Crear la reclamación en una transacción
    return await runTransaction(db, async (transaction) => {
      const claimRef = doc(collection(db, PRIZE_CLAIMS_COLLECTION));
      const transactionRef = doc(collection(db, TOKEN_TRANSACTIONS_COLLECTION));

      const claimData: Omit<PrizeClaim, 'id'> = {
        userId: user.id,
        tokensAmount,
        claimType,
        status: 'pending',
        requestedAt: Date.now()
      };

      // Crear la reclamación
      transaction.set(claimRef, {
        ...claimData,
        id: claimRef.id,
        requestedAt: serverTimestamp()
      });

      // Registrar la transacción de tokens reclamados
      transaction.set(transactionRef, {
        id: transactionRef.id,
        userId: user.id,
        type: 'prize_claimed',
        amount: -tokensAmount, // Negativo porque se "gastan"
        timestamp: serverTimestamp(),
        description: `Reclamación de ${tokensAmount} tokens (${claimType})`,
        claimId: claimRef.id
      });

      console.log(`Reclamación creada: ${tokensAmount} tokens para ${claimType}`);
      return { success: true, claimId: claimRef.id };
    });

  } catch (error) {
    console.error('Error creando reclamación:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
};

// Obtener historial de reclamaciones del usuario
export const getUserPrizeClaims = async (userId: string): Promise<PrizeClaim[]> => {
  try {
    const claimsQuery = query(
      collection(db, PRIZE_CLAIMS_COLLECTION),
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc')
    );

    const claimsSnapshot = await getDocs(claimsQuery);
    return claimsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toMillis() || Date.now(),
      processedAt: doc.data().processedAt?.toMillis()
    })) as PrizeClaim[];

  } catch (error) {
    console.error('Error obteniendo reclamaciones:', error);
    return [];
  }
};

// Obtener todas las reclamaciones pendientes (para administración)
export const getPendingClaims = async (): Promise<PrizeClaim[]> => {
  try {
    const claimsQuery = query(
      collection(db, PRIZE_CLAIMS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'asc')
    );

    const claimsSnapshot = await getDocs(claimsQuery);
    return claimsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toMillis() || Date.now(),
      processedAt: doc.data().processedAt?.toMillis()
    })) as PrizeClaim[];

  } catch (error) {
    console.error('Error obteniendo reclamaciones pendientes:', error);
    return [];
  }
};

// Actualizar estado de una reclamación (para administración)
export const updateClaimStatus = async (
  claimId: string,
  status: 'approved' | 'rejected' | 'completed',
  transactionHash?: string,
  notes?: string
): Promise<boolean> => {
  try {
    const claimRef = doc(db, PRIZE_CLAIMS_COLLECTION, claimId);
    
    await updateDoc(claimRef, {
      status,
      processedAt: serverTimestamp(),
      ...(transactionHash && { transactionHash }),
      ...(notes && { notes })
    });

    console.log(`Reclamación ${claimId} actualizada a estado: ${status}`);
    return true;

  } catch (error) {
    console.error('Error actualizando reclamación:', error);
    return false;
  }
}; 