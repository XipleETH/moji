// ✅ CONFIGURACIÓN PARA AVALANCHE FUJI TESTNET ✅
export const CONTRACT_ADDRESSES = {
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
  LEGACY_LOTTO_MOJI_CORE_V2_1UTC: "0x108FabeC110B5B74DaB4953182F78957ef721ECB" // Fuji: SORTEOS DIARIOS 1:00 UTC + VRF OK (anterior)
}; 