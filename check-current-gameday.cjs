const { createPublicClient, http } = require('viem');
const { avalancheFuji } = require('viem/chains');

const CONTRACT_ADDRESS = '0x19d6c7dc1301860C4E14c72E4338B62113059471';

const ABI = [
  {
    inputs: [],
    name: 'currentGameDay',
    outputs: [{ name: '', type: 'uint24' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'nextDrawTs',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

async function checkCurrentGameDay() {
  console.log('🔍 Verificando gameDay actual del contrato V4...\n');

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http()
  });

  try {
    const [currentGameDay, nextDrawTs] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'currentGameDay'
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'nextDrawTs'
      })
    ]);

    const now = Math.floor(Date.now() / 1000);
    const calculatedGameDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

    console.log('📅 Contract currentGameDay:', currentGameDay.toString());
    console.log('📅 Calculated gameDay (frontend):', calculatedGameDay.toString());
    console.log('⏰ Next draw timestamp:', nextDrawTs.toString());
    console.log('⏰ Next draw date:', new Date(Number(nextDrawTs) * 1000).toLocaleString());
    console.log('⏰ Current timestamp:', now.toString());
    console.log('⏰ Current date:', new Date(now * 1000).toLocaleString());
    
    console.log('\n🔍 Análisis:');
    if (Number(currentGameDay) === calculatedGameDay) {
      console.log('✅ gameDay del contrato coincide con el calculado en frontend');
    } else {
      console.log('❌ gameDay del contrato NO coincide con el calculado en frontend');
      console.log(`   Diferencia: ${calculatedGameDay - Number(currentGameDay)} días`);
    }

    if (now >= Number(nextDrawTs)) {
      console.log('⚠️  Ya pasó la hora del próximo sorteo');
    } else {
      const timeToNext = Number(nextDrawTs) - now;
      console.log(`⏳ Tiempo hasta próximo sorteo: ${Math.floor(timeToNext / 3600)}h ${Math.floor((timeToNext % 3600) / 60)}m`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCurrentGameDay(); 