// ✅ CONFIGURACIÓN PARA AVALANCHE FUJI TESTNET ✅
const CONTRACT_ADDRESSES = {
  // Avalanche Fuji testnet
  CHAIN_ID: 43113,
  RPC_URL: 'https://api.avax-test.network/ext/bc/C/rpc',
  EXPLORER_URL: 'https://testnet.snowtrace.io',
  
  // Token USDC en Avalanche Fuji
  USDC: '0x5425890298aed601595a70AB815c96711a31Bc65',
  
  // 🎯 CONTRATO AVALANCHE FUJI - SORTEOS DIARIOS 2:00 UTC 🎯
  LOTTO_MOJI_CORE: "0xb0565a978766e7E3d4D5264f5480Ca50E93c51bc", // Fuji: SORTEOS DIARIOS 2:00 UTC + VRF V4 + ERC721Enumerable
  
  // Contratos legacy en Base Sepolia (mantener para referencia)
  LEGACY_LOTTO_MOJI_CORE_V3: "0x250af59d8E4dd4bf541c7D4c3fBD9C0726C6d822", // Fuji: SORTEOS DIARIOS 2:00 UTC + VRF V3 + Gas Optimized
  LEGACY_BASE_SEPOLIA_V6: "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61", // Base Sepolia V6: 04:00 UTC
  LEGACY_LOTTO_MOJI_CORE_V2_1UTC: "0x108FabeC110B5B74DaB4953182F78957ef721ECB", // Fuji: SORTEOS DIARIOS 1:00 UTC + VRF OK (anterior)
  LEGACY_AVALANCHE_FUJI_04UTC: "0xe980475E4aF2f0B937059E9394262b36827B215F", // Fuji: 04:00 UTC (anterior)
  LEGACY_AVALANCHE_FUJI_17UTC: "0xeCCF651b43FA349666091b9B4bcA7Bb9D2B8125e", // Fuji: 17:00 UTC (anterior)
  LEGACY_AVALANCHE_FUJI_HOURLY_V1: "0x599D73443e2fE18b03dfD8d28cad40af26C04155", // Fuji: Sorteos horarios v1 (timing bug)
  LEGACY_AVALANCHE_FUJI_HOURLY_V2: "0x900ebdF6C0807E4d3007e07009BDeDFc5E63fbB1", // Fuji: SORTEOS HORARIOS + TIMING FIXED
  LEGACY_AVALANCHE_FUJI_BROKEN_VRF: "0x1B0B1A24983E51d809FBfAc424946B314fEFA271", // Fuji: VRF con direcciones incorrectas
  LEGACY_LOTTO_MOJI_CORE_V1: '0x3D896A1255aa93b529b4675c4991C92C7783652D', // V1: precio 2 USDC, timing desajustado
  LEGACY_LOTTO_MOJI_CORE_V2: '0x8F6A8D8E1408d53D1C06Ed0664CC334Fa533480c', // V2: precio 0.2 USDC + setLastDrawTime
  LEGACY_LOTTO_MOJI_CORE_V4: '0x6d05B87dCD1d601770E4c04Db2D91F1cAc288C3D', // V4: Sin mantenimiento + flujo integrado (infinite upkeep bug)
  LEGACY_LOTTO_MOJI_CORE_V5_PROD: '0x88A8bf76D33Ab98a5836C352419f3837338030d3', // V5: Production with 03:00 UTC draw time
  LEGACY_LOTTO_MOJI_CORE_V5_TEST_13H: '0x56C39ACE40099fE1848c695646759926A5a6ED12', // V5: Test with 13:00 Bogotá draw time
  LEGACY_LOTTO_MOJI_CORE_V5_16H: '0x9F19b81457Ccb253D957a9771187EB38766b9d51', // V5: 16:00 UTC + lógica antigua (día anterior)
  LEGACY_LOTTO_MOJI_MAIN: '0x3823B745121DFC7616CC2F3dd15E89e0cb1E7987',
  LEGACY_LOTTO_MOJI_RESERVES: '0x765A3071f14BDD5272e6Cc83BE7fa059F472a77F',
  LEGACY_LOTTO_MOJI_TICKETS: '0x96303188b9e09f6F8b55685f51273c57DD2a8f79',
  LEGACY_LOTTO_MOJI_RANDOM: '0x3674D09be633dB84A2943B8386196D3eE9F9DeCc',
  LEGACY_LOTTO_MOJI_AUTOMATION: '0x311b8Aec021a78c3291005A5ee58727e080Fe94b',
  
  // Chainlink en Avalanche Fuji - DIRECCIONES CORRECTAS
  VRF_COORDINATOR: '0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE',
  KEY_HASH: '0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887'
} as const;

