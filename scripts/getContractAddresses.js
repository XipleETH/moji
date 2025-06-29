const fs = require('fs');
const path = require('path');

/**
 * Script para generar configuración del contrato LottoMojiCore
 * desplegado en Avalanche Fuji con sorteos a las 17:00 UTC
 */

console.log('🔧 GENERANDO CONFIGURACIÓN DE CONTRATO - AVALANCHE FUJI 17:00 UTC');
console.log('='.repeat(70));

// Configuración del nuevo contrato desplegado
const CONTRACT_CONFIG = {
  CHAIN_ID: 43113,
  NETWORK_NAME: 'Avalanche Fuji',
  RPC_URL: 'https://api.avax-test.network/ext/bc/C/rpc',
  EXPLORER_URL: 'https://testnet.snowtrace.io',
  
  // Direcciones del contrato desplegado
  LOTTO_MOJI_CORE: '0xeCCF651b43FA349666091b9B4bcA7Bb9D2B8125e',
  USDC: '0x5425890298aed601595a70AB815c96711a31Bc65',
  
  // Chainlink VRF
  VRF_COORDINATOR: '0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE',
  KEY_HASH: '0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887',
  SUBSCRIPTION_ID: '101248313039346717932007347873879037803370624422039457111978592264303680124860',
  
  // Configuración del juego
  TICKET_PRICE: 0.2,
  DRAW_TIME_UTC: '17:00',
  DRAW_TIME_COLOMBIA: '12:00 PM',
  
  // Deployment info
  DEPLOYMENT_DATE: '2024-06-28',
  LAST_DRAW_TIME: '2024-06-28T17:00:00.000Z',
  NEXT_DRAW_TIME: '2024-06-29T17:00:00.000Z'
};

console.log('📋 CONFIGURACIÓN ACTUAL:');
console.log('- Network:', CONTRACT_CONFIG.NETWORK_NAME);
console.log('- Chain ID:', CONTRACT_CONFIG.CHAIN_ID);
console.log('- Contrato:', CONTRACT_CONFIG.LOTTO_MOJI_CORE);
console.log('- USDC:', CONTRACT_CONFIG.USDC);
console.log('- Sorteos:', CONTRACT_CONFIG.DRAW_TIME_UTC, 'UTC');
console.log('- Precio ticket:', CONTRACT_CONFIG.TICKET_PRICE, 'USDC');

