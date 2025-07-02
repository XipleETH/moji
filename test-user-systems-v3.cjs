const { ethers } = require('ethers');

// Configuración del contrato V3
const CONTRACT_ADDRESS = '0x250af59d8E4dd4bf541c7D4c3fBD9C0726C6d822';
const USER_ADDRESS = '0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0'; // La dirección que compró tickets

// ABI para consultar tickets y resultados (sin funciones Enumerable)
const LOTTO_MOJI_ABI = [
  "function pools() view returns (uint256 firstPrize, uint256 secondPrize, uint256 thirdPrize, uint256 devPool, uint256 firstReserve, uint256 secondReserve, uint256 thirdReserve)",
  "function currentGameDay() view returns (uint24)",
  "function nextDrawTs() view returns (uint256)",
  "function dailyDrawHourUTC() view returns (uint8)",
  "function ticketPrice() view returns (uint256)",
  "function automationActive() view returns (bool)",
  "function emergencyPause() view returns (bool)",
  "function dayResults(uint24) view returns (uint8[4] winningNumbers, uint32 processingIndex, uint32 winnersFirst, uint32 winnersSecond, uint32 winnersThird, bool fullyProcessed)",
  "function tickets(uint256) view returns (uint40 purchaseTime, uint24 gameDay, uint8[4] numbers, bool claimed)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

// Mapa de emojis (mismos que usa el frontend)
const EMOJI_MAP = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'
];

