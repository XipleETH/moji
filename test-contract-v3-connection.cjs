const { ethers } = require('ethers');

// Configuración del contrato V3
const CONTRACT_ADDRESS = "0x250af59d8E4dd4bf541c7D4c3fBD9C0726C6d822";
const RPC_URL = 'https://api.avax-test.network/ext/bc/C/rpc';

// ABI mínimo del contrato V3
const CONTRACT_ABI = [
  "function pools() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
  "function currentGameDay() view returns (uint24)",
  "function nextDrawTs() view returns (uint256)",
  "function dailyDrawHourUTC() view returns (uint8)",
  "function ticketPrice() view returns (uint256)",
  "function automationActive() view returns (bool)",
  "function emergencyPause() view returns (bool)",
  "function dayResults(uint24) view returns (uint8[4], uint32, uint32, uint32, uint32, bool)"
];

async function testContractV3() {
  console.log('🧪 PROBANDO CONECTIVIDAD CON LOTTOMOJI V3');
  console.log('=========================================');
  console.log(`📍 Contrato: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 RPC: ${RPC_URL}`);
  console.log('');

  try {
    // Conectar al provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    console.log('📊 OBTENIENDO DATOS DEL CONTRATO...');
    console.log('');

    // Obtener datos básicos
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

    // Mostrar información general
    console.log('📈 INFORMACIÓN GENERAL:');
    console.log(`├─ Día actual del juego: ${currentGameDay}`);
    console.log(`├─ Próximo sorteo: ${new Date(Number(nextDrawTs) * 1000).toISOString()}`);
    console.log(`├─ Hora de sorteo: ${dailyDrawHourUTC}:00 UTC`);
    console.log(`├─ Precio del ticket: ${ethers.formatUnits(ticketPrice, 6)} USDC`);
    console.log(`├─ Automation activa: ${automationActive ? '✅' : '❌'}`);
    console.log(`└─ Pausa de emergencia: ${emergencyPause ? '🚨' : '✅'}`);
    console.log('');

    // Mostrar pools
    console.log('💰 POOLS DE PREMIOS:');
    console.log(`├─ Primer premio: ${ethers.formatUnits(pools[0], 6)} USDC`);
    console.log(`├─ Segundo premio: ${ethers.formatUnits(pools[1], 6)} USDC`);
    console.log(`├─ Tercer premio: ${ethers.formatUnits(pools[2], 6)} USDC`);
    console.log(`└─ Desarrollo: ${ethers.formatUnits(pools[3], 6)} USDC`);
    console.log('');

    console.log('🏦 POOLS DE RESERVA:');
    console.log(`├─ Reserva primer premio: ${ethers.formatUnits(pools[4], 6)} USDC`);
    console.log(`├─ Reserva segundo premio: ${ethers.formatUnits(pools[5], 6)} USDC`);
    console.log(`└─ Reserva tercer premio: ${ethers.formatUnits(pools[6], 6)} USDC`);
    console.log('');

    // Calcular totales
    const totalMain = pools[0] + pools[1] + pools[2] + pools[3];
    const totalReserves = pools[4] + pools[5] + pools[6];
    const grandTotal = totalMain + totalReserves;

    console.log('📊 TOTALES:');
    console.log(`├─ Total pools principales: ${ethers.formatUnits(totalMain, 6)} USDC`);
    console.log(`├─ Total reservas: ${ethers.formatUnits(totalReserves, 6)} USDC`);
    console.log(`└─ GRAN TOTAL: ${ethers.formatUnits(grandTotal, 6)} USDC`);
    console.log('');

    // Probar resultados del día actual
    try {
      const dayResult = await contract.dayResults(currentGameDay);
      console.log('🎯 RESULTADO DEL DÍA ACTUAL:');
      console.log(`├─ Números ganadores: [${dayResult[0].join(', ')}]`);
      console.log(`├─ Ganadores primer premio: ${dayResult[2]}`);
      console.log(`├─ Ganadores segundo premio: ${dayResult[3]}`);
      console.log(`├─ Ganadores tercer premio: ${dayResult[4]}`);
      console.log(`└─ Procesamiento completo: ${dayResult[5] ? '✅' : '❌'}`);
    } catch (error) {
      console.log('🎯 RESULTADO DEL DÍA ACTUAL: Sin datos disponibles');
    }
    console.log('');

    // Verificar tiempo restante
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = Number(nextDrawTs) - now;
    
    if (timeRemaining > 0) {
      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      const seconds = timeRemaining % 60;
      
      console.log('⏰ TIEMPO RESTANTE:');
      console.log(`└─ ${hours}h ${minutes}m ${seconds}s hasta el próximo sorteo`);
    } else {
      console.log('⏰ TIEMPO RESTANTE: ¡El sorteo debería ejecutarse pronto!');
    }
    console.log('');

    console.log('✅ CONECTIVIDAD EXITOSA - CONTRATO V3 FUNCIONANDO');
    
  } catch (error) {
    console.error('❌ ERROR DE CONECTIVIDAD:');
    console.error(error.message);
    console.log('');
    console.log('💡 POSIBLES SOLUCIONES:');
    console.log('├─ Verificar que el contrato esté desplegado correctamente');
    console.log('├─ Comprobar la conexión a internet');
    console.log('└─ Verificar que la dirección del contrato sea correcta');
  }
}

testContractV3(); 