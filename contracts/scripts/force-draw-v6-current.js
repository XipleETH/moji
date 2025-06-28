const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 FORZANDO SORTEO EN CONTRATO V6 ACTUAL");
    console.log("=".repeat(70));
    
    // ✅ CONTRATO V6 - EL QUE USA EL FRONTEND
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    const SUBSCRIPTION_ID = "70846359092368923949796315994230469102226608583606291730577230133525692264419";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Ejecutando con cuenta:", signer.address);
    console.log("📍 Contrato V6:", CONTRACT_ADDRESS);
    console.log("🔗 Subscription ID:", SUBSCRIPTION_ID);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    console.log("\n📋 ESTADO INICIAL:");
    
    const initialGameDay = await contract.currentGameDay();
    const initialTotalDraws = await contract.totalDrawsExecuted();
    const initialTicketCounter = await contract.ticketCounter();
    
    console.log("- Game Day actual:", initialGameDay.toString());
    console.log("- Total draws ejecutados:", initialTotalDraws.toString());
    console.log("- Total tickets:", initialTicketCounter.toString());
    
    // Verificar subscription ID del contrato
    const contractSubId = await contract.subscriptionId();
    console.log("- Contract Subscription ID:", contractSubId.toString());
    console.log("- Expected Subscription ID:", SUBSCRIPTION_ID);
    console.log("- IDs Match:", contractSubId.toString() === SUBSCRIPTION_ID ? "✅" : "❌");
    
    // Información del día actual
    const currentGameDay = initialGameDay;
    const dailyPoolInfo = await contract.getDailyPoolInfo(currentGameDay);
    const gameDayTickets = await contract.getGameDayTickets(currentGameDay);
    
    console.log("\n🎫 DÍA ACTUAL (" + currentGameDay.toString() + "):");
    console.log("- Total collected:", ethers.formatUnits(dailyPoolInfo[0], 6), "USDC");
    console.log("- Main pool portion:", ethers.formatUnits(dailyPoolInfo[1], 6), "USDC");
    console.log("- Reserve portion:", ethers.formatUnits(dailyPoolInfo[2], 6), "USDC");
    console.log("- Tickets:", gameDayTickets.length);
    console.log("- Distributed:", dailyPoolInfo[3]);
    console.log("- Ya sorteado:", dailyPoolInfo[4]);
    
    if (gameDayTickets.length === 0) {
        console.log("⚠️ No hay tickets para este día. ¿Quieres continuar?");
    }
    
    // Números ganadores actuales
    const currentWinningNumbers = [];
    for (let i = 0; i < 4; i++) {
        currentWinningNumbers.push(await contract.lastWinningNumbers(i));
    }
    console.log("- Números actuales:", `[${currentWinningNumbers.join(', ')}]`);
    
    // Verificar timing del sorteo
    const drawTimeUTC = await contract.drawTimeUTC();
    const lastDrawTime = await contract.lastDrawTime();
    console.log("- Draw Time UTC:", Number(drawTimeUTC) / 3600, ":00 UTC");
    console.log("- Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
    
    console.log("\n🎯 EJECUTANDO DRAW:");
    
    // Verificar automation
    const automationActive = await contract.automationActive();
    console.log("- Automation activo:", automationActive);
    
    if (!automationActive) {
        console.log("⚠️ Activando automation...");
        const toggleTx = await contract.toggleAutomation();
        await toggleTx.wait();
        console.log("✅ Automation activado");
    }
    
    // Verificar si checkUpkeep indica que se puede hacer draw
    try {
        const checkUpkeepResult = await contract.checkUpkeep('0x');
        console.log("- CheckUpkeep result:", checkUpkeepResult[0]);
        
        if (!checkUpkeepResult[0]) {
            console.log("⚠️ CheckUpkeep indica que no se puede hacer draw ahora");
            console.log("   Forzando con setLastDrawTime...");
            
            const currentTime = Math.floor(Date.now() / 1000);
            const pastTime = currentTime - (25 * 3600); // 25 horas atrás
            
            const setTimeTx = await contract.setLastDrawTime(pastTime);
            await setTimeTx.wait();
            console.log("✅ LastDrawTime actualizado para forzar draw");
        }
    } catch (error) {
        console.log("⚠️ No se pudo verificar checkUpkeep:", error.message);
    }
    
    try {
        const performData = ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [true]);
        const performTx = await contract.performUpkeep(performData, { 
            gasLimit: 3000000 
        });
        
        console.log("📡 Tx enviada:", performTx.hash);
        await performTx.wait();
        console.log("✅ PerformUpkeep ejecutado");
        
        console.log("⏳ Esperando VRF response (90 segundos)...");
        
        // Monitor en tiempo real
        const startTime = Date.now();
        let vrfResponded = false;
        
        while (Date.now() - startTime < 90000 && !vrfResponded) {
            const currentDraws = await contract.totalDrawsExecuted();
            if (currentDraws > initialTotalDraws) {
                console.log("✅ VRF respondió exitosamente!");
                vrfResponded = true;
                break;
            }
            
            // Log cada 15 segundos
            if ((Date.now() - startTime) % 15000 < 2000) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                console.log(`⏳ Esperando VRF... (${elapsed}s)`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (!vrfResponded) {
            console.log("⏰ Timeout esperando VRF - pero puede completarse después");
        }
        
    } catch (error) {
        console.error("❌ Error ejecutando performUpkeep:", error.message);
    }
    
    console.log("\n🔍 VERIFICANDO RESULTADOS:");
    
    const finalTotalDraws = await contract.totalDrawsExecuted();
    const finalWinningNumbers = [];
    for (let i = 0; i < 4; i++) {
        finalWinningNumbers.push(await contract.lastWinningNumbers(i));
    }
    
    const drawExecuted = finalTotalDraws > initialTotalDraws;
    const numbersChanged = !finalWinningNumbers.every((num, index) => num === currentWinningNumbers[index]);
    
    console.log("- Draw ejecutado:", drawExecuted ? "✅ SÍ" : "❌ NO");
    console.log("- Total draws:", initialTotalDraws.toString(), "→", finalTotalDraws.toString());
    console.log("- Números anteriores:", `[${currentWinningNumbers.join(', ')}]`);
    console.log("- Números finales:", `[${finalWinningNumbers.join(', ')}]`);
    console.log("- Números cambiaron:", numbersChanged ? "✅ SÍ" : "❌ NO");
    
    if (drawExecuted) {
        console.log("\n🎉 ¡SORTEO EJECUTADO EN CONTRATO V6!");
        
        // Mostrar pools después del sorteo
        const mainPools = await contract.getMainPoolBalances();
        const reservePools = await contract.getReserveBalances();
        
        console.log("\n💰 POOLS DESPUÉS DEL SORTEO:");
        console.log("Main Pools:");
        console.log("  - First Prize:", ethers.formatUnits(mainPools[0], 6), "USDC");
        console.log("  - Second Prize:", ethers.formatUnits(mainPools[1], 6), "USDC");
        console.log("  - Third Prize:", ethers.formatUnits(mainPools[2], 6), "USDC");
        console.log("  - Development:", ethers.formatUnits(mainPools[3], 6), "USDC");
        
        console.log("Reserve Pools:");
        console.log("  - First Prize Reserve:", ethers.formatUnits(reservePools[0], 6), "USDC");
        console.log("  - Second Prize Reserve:", ethers.formatUnits(reservePools[1], 6), "USDC");
        console.log("  - Third Prize Reserve:", ethers.formatUnits(reservePools[2], 6), "USDC");
        
        // Verificar el estado del día después del sorteo
        const finalDailyInfo = await contract.getDailyPoolInfo(currentGameDay);
        console.log("\n📊 ESTADO FINAL DEL DÍA:");
        console.log("- Distributed:", finalDailyInfo[3]);
        console.log("- Drawn:", finalDailyInfo[4]);
        
    } else {
        console.log("\n❌ EL SORTEO NO SE EJECUTÓ TODAVÍA");
        console.log("   El VRF puede tomar más tiempo en responder");
        console.log("   Puedes verificar después en BaseScan:");
        console.log(`   https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`);
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("🎲 PRUEBA DEL CONTRATO V6 COMPLETADA");
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    console.log("🔗 BaseScan:", `https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 