import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const CONTRACT_ADDRESS = '0x3823B745121DFC7616CC2F3dd15E89e0cb1E7987'; // LottoMojiMain

const LOTTO_MOJI_MAIN_ABI = [
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'EMOJIS',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
];

async function testEmojis() {
  console.log('🔍 Probando lectura de emojis del contrato...');
  console.log('📍 Contrato:', CONTRACT_ADDRESS);
  console.log('🌐 Red: Base Sepolia');
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  const emojis = [];
  let errorCount = 0;

  console.log('\n📋 Leyendo emojis del contrato (índices 0-29):');
  console.log('═'.repeat(50));

  for (let i = 0; i < 30; i++) {
    try {
      const emoji = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LOTTO_MOJI_MAIN_ABI,
        functionName: 'EMOJIS',
        args: [BigInt(i)]
      });
      
      if (emoji && emoji !== '') {
        emojis.push(emoji);
        console.log(`${i.toString().padStart(2, '0')}: ${emoji}`);
      } else {
        console.log(`${i.toString().padStart(2, '0')}: [vacío]`);
        break; // Si encontramos uno vacío, probablemente no hay más
      }
    } catch (error) {
      errorCount++;
      console.log(`${i.toString().padStart(2, '0')}: ❌ Error - ${error.message}`);
      if (errorCount > 3) {
        console.log('Demasiados errores, deteniendo...');
        break;
      }
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Total de emojis encontrados: ${emojis.length}`);
  console.log(`❌ Errores encontrados: ${errorCount}`);
  
  if (emojis.length > 0) {
    console.log('\n🎯 Emojis válidos del contrato:');
    console.log(JSON.stringify(emojis, null, 2));
    
    console.log('\n📊 Array para copiar al código:');
    console.log(`const CONTRACT_EMOJIS = [${emojis.map(e => `'${e}'`).join(', ')}];`);
  } else {
    console.log('\n⚠️  No se encontraron emojis en el contrato');
  }
}

testEmojis().catch(console.error); 