// Generar archivo de configuración TypeScript
const configContent = `// ✅ CONFIGURACIÓN ACTUALIZADA - AVALANCHE FUJI 17:00 UTC ✅
// Generado automáticamente el ${new Date().toISOString()}

export const CONTRACT_ADDRESSES = {
  // Avalanche Fuji testnet
  CHAIN_ID: ${CONTRACT_CONFIG.CHAIN_ID},
  RPC_URL: '${CONTRACT_CONFIG.RPC_URL}',
  EXPLORER_URL: '${CONTRACT_CONFIG.EXPLORER_URL}',
  
  // Token USDC en Avalanche Fuji
  USDC: '${CONTRACT_CONFIG.USDC}',
  
  // ✅ CONTRATO AVALANCHE FUJI - 17:00 UTC (12:00 PM COLOMBIA) ✅
  LOTTO_MOJI_CORE: "${CONTRACT_CONFIG.LOTTO_MOJI_CORE}", // Deployment: ${CONTRACT_CONFIG.DEPLOYMENT_DATE}
  
  // Chainlink en Avalanche Fuji
  VRF_COORDINATOR: '${CONTRACT_CONFIG.VRF_COORDINATOR}',
  KEY_HASH: '${CONTRACT_CONFIG.KEY_HASH}',
  SUBSCRIPTION_ID: '${CONTRACT_CONFIG.SUBSCRIPTION_ID}'
} as const;

export const GAME_CONFIG = {
  TICKET_PRICE: ${CONTRACT_CONFIG.TICKET_PRICE}, // USDC (6 decimales)
  USDC_DECIMALS: 6,
  DRAW_TIME_UTC: '${CONTRACT_CONFIG.DRAW_TIME_UTC}', // ${CONTRACT_CONFIG.DRAW_TIME_COLOMBIA} Colombia
  
  // Mapeo de índices a emojis (0-24)
  EMOJI_MAP: [
    '🎮', '🎲', '🎯', '🎸', '🎨', // Gaming & Art (0-4)
    '💎', '💰', '💸', '🏆', '🎁', // Money & Prizes (5-9)
    '🚀', '🌙', '⭐', '✨', '🌟', // Space & Stars (10-14)
    '🎭', '🎪', '🎢', '🎡', '🎠', // Entertainment (15-19)
    '🍀', '🌈', '⚡', '🔥', '💫'  // Luck & Magic (20-24)
  ] as const,
  
  // 🏆 LÓGICA DE PREMIOS - AVALANCHE FUJI 🏆
  PRIZE_SYSTEM: {
    FIRST_PRIZE: "4 emojis posición exacta",    // 🥇 Exactos
    SECOND_PRIZE: "4 emojis cualquier orden",   // 🥈 Desordenados  
    THIRD_PRIZE: "3 emojis posición exacta",    // 🥉 3 exactos
    FREE_TICKETS: "3 emojis cualquier orden"   // 🎫 Tickets gratis
  },
  
  // Distribución de pools
  DISTRIBUTION: {
    DAILY_TO_RESERVES: 0.20, // 20% a reservas
    DAILY_TO_MAIN_POOLS: 0.80, // 80% a pools principales
    
    FIRST_PRIZE: 0.80,  // 80% de pools principales  
    SECOND_PRIZE: 0.10, // 10% de pools principales
    THIRD_PRIZE: 0.05,  // 5% de pools principales
    DEVELOPMENT: 0.05   // 5% de pools principales
  }
} as const;

// Información de deployment
export const DEPLOYMENT_INFO = {
  CONTRACT_ADDRESS: '${CONTRACT_CONFIG.LOTTO_MOJI_CORE}',
  DEPLOYMENT_DATE: '${CONTRACT_CONFIG.DEPLOYMENT_DATE}',
  LAST_DRAW_CONFIGURED: '${CONTRACT_CONFIG.LAST_DRAW_TIME}',
  NEXT_DRAW_SCHEDULED: '${CONTRACT_CONFIG.NEXT_DRAW_TIME}',
  NETWORK: '${CONTRACT_CONFIG.NETWORK_NAME}',
  EXPLORER_LINK: '${CONTRACT_CONFIG.EXPLORER_URL}/address/${CONTRACT_CONFIG.LOTTO_MOJI_CORE}'
} as const;

export type ContractAddresses = typeof CONTRACT_ADDRESSES;
export type GameConfig = typeof GAME_CONFIG;`;

// Guardar archivo
const configPath = path.join(__dirname, '..', 'src', 'utils', 'contractAddresses.ts');
fs.writeFileSync(configPath, configContent);

console.log('\n✅ CONFIGURACIÓN GENERADA:');
console.log('- Archivo:', configPath);
console.log('- Contrato:', CONTRACT_CONFIG.LOTTO_MOJI_CORE);
console.log('- Red:', CONTRACT_CONFIG.NETWORK_NAME);
console.log('- Sorteos:', CONTRACT_CONFIG.DRAW_TIME_UTC, 'UTC');

console.log('\n🔗 ENLACES ÚTILES:');
console.log('- Contrato:', `${CONTRACT_CONFIG.EXPLORER_URL}/address/${CONTRACT_CONFIG.LOTTO_MOJI_CORE}`);
console.log('- USDC:', `${CONTRACT_CONFIG.EXPLORER_URL}/address/${CONTRACT_CONFIG.USDC}`);

console.log('\n' + '='.repeat(70));
console.log('🎉 CONFIGURACIÓN ACTUALIZADA EXITOSAMENTE');
console.log('✅ Frontend listo para usar el nuevo contrato');
console.log('='.repeat(70)); 