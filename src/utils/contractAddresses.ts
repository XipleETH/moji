// Direcciones de contratos desplegados en Base Sepolia
export const CONTRACT_ADDRESSES = {
  // Base Sepolia testnet
  CHAIN_ID: 84532,
  RPC_URL: 'https://sepolia.base.org',
  
  // Token USDC en Base Sepolia
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  
  // Nuevo contrato integrado LottoMoji V2 (precio 0.2 USDC + timing corregido)
  LOTTO_MOJI_CORE: '0x8F6A8D8E1408d53D1C06Ed0664CC334Fa533480c', // V2: precio 0.2 USDC + setLastDrawTime
  
  // Contratos legacy (mantener para referencia)
  LEGACY_LOTTO_MOJI_CORE_V1: '0x3D896A1255aa93b529b4675c4991C92C7783652D', // V1: precio 2 USDC, timing desajustado
  LEGACY_LOTTO_MOJI_MAIN: '0x3823B745121DFC7616CC2F3dd15E89e0cb1E7987',
  LEGACY_LOTTO_MOJI_RESERVES: '0x765A3071f14BDD5272e6Cc83BE7fa059F472a77F',
  LEGACY_LOTTO_MOJI_TICKETS: '0x96303188b9e09f6F8b55685f51273c57DD2a8f79',
  LEGACY_LOTTO_MOJI_RANDOM: '0x3674D09be633dB84A2943B8386196D3eE9F9DeCc',
  LEGACY_LOTTO_MOJI_AUTOMATION: '0x311b8Aec021a78c3291005A5ee58727e080Fe94b',
  
  // Chainlink en Base Sepolia
  VRF_COORDINATOR: '0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE',
  KEY_HASH: '0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71'
} as const;

// Configuración del juego
export const GAME_CONFIG = {
  TICKET_PRICE: 0.2, // 0.2 USDC (actualizado V2)
  USDC_DECIMALS: 6,
  DRAW_TIME_UTC_MINUS_3: '00:00', // Medianoche São Paulo
  
  // Mapeo de índices a emojis (personalizable)
  EMOJI_MAP: [
    '🎮', '🎲', '🎯', '🎪', '🎨', // Gaming & Art (0-4)
    '💎', '💰', '💸', '🏆', '🎁', // Money & Prizes (5-9)
    '🚀', '🌙', '⭐', '✨', '🌟', // Space & Stars (10-14)
    '🎭', '🎪', '🎢', '🎡', '🎠', // Entertainment (15-19)
    '🍀', '🌈', '⚡', '🔥', '💫'  // Luck & Magic (20-24)
  ] as const,
  
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
  
  // Sistema de reservas mejorado (ahora integrado en el core)
  RESERVES: {
    FIRST_PRIZE_RESERVE: true,  // Reserve Pool 1
    SECOND_PRIZE_RESERVE: true, // Reserve Pool 2  
    THIRD_PRIZE_RESERVE: true   // Reserve Pool 3
  }
} as const;

export type ContractAddresses = typeof CONTRACT_ADDRESSES;
export type GameConfig = typeof GAME_CONFIG; 