const { ethers } = require('ethers');

// Configuración del contrato V3
const CONTRACT_ADDRESS = '0x250af59d8E4dd4bf541c7D4c3fBD9C0726C6d822';

// ABI mínimo para probar
const LOTTO_MOJI_ABI = [
  "function pools() view returns (uint256 firstPrize, uint256 secondPrize, uint256 thirdPrize, uint256 devPool, uint256 firstReserve, uint256 secondReserve, uint256 thirdReserve)",
  "function currentGameDay() view returns (uint24)",
  "function nextDrawTs() view returns (uint256)",
  "function dailyDrawHourUTC() view returns (uint8)",
  "function ticketPrice() view returns (uint256)",
  "function automationActive() view returns (bool)",
  "function emergencyPause() view returns (bool)",
  "function dayResults(uint24) view returns (uint8[4] winningNumbers, uint32 processingIndex, uint32 winnersFirst, uint32 winnersSecond, uint32 winnersThird, bool fullyProcessed)"
];

async function testFrontendConnection() {
    try {
        console.log('🧪 PROBANDO CONEXIÓN FRONTEND CON CONTRATO V3');
        console.log('================================================');
        
        // Crear provider
        const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, LOTTO_MOJI_ABI, provider);
        
        console.log('📍 Contrato:', CONTRACT_ADDRESS);
        
        // Obtener datos como lo haría el frontend
        const [
            pools,
            currentGameDay,
            nextDrawTs,
            dailyDrawHourUTC,
            ticketPrice,
            automationActive,
            emergencyPause
        ] = await Promise.all([
            contract.pools(),
            contract.currentGameDay(),
            contract.nextDrawTs(),
            contract.dailyDrawHourUTC(),
            contract.ticketPrice(),
            contract.automationActive(),
            contract.emergencyPause()
        ]);
        
        console.log('\n💰 POOLS UNIFICADOS:');
        console.log('├─ Primer premio:', ethers.formatUnits(pools[0], 6), 'USDC');
        console.log('├─ Segundo premio:', ethers.formatUnits(pools[1], 6), 'USDC');
        console.log('├─ Tercer premio:', ethers.formatUnits(pools[2], 6), 'USDC');
        console.log('├─ Desarrollo:', ethers.formatUnits(pools[3], 6), 'USDC');
        console.log('├─ Reserva 1er:', ethers.formatUnits(pools[4], 6), 'USDC');
        console.log('├─ Reserva 2do:', ethers.formatUnits(pools[5], 6), 'USDC');
        console.log('└─ Reserva 3er:', ethers.formatUnits(pools[6], 6), 'USDC');
        
        const totalMain = Number(ethers.formatUnits(pools[0], 6)) + 
                         Number(ethers.formatUnits(pools[1], 6)) + 
                         Number(ethers.formatUnits(pools[2], 6)) + 
                         Number(ethers.formatUnits(pools[3], 6));
        
        const totalReserves = Number(ethers.formatUnits(pools[4], 6)) + 
                             Number(ethers.formatUnits(pools[5], 6)) + 
                             Number(ethers.formatUnits(pools[6], 6));
        
        console.log('\n📊 TOTALES:');
        console.log('├─ Total pools principales:', totalMain.toFixed(1), 'USDC');
        console.log('├─ Total reservas:', totalReserves.toFixed(1), 'USDC');
        console.log('└─ GRAN TOTAL:', (totalMain + totalReserves).toFixed(1), 'USDC');
        
        console.log('\n⚙️ CONFIGURACIÓN:');
        console.log('├─ Día actual:', Number(currentGameDay));
        console.log('├─ Próximo sorteo:', new Date(Number(nextDrawTs) * 1000).toISOString());
        console.log('├─ Hora sorteo:', Number(dailyDrawHourUTC), 'UTC');
        console.log('├─ Precio ticket:', ethers.formatUnits(ticketPrice, 6), 'USDC');
        console.log('├─ Automation:', automationActive ? '✅' : '❌');
        console.log('└─ Pausa emergencia:', emergencyPause ? '🔴' : '✅');
        
        // Probar dayResults
        try {
            const dayResult = await contract.dayResults(currentGameDay);
            console.log('\n🎯 RESULTADO DEL DÍA ACTUAL:');
            console.log('├─ Números ganadores:', Array.from(dayResult[0]).join(', '));
            console.log('├─ Procesado completamente:', dayResult[5]);
            console.log('├─ Ganadores 1er:', Number(dayResult[2]));
            console.log('├─ Ganadores 2do:', Number(dayResult[3]));
            console.log('└─ Ganadores 3er:', Number(dayResult[4]));
        } catch (dayError) {
            console.log('\n🎯 RESULTADO DEL DÍA ACTUAL: Sin datos disponibles');
        }
        
        const now = Math.floor(Date.now() / 1000);
        const timeToNext = Number(nextDrawTs) - now;
        const hours = Math.floor(timeToNext / 3600);
        const minutes = Math.floor((timeToNext % 3600) / 60);
        const seconds = timeToNext % 60;
        
        console.log('\n⏰ TIEMPO RESTANTE:');
        console.log(`└─ ${hours}h ${minutes}m ${seconds}s hasta el próximo sorteo`);
        
        console.log('\n✅ CONEXIÓN FRONTEND EXITOSA');
        console.log('El frontend debería poder mostrar estos datos correctamente');
        
    } catch (error) {
        console.error('❌ Error en conexión frontend:', error);
    }
}

testFrontendConnection(); 