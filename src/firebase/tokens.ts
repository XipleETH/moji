import { db } from './config';
import { 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { DailyTokens, TokenTransaction } from '../types';
import { getCurrentUser } from './auth';
import { getCurrentGameDaySaoPaulo } from '../utils/timezone';

const DAILY_TOKENS_COLLECTION = 'daily_tokens';
const TOKEN_TRANSACTIONS_COLLECTION = 'token_transactions';
const INITIAL_DAILY_TOKENS = 1000; // Para pruebas masivas

// Obtener la fecha actual en formato YYYY-MM-DD usando timezone de São Paulo
export const getCurrentGameDay = (): string => {
  return getCurrentGameDaySaoPaulo();
};

// Obtener o crear los tokens diarios del usuario
export const getUserDailyTokens = async (userId: string): Promise<DailyTokens> => {
  const currentDay = getCurrentGameDay();
  const tokensRef = doc(db, DAILY_TOKENS_COLLECTION, `${userId}_${currentDay}`);
  
  try {
    const tokensDoc = await getDoc(tokensRef);
    
    if (tokensDoc.exists()) {
      const data = tokensDoc.data();
      return {
        userId,
        date: currentDay,
        tokensAvailable: data.tokensAvailable || 0,
        tokensUsed: data.tokensUsed || 0,
        lastUpdated: data.lastUpdated?.toMillis() || Date.now()
      };
    } else {
      // Crear nuevo registro de tokens diarios
      const newTokens: DailyTokens = {
        userId,
        date: currentDay,
        tokensAvailable: INITIAL_DAILY_TOKENS,
        tokensUsed: 0,
        lastUpdated: Date.now()
      };
      
      await setDoc(tokensRef, {
        ...newTokens,
        lastUpdated: serverTimestamp()
      });
      
      // Registrar transacción de reset diario
      await addTokenTransaction({
        userId,
        type: 'daily_reset',
        amount: INITIAL_DAILY_TOKENS,
        timestamp: Date.now(),
        description: `Daily token reset for ${currentDay}`,
        gameDay: currentDay
      });
      
      console.log(`[getUserDailyTokens] Tokens diarios creados para usuario ${userId}: ${INITIAL_DAILY_TOKENS} tokens`);
      return newTokens;
    }
  } catch (error) {
    console.error('[getUserDailyTokens] Error obteniendo tokens diarios:', error);
    // Retornar estado por defecto en caso de error
    return {
      userId,
      date: currentDay,
      tokensAvailable: 0,
      tokensUsed: 0,
      lastUpdated: Date.now()
    };
  }
};

// Usar tokens para comprar tickets
export const useTokensForTicket = async (userId: string, tokenCost: number = 1): Promise<boolean> => {
  const currentDay = getCurrentGameDay();
  const tokensRef = doc(db, DAILY_TOKENS_COLLECTION, `${userId}_${currentDay}`);
  
  try {
    return await runTransaction(db, async (transaction) => {
      const tokensDoc = await transaction.get(tokensRef);
      
      if (!tokensDoc.exists()) {
        // Crear tokens si no existen
        const newTokens = {
          userId,
          date: currentDay,
          tokensAvailable: INITIAL_DAILY_TOKENS,
          tokensUsed: 0,
          lastUpdated: serverTimestamp()
        };
        transaction.set(tokensRef, newTokens);
      }
      
      const currentTokens = tokensDoc.exists() ? tokensDoc.data() : {
        tokensAvailable: INITIAL_DAILY_TOKENS,
        tokensUsed: 0
      };
      
      // Verificar si hay suficientes tokens
      if (currentTokens.tokensAvailable < tokenCost) {
        console.log(`[useTokensForTicket] Usuario ${userId} no tiene suficientes tokens. Disponibles: ${currentTokens.tokensAvailable}, Necesarios: ${tokenCost}`);
        return false;
      }
      
      // Actualizar tokens
      transaction.update(tokensRef, {
        tokensAvailable: currentTokens.tokensAvailable - tokenCost,
        tokensUsed: (currentTokens.tokensUsed || 0) + tokenCost,
        lastUpdated: serverTimestamp()
      });
      
      console.log(`[useTokensForTicket] Usuario ${userId} usó ${tokenCost} tokens. Restantes: ${currentTokens.tokensAvailable - tokenCost}`);
      return true;
    });
  } catch (error) {
    console.error('[useTokensForTicket] Error usando tokens:', error);
    return false;
  }
};

// Agregar tokens como premio
export const addPrizeTokens = async (userId: string, walletAddress: string, amount: number, prizeType: 'first' | 'second' | 'third' | 'free'): Promise<boolean> => {
  const currentDay = getCurrentGameDay();
  
  try {
    // En un sistema real, aquí enviaríamos tokens a la billetera del usuario
    // Por ahora, solo registramos la transacción
    await addTokenTransaction({
      userId,
      type: 'prize_received',
      amount,
      timestamp: Date.now(),
      description: `${prizeType} prize - ${amount} tokens`,
      gameDay: currentDay
    });
    
    console.log(`[addPrizeTokens] Premio de ${amount} tokens registrado para usuario ${userId} (${prizeType} prize)`);
    
    // TODO: Integrar con contrato inteligente para enviar tokens reales
    // await sendTokensToWallet(walletAddress, amount);
    
    return true;
  } catch (error) {
    console.error('[addPrizeTokens] Error agregando tokens de premio:', error);
    return false;
  }
};

// Suscribirse a los tokens del usuario actual
export const subscribeToUserTokens = (callback: (tokens: DailyTokens | null) => void) => {
  return getCurrentUser().then(user => {
    if (!user) {
      callback(null);
      return () => {};
    }
    
    const currentDay = getCurrentGameDay();
    const tokensRef = doc(db, DAILY_TOKENS_COLLECTION, `${user.id}_${currentDay}`);
    
    return onSnapshot(tokensRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          userId: user.id,
          date: currentDay,
          tokensAvailable: data.tokensAvailable || 0,
          tokensUsed: data.tokensUsed || 0,
          lastUpdated: data.lastUpdated?.toMillis() || Date.now()
        });
      } else {
        // Auto-crear tokens si no existen
        getUserDailyTokens(user.id).then(tokens => {
          callback(tokens);
        }).catch(error => {
          console.error('Error auto-creando tokens:', error);
          callback(null);
        });
      }
    }, (error) => {
      console.error('Error en suscripción a tokens:', error);
      callback(null);
    });
  }).catch(error => {
    console.error('Error obteniendo usuario actual:', error);
    callback(null);
    return () => {};
  });
};

