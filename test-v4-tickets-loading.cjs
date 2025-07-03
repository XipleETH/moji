const { createPublicClient, http } = require('viem');
const { avalancheFuji } = require('viem/chains');

// Configuración del contrato V4
const CONTRACT_ADDRESS = '0x19d6c7dc1301860C4E14c72E4338B62113059471';
const USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';

// Dirección del usuario (reemplaza con la dirección real)
const USER_ADDRESS = '0x123...'; // Aquí va la dirección del usuario

// ABI mínima para pruebas
const LOTTO_MOJI_CORE_V4_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tickets',
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'gameDay', type: 'uint24' },
      { name: 'numbers', type: 'uint8[4]' },
      { name: 'claimed', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const EMOJI_MAP = ['🎵', '🎸', '🎤', '🎧', '🎹', '🥁', '🎺', '🎷', '🎻', '🪕', '🎪', '🎭', '🎨', '🎬', '🎮', '🎯', '🎲', '🎳', '🎰', '🎊'];

async function testV4TicketLoading() {
  console.log('🔍 Probando carga de tickets V4...\n');

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http()
  });

  try {
    // 1. Verificar total supply
    const totalSupply = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOTTO_MOJI_CORE_V4_ABI,
      functionName: 'totalSupply'
    });
    console.log('📊 Total tickets minted:', totalSupply.toString());

    // 2. Verificar balance del usuario
    const userBalance = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOTTO_MOJI_CORE_V4_ABI,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    });
    console.log('🎫 Tickets del usuario:', userBalance.toString());

    if (Number(userBalance) === 0) {
      console.log('⚠️  Usuario no tiene tickets');
      return;
    }

    // 3. Cargar tickets del usuario
    console.log('\n🔄 Cargando tickets del usuario...');
    const userTickets = [];

    for (let i = 0; i < Number(userBalance); i++) {
      try {
        // Obtener token ID por índice
        const tokenId = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [USER_ADDRESS, BigInt(i)]
        });

        console.log(`  Token ${i}: ID ${tokenId.toString()}`);

        // Obtener información del ticket
        const ticketInfo = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'tickets',
          args: [tokenId]
        });

        const [owner, gameDay, numbers, claimed] = ticketInfo;
        const numberArray = Array.from(numbers);
        const emojis = numberArray.map(num => EMOJI_MAP[num] || '🎵');

        const ticket = {
          tokenId: tokenId.toString(),
          owner: owner,
          gameDay: gameDay.toString(),
          numbers: numberArray,
          emojis: emojis,
          claimed: claimed
        };

        userTickets.push(ticket);

        console.log(`    Owner: ${owner}`);
        console.log(`    Game Day: ${gameDay.toString()}`);
        console.log(`    Numbers: [${numberArray.join(', ')}]`);
        console.log(`    Emojis: [${emojis.join(', ')}]`);
        console.log(`    Claimed: ${claimed}`);
        console.log('');

      } catch (error) {
        console.error(`❌ Error cargando ticket ${i}:`, error.message);
      }
    }

    console.log(`✅ Tickets cargados exitosamente: ${userTickets.length}/${userBalance.toString()}`);
    
    return userTickets;

  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  if (USER_ADDRESS === '0x123...') {
    console.log('⚠️  Por favor, actualiza USER_ADDRESS con la dirección real del usuario');
    process.exit(1);
  }
  
  testV4TicketLoading()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testV4TicketLoading }; 