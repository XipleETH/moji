// Direcciones de contratos desplegados en Base Sepolia
export const CONTRACT_ADDRESSES = {
  // Base Sepolia testnet
  CHAIN_ID: 84532,
  RPC_URL: 'https://sepolia.base.org',
  
  // Token USDC en Base Sepolia
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  
  // 🧪 CONTRATO DE PRUEBA V5 - TEST 13:30 BOGOTÁ 🧪
  LOTTO_MOJI_CORE: '0x48672dA806CCdD1d482bA1f1577AbeD585A8c99C', // V5 TEST: 13:30 Bogotá draw time + new subscription + upkeep fix
  
  // Contratos legacy (mantener para referencia)
  LEGACY_LOTTO_MOJI_CORE_V1: '0x3D896A1255aa93b529b4675c4991C92C7783652D', // V1: precio 2 USDC, timing desajustado
  LEGACY_LOTTO_MOJI_CORE_V2: '0x8F6A8D8E1408d53D1C06Ed0664CC334Fa533480c', // V2: precio 0.2 USDC + setLastDrawTime
  LEGACY_LOTTO_MOJI_CORE_V3_OLD: '0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5', // V3: VRF subscription ID incorrecto
  LEGACY_LOTTO_MOJI_CORE_V3_NEW: '0xfc1a8Bc0180Fc615810d62374F16C4c026141031', // V3: Con mantenimiento cada hora
  LEGACY_LOTTO_MOJI_CORE_V4: '0x6d05B87dCD1d601770E4c04Db2D91F1cAc288C3D', // V4: Sin mantenimiento + flujo integrado (infinite upkeep bug)
  LEGACY_LOTTO_MOJI_CORE_V5_PROD: '0x88A8bf76D33Ab98a5836C352419f3837338030d3', // V5: Production with 03:00 UTC draw time
  LEGACY_LOTTO_MOJI_CORE_V5_TEST_13H: '0x56C39ACE40099fE1848c695646759926A5a6ED12', // V5: Test with 13:00 Bogotá draw time
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
    '🎮', '🎲', '🎯', '🎸', '🎨', // Gaming & Art (0-4)
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