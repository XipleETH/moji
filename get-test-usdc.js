import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './src/utils/contractAddresses.js';

const USDC_FAUCET_ABI = [
  "function drip(address recipient) external",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

async function getTestUSDC(walletAddress) {
  console.log('🚰 Solicitando USDC.e de prueba en Fuji');
  console.log('======================================');
  
  try {
    // Conectar al provider de Fuji
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    
    // Conectar al contrato USDC
    const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.USDC, USDC_FAUCET_ABI, provider);
    
    // Obtener símbolo y decimales
    const [symbol, decimals] = await Promise.all([
      usdcContract.symbol(),
      usdcContract.decimals()
    ]);
    
    console.log(`\n📝 Información del token:`);
    console.log(`- Dirección: ${CONTRACT_ADDRESSES.USDC}`);
    console.log(`- Símbolo: ${symbol}`);
    console.log(`- Decimales: ${decimals}`);
    
    // Obtener balance inicial
    const initialBalance = await usdcContract.balanceOf(walletAddress);
    console.log(`\n💰 Balance inicial: ${ethers.formatUnits(initialBalance, decimals)} ${symbol}`);
    
    // Solicitar tokens
    console.log('\n🚰 Solicitando tokens...');
    const tx = await usdcContract.drip(walletAddress);
    await tx.wait();
    
    // Obtener balance final
    const finalBalance = await usdcContract.balanceOf(walletAddress);
    console.log(`\n✅ Balance final: ${ethers.formatUnits(finalBalance, decimals)} ${symbol}`);
    
    return {
      symbol,
      decimals,
      initialBalance: initialBalance.toString(),
      finalBalance: finalBalance.toString()
    };
    
  } catch (error) {
    console.error('❌ Error solicitando tokens:', error);
    throw error;
  }
}

// Si se ejecuta directamente
if (process.argv[2]) {
  getTestUSDC(process.argv[2])
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { getTestUSDC }; 