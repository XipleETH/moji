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
  // Nuevos campos para el sistema de tokens diarios
  dailyTokens?: number;    // Tokens disponibles para el día actual
  lastTokenReset?: string; // Fecha del último reset de tokens (YYYY-MM-DD)
  totalTokensUsed?: number; // Total de tokens usados históricamente
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
  // Nuevos campos para tickets por día
  gameDay: string;         // Día del juego (YYYY-MM-DD) - ticket solo válido para este día
  tokenCost: number;       // Costo en tokens (siempre 1 para este sistema)
  isActive: boolean;       // Si el ticket está activo para el sorteo
}

export interface GameResult {
  id: string;
  timestamp: number;
  winningNumbers: string[];
  firstPrize: Ticket[];
  secondPrize: Ticket[];
  thirdPrize: Ticket[];
  freePrize: Ticket[];
  // Campos para futuras integraciones blockchain
  blockNumber?: number;     // Bloque donde se procesó el resultado
  randomSeed?: string;      // Semilla aleatoria utilizada
  verificationHash?: string; // Hash para verificación
  // Nuevos campos para sistema de premios automáticos
  gameDay: string;         // Día del juego (YYYY-MM-DD)
  prizesDistributed: boolean; // Si los premios ya fueron distribuidos
  prizeTransactions?: PrizeTransaction[]; // Transacciones de distribución de premios
}

export interface GameState {
  winningNumbers: string[];
  tickets: Ticket[];
  lastResults: null | {
    firstPrize: Ticket[];
    secondPrize: Ticket[];
    thirdPrize: Ticket[];
    freePrize: Ticket[];
  };
  gameStarted: boolean;
  timeRemaining?: number;
  // Nuevos campos para el estado del juego
  currentGameDay: string;  // Día actual del juego
  userTokens: number;      // Tokens disponibles del usuario actual
}

// Nuevas interfaces para el sistema de tokens y premios

export interface DailyTokens {
  userId: string;
  date: string; // YYYY-MM-DD
  tokensAvailable: number;
  tokensUsed: number;
  lastUpdated: number;
}

export interface PrizeTransaction {
  id: string;
  userId: string;
  walletAddress: string;
  prizeType: 'first' | 'second' | 'third' | 'free';
  amount: number; // En tokens
  txHash?: string; // Hash de la transacción en blockchain
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  gameDay: string;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  type: 'daily_reset' | 'ticket_purchase' | 'prize_received';
  amount: number;
  timestamp: number;
  description: string;
  gameDay?: string;
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

// Interface para el contrato de tokens
export interface LottoToken {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  contractAddress: string;
}