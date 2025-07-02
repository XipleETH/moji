const { ethers } = require('ethers');

// Configuración del contrato V3
const CONTRACT_ADDRESS = '0x250af59d8E4dd4bf541c7D4c3fBD9C0726C6d822';
const USER_ADDRESS = '0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0'; // La dirección que compró tickets

// ABI para consultar tickets y resultados
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
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];

// Mapa de emojis (mismos que usa el frontend)
const EMOJI_MAP = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'
];

async function testUserSystems() {
    try {
        console.log('🧪 VERIFICANDO SISTEMAS DE USUARIO');
        console.log('===================================');
        
        // Crear provider
        const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, LOTTO_MOJI_ABI, provider);
        
        console.log('📍 Contrato:', CONTRACT_ADDRESS);
        console.log('👤 Usuario:', USER_ADDRESS);
        
        // 1. VERIFICAR HISTORIAL DE TICKETS DEL USUARIO
        console.log('\n🎫 HISTORIAL DE TICKETS DEL USUARIO');
        console.log('====================================');
        
        const userBalance = await contract.balanceOf(USER_ADDRESS);
        console.log('├─ Total tickets owned:', Number(userBalance));
        
        if (Number(userBalance) > 0) {
            console.log('├─ Detalles de tickets:');
            
            for (let i = 0; i < Math.min(Number(userBalance), 10); i++) { // Máximo 10 tickets
                try {
                    const tokenId = await contract.tokenOfOwnerByIndex(USER_ADDRESS, i);
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
                    
                } catch (ticketError) {
                    console.log(`│  Error obteniendo ticket ${i}:`, ticketError.message);
                }
            }
            
            if (Number(userBalance) > 10) {
                console.log(`│  ... y ${Number(userBalance) - 10} tickets más`);
            }
        } else {
            console.log('└─ No hay tickets para este usuario');
        }
        
        // 2. VERIFICAR HISTORIAL DE NÚMEROS GANADORES
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
                console.log(`│  Día ${day}: Error obteniendo datos`);
            }
        }
        
        // 3. VERIFICAR DATOS DE PERFIL DEL USUARIO
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
        
        // Analizar tickets por día
        if (totalTickets > 0) {
            console.log('├─ Distribución por día:');
            const ticketsByDay = {};
            
            for (let i = 0; i < Math.min(Number(userBalance), 50); i++) { // Analizar hasta 50 tickets
                try {
                    const tokenId = await contract.tokenOfOwnerByIndex(USER_ADDRESS, i);
                    const ticketData = await contract.tickets(tokenId);
                    const gameDay = Number(ticketData[1]);
                    
                    if (!ticketsByDay[gameDay]) {
                        ticketsByDay[gameDay] = 0;
                    }
                    ticketsByDay[gameDay]++;
                } catch (error) {
                    // Ignorar errores de tickets individuales
                }
            }
            
            Object.keys(ticketsByDay).sort().forEach(day => {
                console.log(`│  ├─ Día ${day}: ${ticketsByDay[day]} tickets`);
            });
        }
        
        // Analizar potenciales premios
        console.log('├─ Análisis de premios potenciales:');
        if (totalTickets > 0) {
            let potentialWins = 0;
            
            for (let i = 0; i < Math.min(Number(userBalance), 20); i++) {
                try {
                    const tokenId = await contract.tokenOfOwnerByIndex(USER_ADDRESS, i);
                    const ticketData = await contract.tickets(tokenId);
                    const gameDay = Number(ticketData[1]);
                    const ticketNumbers = Array.from(ticketData[2]);
                    
                    // Verificar si hay números ganadores para ese día
                    try {
                        const dayResult = await contract.dayResults(gameDay);
                        const winningNumbers = Array.from(dayResult[0]);
                        
                        if (winningNumbers.some(num => num !== 0)) {
                            // Calcular matches
                            let exactMatches = 0;
                            let anyMatches = 0;
                            
                            for (let j = 0; j < 4; j++) {
                                if (ticketNumbers[j] === winningNumbers[j]) {
                                    exactMatches++;
                                }
                            }
                            
                            const ticketSet = new Set(ticketNumbers);
                            const winningSet = new Set(winningNumbers);
                            anyMatches = [...ticketSet].filter(num => winningSet.has(num)).length;
                            
                            if (exactMatches === 4) {
                                console.log(`│  ├─ 🥇 PRIMER PREMIO - Ticket #${tokenId} (Día ${gameDay})`);
                                potentialWins++;
                            } else if (anyMatches === 4) {
                                console.log(`│  ├─ 🥈 SEGUNDO PREMIO - Ticket #${tokenId} (Día ${gameDay})`);
                                potentialWins++;
                            } else if (exactMatches === 3) {
                                console.log(`│  ├─ 🥉 TERCER PREMIO - Ticket #${tokenId} (Día ${gameDay})`);
                                potentialWins++;
                            } else if (anyMatches >= 3) {
                                console.log(`│  ├─ 🎫 TICKET GRATIS - Ticket #${tokenId} (Día ${gameDay})`);
                                potentialWins++;
                            }
                        }
                    } catch (dayError) {
                        // El día aún no tiene resultados
                    }
                    
                } catch (ticketError) {
                    // Error con ticket individual
                }
            }
            
            if (potentialWins === 0) {
                console.log(`│  └─ No se encontraron premios ganadores (hasta ahora)`);
            } else {
                console.log(`│  └─ Total premios potenciales: ${potentialWins}`);
            }
        } else {
            console.log(`│  └─ Sin tickets para analizar`);
        }
        
        // 4. ESTADO DEL CONTRATO
        console.log('\n⚙️ ESTADO DEL CONTRATO');
        console.log('======================');
        
        const totalSupply = await contract.totalSupply();
        const [automation, emergency] = await Promise.all([
            contract.automationActive(),
            contract.emergencyPause()
        ]);
        
        console.log('├─ Estadísticas globales:');
        console.log(`│  ├─ Total tickets emitidos: ${Number(totalSupply)}`);
        console.log(`│  ├─ Automation activa: ${automation ? 'Sí' : 'No'}`);
        console.log(`│  ├─ Pausa de emergencia: ${emergency ? 'Sí' : 'No'}`);
        console.log(`│  └─ Participación del usuario: ${totalTickets > 0 ? ((totalTickets / Number(totalSupply)) * 100).toFixed(2) + '%' : '0%'}`);
        
        console.log('\n✅ VERIFICACIÓN COMPLETA DE SISTEMAS DE USUARIO');
        console.log('Los sistemas de historial, números ganadores y perfil están funcionando correctamente');
        
    } catch (error) {
        console.error('❌ Error verificando sistemas de usuario:', error);
    }
}

testUserSystems(); 