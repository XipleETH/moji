import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './src/utils/contractAddresses.js';
import contractABI from './src/utils/contract-abi-v4.json' assert { type: "json" };

const testV4Connection = async () => {
  console.log('🧪 PROBANDO CONECTIVIDAD CON LOTTOMOJI V4');
  console.log('=========================================');
  
  const provider = new ethers.JsonRpcProvider(CONTRACT_ADDRESSES.RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, contractABI.abi, provider);
  
  console.log(`📍 Contrato: ${CONTRACT_ADDRESSES.LOTTO_MOJI_CORE}\n`);

  // Información general
  const [currentDay, nextDraw, drawHour, ticketPrice, automationActive, emergencyPause] = await Promise.all([
    contract.currentGameDay(),
    contract.nextDrawTs(),
    contract.dailyDrawHourUTC(),
    contract.ticketPrice(),
    contract.automationActive(),
    contract.emergencyPause()
  ]);

  console.log('📈 INFORMACIÓN GENERAL:');
  console.log(`├─ Día actual del juego: ${currentDay}`);
  console.log(`├─ Próximo sorteo: ${new Date(Number(nextDraw) * 1000).toISOString()}`);
  console.log(`├─ Hora de sorteo: ${drawHour}:00 UTC`);
  console.log(`├─ Precio del ticket: ${ethers.formatUnits(ticketPrice, 6)} USDC`);
  console.log(`├─ Automation activa: ${automationActive ? '✅' : '❌'}`);
  console.log(`└─ Pausa de emergencia: ${emergencyPause ? '✅' : '❌'}\n`);

  // Pools
  const pools = await contract.pools();
  const formattedPools = {
    firstPrize: ethers.formatUnits(pools.firstPrize, 6),
    secondPrize: ethers.formatUnits(pools.secondPrize, 6),
    thirdPrize: ethers.formatUnits(pools.thirdPrize, 6),
    devPool: ethers.formatUnits(pools.devPool, 6),
    firstReserve: ethers.formatUnits(pools.firstReserve, 6),
    secondReserve: ethers.formatUnits(pools.secondReserve, 6),
    thirdReserve: ethers.formatUnits(pools.thirdReserve, 6)
  };

  console.log('💰 POOLS DE PREMIOS:');
  console.log(`├─ Primer premio: ${formattedPools.firstPrize} USDC`);
  console.log(`├─ Segundo premio: ${formattedPools.secondPrize} USDC`);
  console.log(`├─ Tercer premio: ${formattedPools.thirdPrize} USDC`);
  console.log(`└─ Desarrollo: ${formattedPools.devPool} USDC\n`);

  console.log('🏦 POOLS DE RESERVA:');
  console.log(`├─ Reserva 1er: ${formattedPools.firstReserve} USDC`);
  console.log(`├─ Reserva 2do: ${formattedPools.secondReserve} USDC`);
  console.log(`└─ Reserva 3er: ${formattedPools.thirdReserve} USDC\n`);

  // Totales
  const totalMainPools = Number(formattedPools.firstPrize) + 
                        Number(formattedPools.secondPrize) + 
                        Number(formattedPools.thirdPrize) + 
                        Number(formattedPools.devPool);
  
  const totalReserves = Number(formattedPools.firstReserve) + 
                       Number(formattedPools.secondReserve) + 
                       Number(formattedPools.thirdReserve);

  console.log('📊 TOTALES:');
  console.log(`├─ Total pools principales: ${totalMainPools.toFixed(1)} USDC`);
  console.log(`├─ Total reservas: ${totalReserves.toFixed(1)} USDC`);
  console.log(`└─ GRAN TOTAL: ${(totalMainPools + totalReserves).toFixed(1)} USDC\n`);

  // Resultado del día actual
  const dayResult = await contract.dayResults(currentDay);
  console.log('🎯 RESULTADO DEL DÍA ACTUAL:');
  if (dayResult.winningNumbers.some(n => n > 0)) {
    console.log(`├─ Números ganadores: ${dayResult.winningNumbers.join(', ')}`);
    console.log(`├─ Ganadores primer premio: ${dayResult.winnersFirst}`);
    console.log(`├─ Ganadores segundo premio: ${dayResult.winnersSecond}`);
    console.log(`├─ Ganadores tercer premio: ${dayResult.winnersThird}`);
    console.log(`└─ Procesamiento completo: ${dayResult.fullyProcessed ? 'Sí' : 'No'}\n`);
  } else {
    console.log('└─ Sin datos disponibles\n');
  }

  // Tiempo restante
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Number(nextDraw) - now;
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  console.log('⏰ TIEMPO RESTANTE:');
  console.log(`└─ ${hours}h ${minutes}m ${seconds}s hasta el próximo sorteo\n`);

  // Prueba de funciones ERC721Enumerable
  console.log('🎫 PRUEBA DE FUNCIONES ERC721ENUMERABLE:');
  const totalSupply = await contract.totalSupply();
  console.log(`├─ Total de tickets emitidos: ${totalSupply}`);
  
  if (totalSupply > 0) {
    const lastTokenId = await contract.tokenByIndex(totalSupply - 1);
    console.log(`└─ Último token ID: ${lastTokenId}\n`);
  } else {
    console.log('└─ No hay tickets emitidos aún\n');
  }

  console.log('✅ CONECTIVIDAD EXITOSA - CONTRATO V4 FUNCIONANDO');
}

testV4Connection().catch(console.error); 