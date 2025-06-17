// Direcciones de contratos desplegados en Base Sepolia
export const CONTRACT_ADDRESSES = {
  // Base Sepolia testnet
  CHAIN_ID: 84532,
  RPC_URL: 'https://sepolia.base.org',
  
  // Token USDC en Base Sepolia
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  
  // Contratos LottoMoji desplegados en Base Sepolia
  LOTTO_MOJI_MAIN: '0x3823B745121DFC7616CC2F3dd15E89e0cb1E7987',
  LOTTO_MOJI_RESERVES: '0x765A3071f14BDD5272e6Cc83BE7fa059F472a77F',
  LOTTO_MOJI_TICKETS: '0x96303188b9e09f6F8b55685f51273c57DD2a8f79',
  LOTTO_MOJI_RANDOM: '0x3674D09be633dB84A2943B8386196D3eE9F9DeCc',
  LOTTO_MOJI_AUTOMATION: '0x311b8Aec021a78c3291005A5ee58727e080Fe94b',
  
  // Chainlink en Base Sepolia
  VRF_COORDINATOR: '0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE',
  KEY_HASH: '0x8077df514608a09f83e4e8d300645594e5d7cd9f1e39beb9b8ebb88c6f4bb2e4'
} as const;

// Configuración del juego
export const GAME_CONFIG = {
  TICKET_PRICE: 2, // 2 USDC
  USDC_DECIMALS: 6,
  DRAW_TIME_UTC_MINUS_3: '03:00', // 3:00 AM São Paulo
  
  // 25 emojis crypto/gambling themed según README2.md
  EMOJIS: ['💰', '💎', '🚀', '🎰', '🎲', '🃏', '💸', '🏆', '🎯', '🔥', 
           '⚡', '🌙', '⭐', '💫', '🎪', '🎨', '🦄', '🌈', '🍀', '🎭',
           '🎢', '🎮', '🏅', '🎊', '🎈'] as const,
  
  // Distribución de pools (según README2.md)
  DISTRIBUTION: {
    DAILY_TO_RESERVES: 0.20, // 20% SIEMPRE a reservas
    DAILY_TO_MAIN_POOLS: 0.80, // 80% a pools principales
    
    // Distribución de pools principales
    FIRST_PRIZE: 0.80,  // 80% del 80%
    SECOND_PRIZE: 0.10, // 10% del 80%  
    THIRD_PRIZE: 0.05,  // 5% del 80%
    DEVELOPMENT: 0.05   // 5% del 80%
  },
  
  // Sistema de reservas mejorado
  RESERVES: {
    FIRST_PRIZE_RESERVE: true,  // Reserve Pool 1
    SECOND_PRIZE_RESERVE: true, // Reserve Pool 2  
    THIRD_PRIZE_RESERVE: true   // Reserve Pool 3
  }
} as const;

export type ContractAddresses = typeof CONTRACT_ADDRESSES;
export type GameConfig = typeof GAME_CONFIG; 