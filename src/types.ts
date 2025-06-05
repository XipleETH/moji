// Add these interfaces to your existing types.ts file

export interface ChatMessage {
  id: string;
  emojis: string[];
  timestamp: number;
  userId?: string;
  username?: string;
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
  walletAddress?: string;  // Dirección de billetera del usuario de Farcaster
  fid?: number;            // Farcaster ID único
  isFarcasterUser: boolean; // Indica si el usuario está autenticado a través de Farcaster
  verifiedWallet?: boolean; // Indica si la billetera ha sido verificada
  chainId?: number;        // ID de la cadena principal (1 = Ethereum, 10 = Optimism, etc.)
  tokenBalance?: string;   // Balance del token del juego (si existe)
  nfts?: string[];         // NFTs que posee el usuario (si se implementan)
  lastTransactionHash?: string; // Hash de la última transacción 
}

export interface FarcasterProfile {
  fid: number;
  username: string;
  displayName?: string;
  bio?: string;
  pfp?: string;
  followerCount?: number;
  followingCount?: number;
  custody_address?: string; // Dirección de custodia de Farcaster (billetera principal)
  verifications?: string[]; // Direcciones verificadas
}

export interface Ticket {
  id: string;
  numbers: string[];
  timestamp: number;
  userId?: string;
  walletAddress?: string;  // Añadimos la billetera para futuras integraciones con contratos
  fid?: number;            // Farcaster ID para identificación
  txHash?: string;         // Hash de transacción si el ticket se mintea como NFT
  isUsed?: boolean;        // Si el ticket ya fue usado para ganar
  isFreeTicket?: boolean;  // Si es un ticket gratuito del cuarto premio
  paymentHash?: string;    // Hash del pago que generó el ticket
}

export interface GameResult {
  id: string;
  timestamp: number;
  winningNumbers: string[];
  firstPrize: string;    // Prize amounts as formatted strings
  secondPrize: string;
  thirdPrize: string;
  freePrize: Ticket[];   // Free tickets for fourth prize
  // Campos para futuras integraciones blockchain
  blockNumber?: number;     // Bloque donde se procesó el resultado
  randomSeed?: string;      // Semilla aleatoria utilizada
  verificationHash?: string; // Hash para verificación
}

export interface GameState {
  winningNumbers: string[];
  tickets: Ticket[];
  lastResults: null | {
    firstPrize: string;
    secondPrize: string;
    thirdPrize: string;
    freePrize: Ticket[];
  };
  gameStarted: boolean;
  timeRemaining: number;
}

// Interfaces para integración con contratos inteligentes
export interface ContractConfig {
  address: string;
  abi: any[];
  chainId: number;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  data: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockNumber?: number;
}