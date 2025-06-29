const { ethers } = require("hardhat");

async function main() {
    // Obtener argumentos de línea de comandos
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log("❌ Uso incorrecto");
        console.log("📖 Uso: node scripts/check-config-v2.js <CONTRACT_ADDRESS>");
        console.log("");
        console.log("💡 Ejemplo:");
        console.log("  node scripts/check-config-v2.js 0x1234567890123456789012345678901234567890");
        process.exit(1);
    }
    
    const contractAddress = args[0];
    
    console.log("🔍 VERIFICANDO CONFIGURACIÓN DEL CONTRATO V2");
    console.log("=".repeat(55));
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    
    // Conectar al contrato
    const contractFactory = await ethers.getContractFactory("LottoMojiCore");
    const contract = contractFactory.attach(contractAddress);
    
    console.log("📍 Contrato:", contractAddress);
    
    try {
        console.log("\n📊 CONFIGURACIÓN BÁSICA:");
        console.log("-".repeat(30));
        
        // Configuración básica
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        
        console.log("🎯 Game Active:", gameActive ? "✅ SÍ" : "❌ NO");
        console.log("🤖 Automation Active:", automationActive ? "✅ SÍ" : "❌ NO");
        console.log("⏸️ Emergency Pause:", emergencyPause ? "⚠️ PAUSADO" : "✅ NORMAL");
        
        console.log("\n💰 CONFIGURACIÓN DE PRECIOS:");
        console.log("-".repeat(35));
        
        // Precios y configuración
        const ticketPrice = await contract.ticketPrice();
        const ticketPriceUSDC = ethers.formatUnits(ticketPrice, 6);
        
        console.log("🎫 Precio del ticket:", ticketPriceUSDC, "USDC");
        console.log("📈 Porcentaje para reservas:", "20%");
        console.log("📊 Porcentaje para pools principales:", "80%");
        
        console.log("\n⏰ CONFIGURACIÓN DE TIEMPO:");
        console.log("-".repeat(35));
        
        // Tiempos
        const drawTimeUTC = await contract.drawTimeUTC();
        const dayChangeTimeUTC = await contract.dayChangeTimeUTC();
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        
        const drawHour = Number(drawTimeUTC) / 3600;
        const dayChangeHour = Number(dayChangeTimeUTC) / 3600;
        
        console.log("🎲 Hora de sorteo:", drawHour + ":00 UTC");
        console.log("📅 Hora de cambio de día:", dayChangeHour + ":00 UTC");
        console.log("📍 Día de juego actual:", currentGameDay.toString());
        
        const lastDrawDate = new Date(Number(lastDrawTime) * 1000);
        console.log("🕐 Último sorteo:", lastDrawDate.toUTCString());
        
        // Calcular próximo sorteo
        const nextDrawTime = Number(lastDrawTime) + (24 * 3600);
        const nextDrawDate = new Date(nextDrawTime * 1000);
        console.log("⏭️ Próximo sorteo:", nextDrawDate.toUTCString());
        
        console.log("\n🎰 CONFIGURACIÓN VRF:");
        console.log("-".repeat(25));
        
        // VRF Configuration (hardcoded values)
        const subscriptionId = await contract.subscriptionId();
        
        console.log("🔗 VRF Coordinator: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE");
        console.log("🔑 Key Hash: Avalanche Fuji (hardcoded)");
        console.log("⛽ Callback Gas Limit: 15,000,000 (Avalanche optimized)");
        console.log("✅ Request Confirmations: 1");
        console.log("🎲 Num Words: 4");
        console.log("📋 Subscription ID:", subscriptionId.toString().substring(0, 20) + "...");
        
        console.log("\n🏆 POOLS PRINCIPALES:");
        console.log("-".repeat(25));
        
        // Main pools
        const mainPools = await contract.getMainPoolBalances();
        
        const firstPrize = ethers.formatUnits(mainPools.firstPrizeAccumulated, 6);
        const secondPrize = ethers.formatUnits(mainPools.secondPrizeAccumulated, 6);
        const thirdPrize = ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6);
        const development = ethers.formatUnits(mainPools.developmentAccumulated, 6);
        
        console.log("🥇 Primer premio acumulado:", firstPrize, "USDC");
        console.log("🥈 Segundo premio acumulado:", secondPrize, "USDC");
        console.log("🥉 Tercer premio acumulado:", thirdPrize, "USDC");
        console.log("💻 Desarrollo acumulado:", development, "USDC");
        
        const totalMainPools = Number(firstPrize) + Number(secondPrize) + Number(thirdPrize) + Number(development);
        console.log("💰 Total pools principales:", totalMainPools.toFixed(6), "USDC");
        
        console.log("\n🏪 POOLS DE RESERVA:");
        console.log("-".repeat(25));
        
        // Reserve pools
        const reserves = await contract.getReserveBalances();
        
        const firstReserve = ethers.formatUnits(reserves.firstPrizeReserve, 6);
        const secondReserve = ethers.formatUnits(reserves.secondPrizeReserve, 6);
        const thirdReserve = ethers.formatUnits(reserves.thirdPrizeReserve, 6);
        
        console.log("🥇 Reserva primer premio:", firstReserve, "USDC");
        console.log("🥈 Reserva segundo premio:", secondReserve, "USDC");
        console.log("🥉 Reserva tercer premio:", thirdReserve, "USDC");
        
        const totalReserves = Number(firstReserve) + Number(secondReserve) + Number(thirdReserve);
        console.log("🏦 Total reservas:", totalReserves.toFixed(6), "USDC");
        
        console.log("\n📊 ESTADÍSTICAS GENERALES:");
        console.log("-".repeat(30));
        
        // General stats
        const ticketCounter = await contract.ticketCounter();
        const totalDrawsExecuted = await contract.totalDrawsExecuted();
        const totalReservesProcessed = await contract.totalReservesProcessed();
        
        console.log("🎫 Total tickets vendidos:", ticketCounter.toString());
        console.log("🎲 Total sorteos ejecutados:", totalDrawsExecuted.toString());
        console.log("🏪 Total reservas procesadas:", totalReservesProcessed.toString());
        
        // Pool del día actual
        const dailyPool = await contract.getDailyPoolInfo(currentGameDay);
        const dailyCollected = ethers.formatUnits(dailyPool.totalCollected, 6);
        const dailyMainPortion = ethers.formatUnits(dailyPool.mainPoolPortion, 6);
        const dailyReservePortion = ethers.formatUnits(dailyPool.reservePortion, 6);
        
        console.log("\n📅 POOL DEL DÍA ACTUAL (Día " + currentGameDay.toString() + "):");
        console.log("-".repeat(40));
        console.log("💰 Total recaudado hoy:", dailyCollected, "USDC");
        console.log("🎯 Porción para pools principales:", dailyMainPortion, "USDC (80%)");
        console.log("🏪 Porción para reservas:", dailyReservePortion, "USDC (20%)");
        console.log("📊 Pool distribuido:", dailyPool.distributed ? "✅ SÍ" : "❌ NO");
        console.log("🎲 Sorteo ejecutado:", dailyPool.drawn ? "✅ SÍ" : "❌ NO");
        
        if (dailyPool.drawn) {
            console.log("🎯 Números ganadores:", dailyPool.winningNumbers.join(", "));
        }
        
        // Contract balance
        const usdcToken = await contract.usdcToken();
        const IERC20 = await ethers.getContractFactory("LottoMojiCore");
        
        // Usar interface ERC20 simple
        const usdcContract = new ethers.Contract(usdcToken, [
            "function balanceOf(address) view returns (uint256)"
        ], signer);
        
        const contractBalance = await usdcContract.balanceOf(contractAddress);
        const balanceUSDC = ethers.formatUnits(contractBalance, 6);
        
        console.log("\n💳 BALANCE DEL CONTRATO:");
        console.log("-".repeat(30));
        console.log("💰 Balance USDC:", balanceUSDC, "USDC");
        console.log("📍 Token USDC:", usdcToken);
        
        // Cálculo de totales
        const totalAllocated = totalMainPools + totalReserves;
        const difference = Number(balanceUSDC) - totalAllocated;
        
        console.log("🧮 Total asignado:", totalAllocated.toFixed(6), "USDC");
        console.log("📊 Diferencia:", difference.toFixed(6), "USDC");
        
        if (Math.abs(difference) < 0.001) {
            console.log("✅ Balance correcto");
        } else if (difference > 0) {
            console.log("⚠️ Hay USDC no asignado");
        } else {
            console.log("❌ Balance inconsistente");
        }
        
        console.log("\n🎯 FUNCIONES CONFIGURABLES V2:");
        console.log("-".repeat(40));
        console.log("• setTicketPrice(uint256 _newPrice) - Cambiar precio");
        console.log("• setDrawTimeUTC(uint256 _hours) - Cambiar hora sorteo");
        console.log("• setDayChangeTimeUTC(uint256 _hours) - Cambiar hora día");
        console.log("• setLastDrawTime(uint256 _timestamp) - Ajustar timing");
        console.log("• toggleAutomation() - Activar/desactivar automation");
        console.log("• toggleEmergencyPause() - Pausa de emergencia");
        
        console.log("\n📋 RESUMEN DE ESTADO:");
        console.log("-".repeat(25));
        
        if (gameActive && automationActive && !emergencyPause) {
            console.log("✅ Contrato operativo y funcional");
        } else {
            console.log("⚠️ Contrato con restricciones:");
            if (!gameActive) console.log("  - Juego inactivo");
            if (!automationActive) console.log("  - Automation desactivada");
            if (emergencyPause) console.log("  - En pausa de emergencia");
        }
        
        if (Number(ticketCounter) > 0) {
            console.log("✅ Hay tickets vendidos");
        } else {
            console.log("⚠️ No hay tickets vendidos");
        }
        
        if (Number(totalDrawsExecuted) > 0) {
            console.log("✅ Se han ejecutado sorteos");
        } else {
            console.log("⚠️ No se han ejecutado sorteos");
        }
        
        console.log("\n" + "=".repeat(55));
        console.log("🎉 VERIFICACIÓN COMPLETADA - CONTRATO V2");
        console.log("📍 Address:", contractAddress);
        console.log("⚙️ Versión: V2 - Configuración flexible");
        console.log("🏔️ Red: Avalanche Fuji");
        console.log("=".repeat(55));
        
    } catch (error) {
        console.error("❌ Error al verificar configuración:", error.message);
        
        if (error.message.includes("call revert exception")) {
            console.log("\n💡 POSIBLES CAUSAS:");
            console.log("- Dirección de contrato incorrecta");
            console.log("- Contrato no deployado en esta red");
            console.log("- ABI no compatible con el contrato");
        }
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 