// Configuración del juego
const GAME_CONFIG = {
  TICKET_PRICE: 0.2, // 0.2 USDC (6 decimales)
  USDC_DECIMALS: 6,
  DRAW_TIME_UTC: '2:00 UTC', // 🎯 SORTEOS DIARIOS A LAS 2:00 UTC
  
  // Mapeo de índices a emojis (personalizable)
  EMOJI_MAP: [
    '🎮', '🎲', '🎯', '🎸', '🎨', // Gaming & Art (0-4)
    '💎', '💰', '💸', '🏆', '🎁', // Money & Prizes (5-9)
    '🚀', '🌙', '⭐', '✨', '🌟', // Space & Stars (10-14)
    '🎭', '🎪', '🎢', '🎡', '🎠', // Entertainment (15-19)
    '🍀', '🌈', '⚡', '🔥', '💫'  // Luck & Magic (20-24)
  ] as const,
  
  // 🏆 NUEVA LÓGICA DE PREMIOS (VERSION FUJI) 🏆
  PRIZE_SYSTEM: {
    FIRST_PRIZE: "4 emojis posición exacta",    // 🥇 Exactos
    SECOND_PRIZE: "4 emojis cualquier orden",   // 🥈 Desordenados
    THIRD_PRIZE: "3 emojis posición exacta",    // 🥉 3 exactos
    FREE_TICKETS: "3 emojis cualquier orden"   // 🎫 Tickets gratis
  } as const,
  
  // Distribución de pools (según contrato V3 Fuji)
  DISTRIBUTION: {
    DAILY_TO_RESERVES: 0.20, // 20% SIEMPRE a reservas
    DAILY_TO_MAIN_POOLS: 0.80, // 80% a pools principales
    
    // Distribución de pools principales (80% del total)
    FIRST_PRIZE: 0.80,  // 80% del 80% = 64% del total
    SECOND_PRIZE: 0.10, // 10% del 80% = 8% del total
    THIRD_PRIZE: 0.05,  // 5% del 80% = 4% del total
    DEVELOPMENT: 0.05   // 5% del 80% = 4% del total
  } as const,
  
  // Distribución de reservas (20% del total)
  RESERVE_DISTRIBUTION: {
    FIRST_PRIZE_RESERVE: 0.80,  // 80% de reservas = 16% del total
    SECOND_PRIZE_RESERVE: 0.10, // 10% de reservas = 2% del total
    THIRD_PRIZE_RESERVE: 0.10   // 10% de reservas = 2% del total
  } as const,
  
  // Sistema de reservas mejorado (integrado en el core)
  RESERVES: {
    FIRST_PRIZE_RESERVE: true,  // Reserve Pool 1 - auto refill
    SECOND_PRIZE_RESERVE: true, // Reserve Pool 2 - auto refill
    THIRD_PRIZE_RESERVE: true   // Reserve Pool 3 - auto refill
  } as const
} as const;

// Type definitions
export type ContractAddresses = typeof CONTRACT_ADDRESSES;
export type GameConfig = typeof GAME_CONFIG;

// Default exports
export { CONTRACT_ADDRESSES, GAME_CONFIG }; 