// Agregar transacción de tokens
const addTokenTransaction = async (transaction: Omit<TokenTransaction, 'id'>): Promise<void> => {
  try {
    const transactionRef = doc(collection(db, TOKEN_TRANSACTIONS_COLLECTION));
    await setDoc(transactionRef, {
      ...transaction,
      id: transactionRef.id,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('[addTokenTransaction] Error registrando transacción:', error);
  }
};

// Obtener historial de transacciones del usuario
export const getUserTokenTransactions = async (userId: string): Promise<TokenTransaction[]> => {
  try {
    const { db } = await import('./config');
    const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');

    const transactionsQuery = query(
      collection(db, TOKEN_TRANSACTIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(transactionsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TokenTransaction[];
  } catch (error) {
    console.error('Error getting user token transactions:', error);
    return [];
  }
};

// Verificar si un usuario puede comprar un ticket
export const canUserBuyTicket = async (userId: string): Promise<{ canBuy: boolean; reason?: string; tokensAvailable: number }> => {
  try {
    console.log(`[canUserBuyTicket] Verificando capacidad de compra para usuario: ${userId}`);
    
    const tokens = await getUserDailyTokens(userId);
    
    console.log(`[canUserBuyTicket] Tokens obtenidos:`, {
      userId: tokens.userId,
      date: tokens.date,
      tokensAvailable: tokens.tokensAvailable,
      tokensUsed: tokens.tokensUsed,
      lastUpdated: new Date(tokens.lastUpdated).toISOString()
    });
    
    if (tokens.tokensAvailable >= 1) {
      console.log(`[canUserBuyTicket] Usuario PUEDE comprar ticket. Tokens disponibles: ${tokens.tokensAvailable}`);
      return {
        canBuy: true,
        tokensAvailable: tokens.tokensAvailable
      };
    } else {
      console.log(`[canUserBuyTicket] Usuario NO PUEDE comprar ticket. Tokens disponibles: ${tokens.tokensAvailable}`);
      return {
        canBuy: false,
        reason: 'Insufficient tokens for today',
        tokensAvailable: tokens.tokensAvailable
      };
    }
  } catch (error) {
    console.error('[canUserBuyTicket] Error verificando capacidad de compra:', error);
    return {
      canBuy: false,
      reason: 'Error checking token balance',
      tokensAvailable: 0
    };
  }
};

// Función para resetear manualmente los tokens de un usuario (para testing)
export const resetUserTokens = async (userId: string): Promise<boolean> => {
  const currentDay = getCurrentGameDay();
  const tokensRef = doc(db, DAILY_TOKENS_COLLECTION, `${userId}_${currentDay}`);
  
  try {
    console.log(`[resetUserTokens] Reseteando tokens para usuario: ${userId}`);
    
    await setDoc(tokensRef, {
      userId,
      date: currentDay,
      tokensAvailable: INITIAL_DAILY_TOKENS,
      tokensUsed: 0,
      lastUpdated: serverTimestamp()
    });
    
    console.log(`[resetUserTokens] Tokens reseteados exitosamente para usuario ${userId}: ${INITIAL_DAILY_TOKENS} tokens`);
    return true;
  } catch (error) {
    console.error('[resetUserTokens] Error reseteando tokens:', error);
    return false;
  }
}; 