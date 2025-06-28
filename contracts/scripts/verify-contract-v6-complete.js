const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICACIÓN COMPLETA CONTRATO V6 + NUEVO DÍA");
    console.log("=".repeat(70));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    const VRF_SUBSCRIPTION_ID = "70846359092368923949796315994230469102226608583606291730577230133525692264419";
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    
    // Conectar al contrato
    const [signer] = await ethers.getSigners();
    console.log("👤 Verificando con cuenta:", signer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    console.log("\n📋 INFORMACIÓN BÁSICA DEL CONTRATO:");
    console.log("-".repeat(50));
    
    try {
        // Información básica
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        const ticketPrice = await contract.TICKET_PRICE();
        const drawInterval = await contract.DRAW_INTERVAL();
        const drawTimeUTC = await contract.drawTimeUTC();
        
        console.log("✅ Game Active:", gameActive);
        console.log("✅ Automation Active:", automationActive);
        console.log("✅ Emergency Pause:", emergencyPause);
        console.log("💰 Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("⏰ Draw Interval:", (Number(drawInterval) / 3600).toFixed(1), "hours");
        console.log("🕒 Draw Time UTC:", drawTimeUTC.toString(), "(20:00 UTC = 3:00 PM Colombia)");
        
        // Verificar estado del sorteo
        console.log("\n🎲 ESTADO DEL SORTEO:");
        console.log("-".repeat(50));
        
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        const totalDrawsExecuted = await contract.totalDrawsExecuted();
        const currentTime = Math.floor(Date.now() / 1000);
        const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
        
        console.log("📅 Current Game Day:", currentGameDay.toString());
        console.log("⏰ Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("⏰ Next Draw Time:", new Date(nextDrawTime * 1000).toISOString());
        console.log("🎯 Total Draws Executed:", totalDrawsExecuted.toString());
        console.log("⏳ Time until next draw:", Math.max(0, nextDrawTime - currentTime), "seconds");
        
        // Verificar si necesita sorteo
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔧 Upkeep Needed:", upkeepNeeded);
        
        if (upkeepNeeded) {
            console.log("🚨 ¡SORTEO PENDIENTE! El contrato necesita ejecutar performUpkeep");
        } else {
            console.log("✅ No hay sorteos pendientes");
        }
        
        // Información de tickets
        console.log("\n🎫 INFORMACIÓN DE TICKETS:");
        console.log("-".repeat(50));
        
        const ticketCounter = await contract.ticketCounter();
        console.log("🎫 Total Tickets Sold:", ticketCounter.toString());
        
        // Verificar pools
        console.log("\n💰 ESTADO DE POOLS:");
        console.log("-".repeat(50));
        
        const mainPools = await contract.mainPools();
        console.log("🏆 First Prize Pool:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
        console.log("🥈 Second Prize Pool:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
        console.log("🥉 Third Prize Pool:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
        console.log("🛠️ Development Pool:", ethers.formatUnits(mainPools.developmentAccumulated, 6), "USDC");
        
        const reserves = await contract.reserves();
        console.log("💎 First Prize Reserve:", ethers.formatUnits(reserves.firstPrizeReserve1, 6), "USDC");
        console.log("💎 Second Prize Reserve:", ethers.formatUnits(reserves.secondPrizeReserve2, 6), "USDC");
        console.log("💎 Third Prize Reserve:", ethers.formatUnits(reserves.thirdPrizeReserve3, 6), "USDC");
        
        // Pool diario actual
        const dailyPool = await contract.dailyPools(currentGameDay);
        console.log("\n📊 POOL DIARIO ACTUAL (Day", currentGameDay.toString() + "):");
        console.log("-".repeat(50));
        console.log("💰 Total Collected:", ethers.formatUnits(dailyPool.totalCollected, 6), "USDC");
        console.log("🔄 Main Pool Portion:", ethers.formatUnits(dailyPool.mainPoolPortion, 6), "USDC");
        console.log("💎 Reserve Portion:", ethers.formatUnits(dailyPool.reservePortion, 6), "USDC");
        console.log("✅ Distributed:", dailyPool.distributed);
        console.log("🎲 Drawn:", dailyPool.drawn);
        console.log("💎 Reserves Sent:", dailyPool.reservesSent);
        
        // Verificar VRF
        console.log("\n🎲 VERIFICACIÓN VRF:");
        console.log("-".repeat(50));
        
        const vrfCoordinator = await contract.VRF_COORDINATOR();
        const keyHash = await contract.KEY_HASH();
        const subscriptionId = await contract.s_subscriptionId();
        
        console.log("📡 VRF Coordinator:", vrfCoordinator);
        console.log("🔑 Key Hash:", keyHash);
        console.log("🆔 Subscription ID:", subscriptionId.toString());
        console.log("✅ Expected Sub ID:", VRF_SUBSCRIPTION_ID);
        console.log("🔗 VRF Match:", subscriptionId.toString() === VRF_SUBSCRIPTION_ID ? "✅ CORRECTO" : "❌ NO COINCIDE");
        
        // Verificar números ganadores del último sorteo
        if (totalDrawsExecuted > 0) {
            console.log("\n🏆 ÚLTIMOS NÚMEROS GANADORES:");
            console.log("-".repeat(50));
            
            const lastDrawDay = Number(currentGameDay) - 1;
            if (lastDrawDay >= 0) {
                try {
                    const lastDailyPool = await contract.dailyPools(lastDrawDay);
                    if (lastDailyPool.drawn) {
                        console.log("📅 Day", lastDrawDay + ":");
                        console.log("🎲 Total Collected:", ethers.formatUnits(lastDailyPool.totalCollected, 6), "USDC");
                        console.log("✅ Successfully drawn and distributed");
                    }
                } catch (error) {
                    console.log("⚠️ No se pudo obtener info del sorteo anterior");
                }
            }
        }
        
        // Verificar USDC balance del contrato
        console.log("\n💳 BALANCE USDC DEL CONTRATO:");
        console.log("-".repeat(50));
        
        const usdcABI = ["function balanceOf(address) view returns (uint256)"];
        const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcABI, signer);
        const contractUsdcBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
        
        console.log("💰 Contract USDC Balance:", ethers.formatUnits(contractUsdcBalance, 6), "USDC");
        
        // Calcular total teórico
        const totalMainUSDC = 
            Number(ethers.formatUnits(mainPools.firstPrizeAccumulated, 6)) +
            Number(ethers.formatUnits(mainPools.secondPrizeAccumulated, 6)) +
            Number(ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6)) +
            Number(ethers.formatUnits(mainPools.developmentAccumulated, 6));
            
        const totalReserveUSDC = 
            Number(ethers.formatUnits(reserves.firstPrizeReserve1, 6)) +
            Number(ethers.formatUnits(reserves.secondPrizeReserve2, 6)) +
            Number(ethers.formatUnits(reserves.thirdPrizeReserve3, 6));
            
        const totalDailyUSDC = Number(ethers.formatUnits(dailyPool.totalCollected, 6));
        
        console.log("📊 Main Pools Total:", totalMainUSDC.toFixed(6), "USDC");
        console.log("📊 Reserves Total:", totalReserveUSDC.toFixed(6), "USDC");
        console.log("📊 Daily Pool Total:", totalDailyUSDC.toFixed(6), "USDC");
        console.log("📊 Theoretical Total:", (totalMainUSDC + totalReserveUSDC + totalDailyUSDC).toFixed(6), "USDC");
        console.log("📊 Actual Balance:", Number(ethers.formatUnits(contractUsdcBalance, 6)).toFixed(6), "USDC");
        
        // Estado de salud general
        console.log("\n🏥 ESTADO DE SALUD DEL SISTEMA:");
        console.log("-".repeat(50));
        
        const healthChecks = [];
        
        if (gameActive) healthChecks.push("✅ Juego activo");
        else healthChecks.push("❌ Juego inactivo");
        
        if (automationActive) healthChecks.push("✅ Automatización activa");
        else healthChecks.push("❌ Automatización inactiva");
        
        if (!emergencyPause) healthChecks.push("✅ Sin pausa de emergencia");
        else healthChecks.push("❌ Pausa de emergencia activada");
        
        if (subscriptionId.toString() === VRF_SUBSCRIPTION_ID) healthChecks.push("✅ VRF configurado correctamente");
        else healthChecks.push("❌ VRF mal configurado");
        
        if (Number(ethers.formatUnits(contractUsdcBalance, 6)) > 0) healthChecks.push("✅ Contrato tiene fondos USDC");
        else healthChecks.push("⚠️ Contrato sin fondos USDC");
        
        if (Number(ticketCounter) > 0) healthChecks.push("✅ Hay tickets vendidos");
        else healthChecks.push("⚠️ No hay tickets vendidos aún");
        
        healthChecks.forEach(check => console.log(check));
        
        // Recomendaciones
        console.log("\n💡 RECOMENDACIONES:");
        console.log("-".repeat(50));
        
        if (upkeepNeeded) {
            console.log("🚨 URGENTE: Ejecutar sorteo pendiente");
            console.log("   Comando: npx hardhat run scripts/force-draw-v6.js --network base-sepolia");
        }
        
        if (!gameActive || !automationActive) {
            console.log("⚠️ Verificar configuración del juego");
        }
        
        if (Number(ethers.formatUnits(contractUsdcBalance, 6)) < 1) {
            console.log("💰 Considerar agregar fondos USDC al contrato");
        }
        
        console.log("\n🎯 PRÓXIMOS PASOS RECOMENDADOS:");
        console.log("1. Verificar suscripción VRF en Chainlink");
        console.log("2. Monitorear sorteos automáticos");
        console.log("3. Verificar que el frontend se conecte correctamente");
        console.log("4. Probar compra de tickets");
        
        console.log("\n" + "=".repeat(70));
        console.log("✅ VERIFICACIÓN COMPLETA FINALIZADA");
        
    } catch (error) {
        console.error("❌ Error verificando contrato:", error);
        console.log("\n🔧 POSIBLES SOLUCIONES:");
        console.log("1. Verificar que el contrato esté desplegado");
        console.log("2. Verificar conexión a Base Sepolia");
        console.log("3. Verificar que la dirección del contrato sea correcta");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 