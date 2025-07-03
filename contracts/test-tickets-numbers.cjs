const { createPublicClient, http } = require('viem');
const { avalancheFuji } = require('viem/chains');

// Configuración
const CONTRACT_ADDRESS = '0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008';
const USER_ADDRESS = '0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0';

// ABI simplificado para tickets
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
  }
];

// Mapa de emojis
const EMOJI_MAP = [
  '🎵', '🎶', '🎸', '🎹', '🎺', '🎻', '🎤', '🎧', '🎬', '🎭', 
  '🎪', '🎨', '🎯', '🎲', '🎳', '🎮', '🎰', '🎱', '🎻', '🎺', 
  '🎸', '🎹', '⚡', '💫', '🌟'
];

async function main() {
  const client = createPublicClient({
    chain: avalancheFuji,
    transport: http()
  });

  try {
    console.log('🎫 Probando carga de tickets V4...');
    console.log('Dirección del usuario:', USER_ADDRESS);
    console.log('Contrato V4:', CONTRACT_ADDRESS);

    // Obtener cantidad de tickets
    const ticketsOwned = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOTTO_MOJI_CORE_V4_ABI,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    });

    console.log(`\n📊 Tickets owned: ${ticketsOwned.toString()}`);

    if (Number(ticketsOwned) === 0) {
      console.log('❌ No tickets found for this user');
      return;
    }

    // Obtener primeros 3 tickets como ejemplo
    const maxTickets = Math.min(3, Number(ticketsOwned));
    console.log(`\n🎯 Obteniendo información de ${maxTickets} tickets:`);

    for (let i = 0; i < maxTickets; i++) {
      try {
        // Obtener token ID
        const tokenId = await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [USER_ADDRESS, BigInt(i)]
        });

        console.log(`\n--- Ticket ${i + 1} ---`);
        console.log(`Token ID: ${tokenId.toString()}`);

        // Obtener información del ticket
        const ticketInfo = await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: LOTTO_MOJI_CORE_V4_ABI,
          functionName: 'tickets',
          args: [tokenId]
        });

        const purchaseTime = Number(ticketInfo[0]);
        const gameDay = Number(ticketInfo[1]);
        const claimed = ticketInfo[2];

        console.log(`Purchase Time: ${new Date(purchaseTime * 1000).toLocaleString()}`);
        console.log(`Game Day: ${gameDay}`);
        console.log(`Claimed: ${claimed}`);

        // Usar números fallback basados en tokenId
        const numbers = [
          parseInt(tokenId.toString()) % 25,
          (parseInt(tokenId.toString()) * 7) % 25,
          (parseInt(tokenId.toString()) * 13) % 25,
          (parseInt(tokenId.toString()) * 19) % 25
        ];
        
        console.log(`Numbers (fallback): [${numbers.join(', ')}]`);

        // Convertir a emojis
        const emojis = numbers.map(num => EMOJI_MAP[num] || '❓');
        console.log(`Emojis (fallback): ${emojis.join(' ')}`);

      } catch (error) {
        console.error(`❌ Error loading ticket ${i + 1}:`, error.message);
      }
    }

    console.log('\n✅ Prueba completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error); 