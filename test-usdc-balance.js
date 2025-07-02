import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './src/utils/contractAddresses.js';

const USDC_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

async function checkUSDCBalance(walletAddress) {
  console.log('🔍 Verificando balance de USDC en Fuji');
  console.log('=======================================');
  
  try {
    // Conectar al provider de Fuji
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    
    // Conectar al contrato USDC
    const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.USDC, USDC_ABI, provider);
    
    // Obtener símbolo y decimales
    const [symbol, decimals] = await Promise.all([
      usdcContract.symbol(),
      usdcContract.decimals()
    ]);
    
    console.log(`\n📝 Información del token:`);
    console.log(`- Dirección: ${CONTRACT_ADDRESSES.USDC}`);
    console.log(`- Símbolo: ${symbol}`);
    console.log(`- Decimales: ${decimals}`);
    
    // Obtener balance y allowance
    const [balance, allowance] = await Promise.all([
      usdcContract.balanceOf(walletAddress),
      usdcContract.allowance(walletAddress, CONTRACT_ADDRESSES.LOTTO_MOJI_CORE)
    ]);
    
    console.log(`\n💰 Balance y permisos:`);
    console.log(`- Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    console.log(`- Allowance para LottoMoji: ${ethers.formatUnits(allowance, decimals)} ${symbol}`);
    
    return {
      symbol,
      decimals,
      balance: balance.toString(),
      allowance: allowance.toString()
    };
    
  } catch (error) {
    console.error('❌ Error verificando balance:', error);
    throw error;
  }
}

// Si se ejecuta directamente
if (process.argv[2]) {
  checkUSDCBalance(process.argv[2])
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { checkUSDCBalance }; 