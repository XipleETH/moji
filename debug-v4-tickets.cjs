const { createPublicClient, http } = require('viem');
const { avalancheFuji } = require('viem/chains');

// Configuración del contrato V4
const CONTRACT_ADDRESS = '0x19d6c7dc1301860C4E14c72E4338B62113059471';

// Dirección del usuario que compró tickets
const USER_ADDRESS = '0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0'; // Dirección real del usuario

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
      { name: 'purchaseTime', type: 'uint40' },
      { name: 'gameDay', type: 'uint24' },
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

async function debugV4Tickets() {
  console.log('🔍 Debug V4 Tickets Loading...\n');
  console.log('📍 Contract:', CONTRACT_ADDRESS);
  console.log('👤 User:', USER_ADDRESS);
  console.log('');

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
    console.log('📊 Total Supply:', totalSupply.toString());

    // 2. Verificar balance del usuario
    const userBalance = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOTTO_MOJI_CORE_V4_ABI,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    });
    console.log('🎫 User Balance:', userBalance.toString());

    if (Number(userBalance) === 0) {
      console.log('⚠️  Usuario no tiene tickets');
      return;
    }

    // 3. Calcular gameDay actual
    const currentGameDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    console.log('📅 Current Game Day:', currentGameDay);
    console.log('');

    // 4. Cargar todos los tickets del usuario
    console.log('🔄 Cargando tickets del usuario...');
    const userTickets = [];
    let todayTickets = 0;

    for (let i = 0; i < Number(userBalance); i++) {
      try {
        // Obtener token ID por índice
        const tokenId = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [USER_ADDRESS, BigInt(i)]
        });

        // Obtener información del ticket
        const ticketInfo = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'tickets',
          args: [tokenId]
        });

        const [purchaseTime, gameDay, claimed] = ticketInfo;
        const ticketGameDay = Number(gameDay);
        
        // Sin acceso a números, usar placeholder
        const numberArray = [0, 1, 2, 3]; // Placeholder
        const emojis = numberArray.map(num => EMOJI_MAP[num] || '🎵');

        const ticket = {
          tokenId: tokenId.toString(),
          purchaseTime: Number(purchaseTime),
          gameDay: ticketGameDay,
          numbers: numberArray,
          emojis: emojis,
          claimed: claimed,
          isToday: ticketGameDay === currentGameDay
        };

        userTickets.push(ticket);
        if (ticket.isToday) todayTickets++;

        console.log(`  🎫 Ticket ${i + 1}:`);
        console.log(`    Token ID: ${tokenId.toString()}`);
        console.log(`    Purchase Time: ${new Date(Number(purchaseTime) * 1000).toLocaleString()}`);
        console.log(`    Game Day: ${ticketGameDay} ${ticket.isToday ? '(TODAY)' : ''}`);
        console.log(`    Numbers: [${numberArray.join(', ')}] (placeholder)`);
        console.log(`    Emojis: [${emojis.join(' ')}] (placeholder)`);
        console.log(`    Claimed: ${claimed}`);
        console.log('');

      } catch (error) {
        console.error(`❌ Error cargando ticket ${i}:`, error.message);
      }
    }

    console.log(`✅ Resumen:`);
    console.log(`   Total tickets: ${userTickets.length}`);
    console.log(`   Tickets de hoy: ${todayTickets}`);
    console.log(`   Tickets anteriores: ${userTickets.length - todayTickets}`);
    
    if (todayTickets === 0) {
      console.log('');
      console.log('⚠️  No hay tickets del día actual');
      console.log('   Esto explicaría por qué no aparecen en el frontend');
      console.log('   El frontend filtra por gameDay === currentGameDay');
    } else {
      console.log('');
      console.log('✅ Hay tickets del día actual, deberían aparecer en el frontend');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugV4Tickets()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  }); 