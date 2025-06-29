const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 DIAGNÓSTICO COMPLETO - AVALANCHE FUJI UPKEEP");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0x1B0B1A24983E51d809FBfAc424946B314fEFA271";
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("🏔️ Red: Avalanche Fuji Testnet");
    console.log("🔗 Explorer: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        const [signer] = await ethers.getSigners();
        console.log("👤 Cuenta conectada:", signer.address);
        
        // 1. VERIFICAR ESTADO BÁSICO DEL CONTRATO
        console.log("\n🎮 1. ESTADO BÁSICO DEL CONTRATO");
        console.log("-".repeat(45));
        
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        const currentGameDay = await contract.getCurrentDay();
        const ticketCounter = await contract.ticketCounter();
        
        console.log("🎮 Game Active:", gameActive ? "✅ SÍ" : "❌ NO");
        console.log("🤖 Automation Active:", automationActive ? "✅ SÍ" : "❌ NO");
        console.log("⏸️ Emergency Pause:", emergencyPause ? "❌ SÍ" : "✅ NO");
        console.log("📅 Current Game Day:", currentGameDay.toString());
        console.log("🎫 Tickets vendidos:", ticketCounter.toString());
        
        const basicProblems = [];
        if (!gameActive) basicProblems.push("Game no está activo");
        if (!automationActive) basicProblems.push("Automation no está activo");
        if (emergencyPause) basicProblems.push("Emergency pause está activado");
        
        if (basicProblems.length > 0) {
            console.log("❌ PROBLEMAS BÁSICOS:");
            basicProblems.forEach(problem => console.log("   - " + problem));
        } else {
            console.log("✅ Configuración básica OK");
        }
        
        // 2. VERIFICAR CONFIGURACIÓN DE TIEMPOS
        console.log("\n⏰ 2. CONFIGURACIÓN DE TIEMPOS");
        console.log("-".repeat(35));
        
        const drawTimeUTC = await contract.drawTimeUTC();
        const drawInterval = await contract.DRAW_INTERVAL();
        const lastDrawTime = await contract.lastDrawTime();
        const totalDrawsExecuted = await contract.totalDrawsExecuted();
        
        const drawHour = Number(drawTimeUTC) / 3600;
        const intervalHours = Number(drawInterval) / 3600;
        const currentTime = Math.floor(Date.now() / 1000);
        const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
        const timeToNextDraw = nextDrawTime - currentTime;
        
        console.log("🕐 Draw Time UTC:", drawHour + ":00");
        console.log("⏳ Draw Interval:", intervalHours + " horas");
        console.log("⏰ Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("⏰ Next Draw Time:", new Date(nextDrawTime * 1000).toISOString());
        console.log("🎯 Total Draws Executed:", totalDrawsExecuted.toString());
        console.log("⏳ Time to Next Draw:", Math.max(0, timeToNextDraw), "segundos");
        
        if (timeToNextDraw > 0) {
            const hoursLeft = Math.floor(timeToNextDraw / 3600);
            const minutesLeft = Math.floor((timeToNextDraw % 3600) / 60);
            console.log("⏰ Tiempo restante:", hoursLeft + "h " + minutesLeft + "m");
        } else {
            console.log("🚨 ¡Ya es tiempo del sorteo!");
        }
        
        // 3. VERIFICAR UPKEEP
        console.log("\n🔄 3. VERIFICACIÓN DE UPKEEP");
        console.log("-".repeat(35));
        
        try {
            const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
            console.log("🔄 Upkeep Needed:", upkeepNeeded ? "✅ SÍ" : "❌ NO");
            
            if (upkeepNeeded) {
                console.log("✅ EL UPKEEP ESTÁ LISTO PARA EJECUTARSE");
                console.log("🤖 Chainlink Automation debería ejecutarlo automáticamente");
                
                if (performData !== "0x") {
                    try {
                        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['bool'], performData);
                        console.log("📋 Tipo de upkeep:", decoded[0] ? "SORTEO" : "DESCONOCIDO");
                    } catch (e) {
                        console.log("📋 Perform data:", performData);
                    }
                }
            } else {
                console.log("❌ EL UPKEEP NO ESTÁ LISTO");
                console.log("🔍 Posibles razones:");
                if (!automationActive) console.log("   - Automation está desactivado");
                if (emergencyPause) console.log("   - Emergency pause está activado");
                if (timeToNextDraw > 0) console.log("   - Todavía no es tiempo del sorteo");
            }
        } catch (error) {
            console.log("❌ Error verificando upkeep:", error.message);
        }
        
        // 4. VERIFICAR CONFIGURACIÓN VRF
        console.log("\n🎲 4. CONFIGURACIÓN VRF");
        console.log("-".repeat(30));
        
        const subscriptionId = await contract.subscriptionId();
        console.log("🔗 VRF Subscription ID:", subscriptionId.toString());
        console.log("🔗 VRF Coordinator: 0x2eD832Ba664535e5886b75D64C46EB9a228C2610 (Avalanche Fuji)");
        console.log("🔑 Key Hash: 0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61");
        console.log("⏰ Request Confirmations: 1 (Avalanche Fuji)");
        
        console.log("\n💡 VERIFICAR EN CHAINLINK:");
        console.log("🔗 VRF Dashboard: https://vrf.chain.link/");
        console.log("🔗 Automation Dashboard: https://automation.chain.link/");
        console.log("   - Cambiar a Avalanche Fuji");
        console.log("   - Verificar que la suscripción tenga fondos LINK");
        console.log("   - Verificar que el contrato esté agregado como consumer");
        console.log("   - Verificar que haya un upkeep creado");
        
        // 5. VERIFICAR POOLS Y FINANCIAMIENTO
        console.log("\n💰 5. ESTADO FINANCIERO");
        console.log("-".repeat(30));
        
        const mainPools = await contract.getMainPoolBalances();
        const reserves = await contract.getReserveBalances();
        const todaysPools = await contract.getDailyPoolInfo(currentGameDay);
        
        const totalMain = Number(mainPools.firstPrizeAccumulated) + 
                         Number(mainPools.secondPrizeAccumulated) + 
                         Number(mainPools.thirdPrizeAccumulated) + 
                         Number(mainPools.developmentAccumulated);
        
        const totalReserves = Number(reserves.firstPrizeReserve) + 
                             Number(reserves.secondPrizeReserve) + 
                             Number(reserves.thirdPrizeReserve);
        
        console.log("💰 Main Pools Total:", ethers.formatUnits(totalMain, 6), "USDC");
        console.log("🏦 Reserve Pools Total:", ethers.formatUnits(totalReserves, 6), "USDC");
        console.log("📅 Today's Collection:", ethers.formatUnits(todaysPools.totalCollected, 6), "USDC");
        console.log("🎯 Today Distributed:", todaysPools.distributed ? "✅ SÍ" : "❌ NO");
        console.log("🎲 Today Drawn:", todaysPools.drawn ? "✅ SÍ" : "❌ NO");
        
        // 6. DIAGNÓSTICO FINAL Y RECOMENDACIONES
        console.log("\n🔧 6. DIAGNÓSTICO Y RECOMENDACIONES");
        console.log("-".repeat(45));
        
        const issues = [];
        const solutions = [];
        
        if (!gameActive) {
            issues.push("Game no está activo");
            solutions.push("Activar game con función de admin");
        }
        
        if (!automationActive) {
            issues.push("Automation no está activo");
            solutions.push("Activar automation con toggleAutomation()");
        }
        
        if (emergencyPause) {
            issues.push("Emergency pause activado");
            solutions.push("Desactivar emergency pause con toggleEmergencyPause()");
        }
        
        if (timeToNextDraw > 3600) {
            issues.push("Todavía falta tiempo para el sorteo");
            solutions.push("Esperar hasta: " + new Date(nextDrawTime * 1000).toLocaleString());
        }
        
        if (Number(ticketCounter) === 0) {
            issues.push("No hay tickets comprados");
            solutions.push("Comprar tickets para activar el sistema");
        }
        
        if (!upkeepNeeded && timeToNextDraw <= 0) {
            issues.push("Upkeep no se activa aunque es tiempo de sorteo");
            solutions.push("Verificar configuración de Chainlink Automation");
            solutions.push("Revisar suscripción VRF y fondos LINK");
            solutions.push("Considerar ejecutar sorteo manual");
        }
        
        if (issues.length === 0) {
            console.log("✅ NO SE ENCONTRARON PROBLEMAS OBVIOS");
            console.log("🤖 El sistema debería funcionar automáticamente");
            console.log("");
            console.log("🔍 SI AÚN NO FUNCIONA, VERIFICAR:");
            console.log("1. 🔗 Chainlink Automation Dashboard");
            console.log("2. 💰 Fondos LINK en la suscripción VRF");
            console.log("3. 📋 Upkeep está creado y activo");
            console.log("4. 🔗 Contrato agregado como VRF consumer");
        } else {
            console.log("❌ PROBLEMAS ENCONTRADOS:");
            issues.forEach((issue, i) => {
                console.log(`   ${i + 1}. ${issue}`);
            });
            
            console.log("\n🔧 SOLUCIONES RECOMENDADAS:");
            solutions.forEach((solution, i) => {
                console.log(`   ${i + 1}. ${solution}`);
            });
        }
        
        // 7. COMANDOS ÚTILES
        console.log("\n📋 7. COMANDOS ÚTILES");
        console.log("-".repeat(25));
        console.log("# Activar automation:");
        console.log("npx hardhat run scripts/toggle-automation.js --network avalanche-fuji");
        console.log("");
        console.log("# Forzar sorteo manual:");
        console.log("npx hardhat run scripts/force-draw-fuji.js --network avalanche-fuji");
        console.log("");
        console.log("# Verificar estado:");
        console.log("npx hardhat run scripts/diagnostico-fuji-upkeep.js --network avalanche-fuji");
        
        console.log("\n" + "=".repeat(60));
        console.log("🔍 DIAGNÓSTICO COMPLETADO");
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("❌ Error durante el diagnóstico:", error.message);
        console.error("📋 Stack:", error.stack);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 