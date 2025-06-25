const fs = require('fs');
const path = require('path');

/**
 * Script para extraer direcciones de contratos desplegados
 * y generar configuración para el frontend
 */

const contractsDir = path.join(__dirname, '..', 'contracts');
const contractFolders = [
  'LottoMojiMain.sol',
  'LottoMojiReserves.sol', 
  'LottoMojiTickets.sol',
  'LottoMojiRandom.sol',
  'LottoMojiAutomation.sol'
];

const addresses = {};
const abis = {};

for (const contractFolder of contractFolders) {
  const contractName = contractFolder.replace('.sol', '');
  const jsonPath = path.join(contractsDir, contractFolder, `${contractName}.json`);
  
  try {
    if (fs.existsSync(jsonPath)) {
      const contractData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      
      let address = null;
      
      // Buscar dirección en diferentes lugares
      if (contractData.networks) {
        for (const [networkId, networkData] of Object.entries(contractData.networks)) {
          if (networkData.address) {
            address = networkData.address;
            console.log(`✅ ${contractName}: ${address} (Network: ${networkId})`);
            break;
          }
        }
      }
      
      if (!address && contractData.address) {
        address = contractData.address;
        console.log(`✅ ${contractName}: ${address} (Direct)`);
      }
      
      if (!address) {
        console.log(`⚠️  ${contractName}: Dirección no encontrada`);
      }
      
      addresses[contractName] = address || '0x0000000000000000000000000000000000000000';
      abis[contractName] = contractData.abi || [];
      
    } else {
      console.log(`❌ ${contractName}: Archivo JSON no encontrado`);
    }
  } catch (error) {
    console.log(`❌ ${contractName}: Error - ${error.message}`);
  }
}

console.log('\n📋 Direcciones encontradas:');
for (const [name, address] of Object.entries(addresses)) {
  const status = address === '0x0000000000000000000000000000000000000000' ? '❌ FALTANTE' : '✅ OK';
  console.log(`${name}: ${address} ${status}`);
}

// Generar archivo de configuración
const configContent = `export const CONTRACT_ADDRESSES = {
  CHAIN_ID: 84532,
  RPC_URL: 'https://sepolia.base.org',
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  
  LOTTO_MOJI_MAIN: '${addresses.LottoMojiMain || '0x0000000000000000000000000000000000000000'}',
  LOTTO_MOJI_RESERVES: '${addresses.LottoMojiReserves || '0x0000000000000000000000000000000000000000'}',
  LOTTO_MOJI_TICKETS: '${addresses.LottoMojiTickets || '0x0000000000000000000000000000000000000000'}',
  LOTTO_MOJI_RANDOM: '${addresses.LottoMojiRandom || '0x0000000000000000000000000000000000000000'}',
  LOTTO_MOJI_AUTOMATION: '${addresses.LottoMojiAutomation || '0x0000000000000000000000000000000000000000'}',
  
  VRF_COORDINATOR: '0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE',
  KEY_HASH: '0x8077df514608a09f83e4e8d300645594e5d7cd9f1e39beb9b8ebb88c6f4bb2e4'
} as const;

export const GAME_CONFIG = {
  TICKET_PRICE: 2,
  USDC_DECIMALS: 6,
  DRAW_TIME_UTC_MINUS_3: '03:00',
  DISTRIBUTION: {
    DAILY_TO_RESERVES: 0.20,
    DAILY_TO_MAIN_POOLS: 0.80,
    FIRST_PRIZE: 0.80,
    SECOND_PRIZE: 0.10,
    THIRD_PRIZE: 0.05,
    DEVELOPMENT: 0.05
  }
} as const;`;

const configPath = path.join(__dirname, '..', 'src', 'utils', 'contractAddresses.ts');
fs.writeFileSync(configPath, configContent);
console.log(`\n✅ Configuración guardada en: ${configPath}`);

console.log('\n🎉 Script completado!');

module.exports = { extractContractAddresses }; 