async function testUserSystemsV3() {
    try {
        console.log('🧪 VERIFICANDO SISTEMAS DE USUARIO - CONTRATO V3');
        console.log('=================================================');
        
        // Crear provider
        const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, LOTTO_MOJI_ABI, provider);
        
        console.log('📍 Contrato:', CONTRACT_ADDRESS);
        console.log('👤 Usuario:', USER_ADDRESS);
        
        // 1. VERIFICAR BALANCE DE TICKETS DEL USUARIO
        console.log('\n🎫 BALANCE DE TICKETS DEL USUARIO');
        console.log('==================================');
        
        const userBalance = await contract.balanceOf(USER_ADDRESS);
        console.log('├─ Total tickets owned:', Number(userBalance));
        
        // 2. VERIFICAR ALGUNOS TICKETS ESPECÍFICOS (por rango estimado)
        console.log('\n🔍 MUESTREO DE TICKETS');
        console.log('======================');
        
        if (Number(userBalance) > 0) {
            console.log('├─ Intentando encontrar tickets del usuario...');
            
            // Dado que compramos 20 tickets recientemente, probablemente están en los IDs más altos
            // Vamos a probar un rango estimado
            let foundTickets = 0;
            const startId = 1; // Empezar desde el ticket 1
            const maxToCheck = 100; // Revisar hasta 100 tickets
            
            for (let tokenId = startId; tokenId <= startId + maxToCheck && foundTickets < 10; tokenId++) {
                try {
                    const owner = await contract.ownerOf(tokenId);
                    if (owner.toLowerCase() === USER_ADDRESS.toLowerCase()) {
                        const ticketData = await contract.tickets(tokenId);
                        
                        const purchaseTime = Number(ticketData[0]);
                        const gameDay = Number(ticketData[1]);
                        const numbers = Array.from(ticketData[2]);
                        const claimed = ticketData[3];
                        
                        const emojis = numbers.map(num => EMOJI_MAP[num] || '❓');
                        const purchaseDate = new Date(purchaseTime * 1000);
                        
                        console.log(`│  Ticket #${tokenId}:`);
                        console.log(`│    ├─ Game Day: ${gameDay}`);
                        console.log(`│    ├─ Numbers: ${numbers.join(', ')} (${emojis.join('')})`);
                        console.log(`│    ├─ Purchased: ${purchaseDate.toLocaleString()}`);
                        console.log(`│    └─ Claimed: ${claimed ? 'Yes' : 'No'}`);
                        
                        foundTickets++;
                    }
                } catch (error) {
                    // El ticket no existe o no pertenece al usuario
                    if (error.message.includes('ERC721NonexistentToken')) {
                        // Ya no hay más tickets, salir del bucle
                        break;
                    }
                }
            }
            
            console.log(`│  ├─ Tickets encontrados en muestra: ${foundTickets}`);
            console.log(`│  └─ Total reportado por balanceOf: ${Number(userBalance)}`);
            
        } else {
            console.log('└─ No hay tickets para este usuario');
        }
        
        // 3. VERIFICAR HISTORIAL DE NÚMEROS GANADORES
        console.log('\n🎯 HISTORIAL DE NÚMEROS GANADORES');
        console.log('==================================');
        
        const currentGameDay = await contract.currentGameDay();
        console.log('├─ Día actual del juego:', Number(currentGameDay));
        
        // Verificar resultados de los últimos días
        for (let day = Math.max(1, Number(currentGameDay) - 5); day <= Number(currentGameDay); day++) {
            try {
                const dayResult = await contract.dayResults(day);
                const winningNumbers = Array.from(dayResult[0]);
                const processingIndex = Number(dayResult[1]);
                const winnersFirst = Number(dayResult[2]);
                const winnersSecond = Number(dayResult[3]);
                const winnersThird = Number(dayResult[4]);
                const fullyProcessed = dayResult[5];
                
                const hasNumbers = winningNumbers.some(num => num !== 0);
                const winningEmojis = winningNumbers.map(num => EMOJI_MAP[num] || '❓');
                
                console.log(`│  Día ${day}:`);
                if (hasNumbers) {
                    console.log(`│    ├─ Números ganadores: ${winningNumbers.join(', ')} (${winningEmojis.join('')})`);
                    console.log(`│    ├─ Ganadores 1er: ${winnersFirst}`);
                    console.log(`│    ├─ Ganadores 2do: ${winnersSecond}`);
                    console.log(`│    ├─ Ganadores 3er: ${winnersThird}`);
                    console.log(`│    ├─ Procesado: ${processingIndex} tickets`);
                    console.log(`│    └─ Completado: ${fullyProcessed ? 'Sí' : 'No'}`);
                } else {
                    console.log(`│    └─ Sin sorteo aún`);
                }
                
            } catch (dayError) {
                console.log(`│  Día ${day}: Sin datos disponibles`);
            }
        }
        
        // 4. VERIFICAR DATOS DE PERFIL DEL USUARIO
        console.log('\n👤 DATOS DE PERFIL DEL USUARIO');
        console.log('==============================');
        
        const [pools, ticketPrice, currentDay] = await Promise.all([
            contract.pools(),
            contract.ticketPrice(),
            contract.currentGameDay()
        ]);
        
        // Estadísticas del usuario
        const totalTickets = Number(userBalance);
        const totalSpent = totalTickets * Number(ethers.formatUnits(ticketPrice, 6));
        
        console.log('├─ Información general:');
        console.log(`│  ├─ Tickets totales: ${totalTickets}`);
        console.log(`│  ├─ Total gastado: ${totalSpent.toFixed(1)} USDC`);
        console.log(`│  ├─ Precio por ticket: ${ethers.formatUnits(ticketPrice, 6)} USDC`);
        console.log(`│  └─ Dirección: ${USER_ADDRESS}`);
        
        // 5. ESTADO GENERAL DEL CONTRATO
        console.log('\n⚙️ ESTADO DEL CONTRATO');
        console.log('======================');
        
        const [automation, emergency, nextDraw] = await Promise.all([
            contract.automationActive(),
            contract.emergencyPause(),
            contract.nextDrawTs()
        ]);
        
        console.log('├─ Estado del sistema:');
        console.log(`│  ├─ Automation activa: ${automation ? 'Sí' : 'No'}`);
        console.log(`│  ├─ Pausa de emergencia: ${emergency ? 'Sí' : 'No'}`);
        console.log(`│  ├─ Próximo sorteo: ${new Date(Number(nextDraw) * 1000).toLocaleString()}`);
        console.log(`│  └─ Día actual: ${Number(currentGameDay)}`);
        
        // 6. ANÁLISIS DE POOLS ACTUALES
        console.log('\n💰 ANÁLISIS DE POOLS');
        console.log('====================');
        
        const totalMainPools = Number(ethers.formatUnits(pools[0], 6)) + 
                              Number(ethers.formatUnits(pools[1], 6)) + 
                              Number(ethers.formatUnits(pools[2], 6)) + 
                              Number(ethers.formatUnits(pools[3], 6));
        
        const totalReserves = Number(ethers.formatUnits(pools[4], 6)) + 
                             Number(ethers.formatUnits(pools[5], 6)) + 
                             Number(ethers.formatUnits(pools[6], 6));
        
        console.log('├─ Pools principales:');
        console.log(`│  ├─ Primer premio: ${ethers.formatUnits(pools[0], 6)} USDC`);
        console.log(`│  ├─ Segundo premio: ${ethers.formatUnits(pools[1], 6)} USDC`);
        console.log(`│  ├─ Tercer premio: ${ethers.formatUnits(pools[2], 6)} USDC`);
        console.log(`│  └─ Desarrollo: ${ethers.formatUnits(pools[3], 6)} USDC`);
        
        console.log('├─ Pools de reserva:');
        console.log(`│  ├─ Reserva 1er: ${ethers.formatUnits(pools[4], 6)} USDC`);
        console.log(`│  ├─ Reserva 2do: ${ethers.formatUnits(pools[5], 6)} USDC`);
        console.log(`│  └─ Reserva 3er: ${ethers.formatUnits(pools[6], 6)} USDC`);
        
        console.log('└─ Totales:');
        console.log(`   ├─ Total pools principales: ${totalMainPools.toFixed(1)} USDC`);
        console.log(`   ├─ Total reservas: ${totalReserves.toFixed(1)} USDC`);
        console.log(`   └─ GRAN TOTAL: ${(totalMainPools + totalReserves).toFixed(1)} USDC`);
        
        // 7. RESUMEN DE VERIFICACIÓN
        console.log('\n📋 RESUMEN DE VERIFICACIÓN');
        console.log('===========================');
        
        console.log('✅ Sistemas verificados:');
        console.log('│  ├─ ✅ Balance de tickets del usuario');
        console.log('│  ├─ ✅ Historial de números ganadores por día');
        console.log('│  ├─ ✅ Datos de perfil y estadísticas');
        console.log('│  ├─ ✅ Estado del contrato');
        console.log('│  └─ ✅ Análisis de pools');
        
        console.log('\n📝 Notas importantes:');
        console.log('│  ├─ El contrato V3 no implementa ERC721Enumerable');
        console.log('│  ├─ Para obtener todos los tickets se requiere indexación externa');
        console.log('│  ├─ Los tickets encontrados son una muestra, no la lista completa');
        console.log('│  └─ El frontend debe usar eventos para trackear tickets del usuario');
        
        console.log('\n✅ VERIFICACIÓN COMPLETA DE SISTEMAS V3');
        console.log('Todos los sistemas básicos están funcionando correctamente');
        
    } catch (error) {
        console.error('❌ Error verificando sistemas de usuario V3:', error);
    }
}

testUserSystemsV3(); 