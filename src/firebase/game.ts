import { collection, doc, setDoc, getDocs, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from './config';
import { Ticket, User } from '../types';

// Collection names
const TICKETS_COLLECTION = 'player_tickets';
const GAME_STATE_COLLECTION = 'game_state';
const GAME_RESULTS_COLLECTION = 'game_results';

// Generate a ticket ID for Firebase storage
export const generateTicketId = (): string => {
  return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Save ticket to Firebase (for backup/tracking)
export const saveTicketToFirebase = async (ticket: Ticket): Promise<void> => {
  try {
    const ticketRef = doc(collection(db, TICKETS_COLLECTION), ticket.id);
    await setDoc(ticketRef, {
      ...ticket,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Ticket saved to Firebase:', ticket.id);
  } catch (error) {
    console.error('Error saving ticket to Firebase:', error);
    throw error;
  }
};

// Get user tickets from Firebase
export const getUserTickets = async (userId: string): Promise<Ticket[]> => {
  try {
    const q = query(
      collection(db, TICKETS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    const tickets: Ticket[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tickets.push({
        id: doc.id,
        numbers: data.numbers,
        timestamp: data.timestamp,
        userId: data.userId,
        walletAddress: data.walletAddress,
        txHash: data.txHash,
        isUsed: data.isUsed || false,
        isFreeTicket: data.isFreeTicket || false,
        paymentHash: data.paymentHash
      });
    });
    
    return tickets;
  } catch (error) {
    console.error('Error getting user tickets:', error);
    return [];
  }
};

// Save game state to Firebase
export const saveGameState = async (gameState: any): Promise<void> => {
  try {
    const stateRef = doc(db, GAME_STATE_COLLECTION, 'current');
    await setDoc(stateRef, {
      ...gameState,
      updatedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving game state:', error);
  }
};

// Log transaction for tracking
export const logTransaction = async (transactionData: {
  txHash: string;
  userId: string;
  walletAddress: string;
  type: 'ticket_purchase' | 'prize_claim';
  amount?: string;
  ticketId?: string;
  emojis?: string[];
  paymentMethod?: 'ETH' | 'USDC';
}): Promise<void> => {
  try {
    await addDoc(collection(db, 'transactions'), {
      ...transactionData,
      timestamp: new Date(),
      status: 'completed'
    });
    console.log('Transaction logged:', transactionData.txHash);
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
};

// Simple function to generate a ticket (this now uses contracts)
export const generateTicket = async (numbers: string[], user: User): Promise<Ticket | null> => {
  try {
    // This function is now mainly for Firebase backup
    // The actual ticket creation happens in the smart contract
    const ticketId = generateTicketId();
    
    const ticket: Ticket = {
      id: ticketId,
      numbers,
      timestamp: Date.now(),
      userId: user.id,
      walletAddress: user.walletAddress,
    };
    
    // Save to Firebase for backup/tracking
    await saveTicketToFirebase(ticket);
    
    return ticket;
  } catch (error) {
    console.error('Error generating ticket:', error);
    return null;
  }
};

// Request manual game draw (placeholder for admin functions)
export const requestManualGameDraw = async (): Promise<void> => {
  console.log('Manual game draw requested - this would trigger a Cloud Function in production');
  // In production, this would call a Cloud Function that can trigger the draw
  // For now, it's just a placeholder
}; 