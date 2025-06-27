const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 FORZANDO SORTEO PARA VERIFICAR VRF - V5");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    // Conectar al contrato
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Executing with account:", signer.address);
    console.log("📍 Contract Address:", CONTRACT_ADDRESS);
    
    try {
        console.log("\n📊 ESTADO INICIAL:");
        
        // Estado inicial
        const initialGameActive = await contract.gameActive();
        const initialAutomationActive = await contract.automationActive();
        const initialLastDrawTime = await contract.lastDrawTime();
        const initialCurrentGameDay = await contract.currentGameDay();
        const initialDrawTimeUTC = await contract.drawTimeUTC();
        
        console.log("- Game Active:", initialGameActive);
        console.log("- Automation Active:", initialAutomationActive);
        console.log("- Current Game Day:", initialCurrentGameDay.toString());
        console.log("- Last Draw Time:", new Date(Number(initialLastDrawTime) * 1000).toUTCString());
        console.log("- Draw Time UTC:", Number(initialDrawTimeUTC) / 3600, ":00 UTC");
        
        // Verificar si ya es tiempo de sorteo
        const drawInterval = await contract.DRAW_INTERVAL();
        const nextDrawTime = Number(initialLastDrawTime) + Number(drawInterval);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilDraw = nextDrawTime - currentTime;
        
        console.log("- Next Draw Time:", new Date(nextDrawTime * 1000).toUTCString());
        console.log("- Time Until Draw:", Math.floor(timeUntilDraw / 3600), "hours,", Math.floor((timeUntilDraw % 3600) / 60), "minutes");
        
        // Verificar winning numbers iniciales
        const initialWinningNumbers = [];
        for (let i = 0; i < 4; i++) {
            initialWinningNumbers.push(await contract.lastWinningNumbers(i));
        }
        console.log("- Initial Winning Numbers:", initialWinningNumbers.map(n => n.toString()));
        
        console.log("\n🔧 FORZANDO SORTEO...");
        
        // Método 1: Ajustar lastDrawTime para que sea tiempo de sorteo
        console.log("📅 Ajustando timing para forzar sorteo...");
        
        // Establecer lastDrawTime hace 25 horas para que ya sea tiempo de sorteo
        const forceDrawTime = currentTime - (25 * 3600); // 25 horas atrás
        
        console.log("⏰ Setting lastDrawTime to force immediate draw...");
        const setTimeTx = await contract.setLastDrawTime(forceDrawTime);
        await setTimeTx.wait();
        console.log("✅ lastDrawTime updated!");
        
        // Verificar que ahora es tiempo de sorteo
        const newLastDrawTime = await contract.lastDrawTime();
        const newNextDrawTime = Number(newLastDrawTime) + Number(drawInterval);
        const newTimeUntilDraw = newNextDrawTime - currentTime;
        
        console.log("- New Last Draw Time:", new Date(Number(newLastDrawTime) * 1000).toUTCString());
        console.log("- New Next Draw Time:", new Date(newNextDrawTime * 1000).toUTCString());
        console.log("- New Time Until Draw:", Math.floor(newTimeUntilDraw / 3600), "hours,", Math.floor((newTimeUntilDraw % 3600) / 60), "minutes");
        
        // Verificar upkeep
        console.log("\n🔍 Verificando si es tiempo de upkeep...");
        const checkUpkeepResult = await contract.checkUpkeep("0x");
        console.log("- Upkeep Needed:", checkUpkeepResult[0]);
        
        if (checkUpkeepResult[0]) {
            console.log("\n🚀 EJECUTANDO UPKEEP (FORZAR SORTEO)...");
            
            // Ejecutar performUpkeep
            const performUpkeepTx = await contract.performUpkeep(checkUpkeepResult[1]);
            console.log("📡 Transaction sent:", performUpkeepTx.hash);
            
            console.log("⏳ Waiting for transaction confirmation...");
            const receipt = await performUpkeepTx.wait();
            console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
            
            // Esperar un poco para que el VRF callback se procese
            console.log("\n⏳ Esperando callback del VRF (30 segundos)...");
            await new Promise(resolve => setTimeout(resolve, 30000));
            
            console.log("\n📊 VERIFICANDO RESULTADOS POST-SORTEO:");
            
            // Verificar nuevos winning numbers
            const newWinningNumbers = [];
            for (let i = 0; i < 4; i++) {
                newWinningNumbers.push(await contract.lastWinningNumbers(i));
            }
            console.log("- New Winning Numbers:", newWinningNumbers.map(n => n.toString()));
            
            // Verificar si los números cambiaron
            const numbersChanged = !initialWinningNumbers.every((num, idx) => 
                num.toString() === newWinningNumbers[idx].toString()
            );
            
            console.log("- Numbers Changed:", numbersChanged ? "✅ YES" : "❌ NO");
            
            // Verificar estadísticas
            const totalDrawsExecuted = await contract.totalDrawsExecuted();
            const totalReservesProcessed = await contract.totalReservesProcessed();
            
            console.log("- Total Draws Executed:", totalDrawsExecuted.toString());
            console.log("- Total Reserves Processed:", totalReservesProcessed.toString());
            
            // Verificar estado del día anterior
            const previousGameDay = Number(initialCurrentGameDay) - 1;
            const previousDayInfo = await contract.getDailyPoolInfo(previousGameDay);
            
            console.log("\n📅 INFORMACIÓN DEL DÍA ANTERIOR (", previousGameDay, "):");
            console.log("- Total Collected:", ethers.formatUnits(previousDayInfo[0], 6), "USDC");
            console.log("- Distributed:", previousDayInfo[3]);
            console.log("- Drawn:", previousDayInfo[4]);
            
            if (previousDayInfo[4]) { // Si drawn es true
                console.log("- Winning Numbers:", previousDayInfo[5].toString());
            }
            
            console.log("\n🎉 RESULTADO DEL TEST:");
            if (numbersChanged) {
                console.log("✅ VRF FUNCIONANDO CORRECTAMENTE!");
                console.log("✅ Los números ganadores han sido actualizados");
                console.log("✅ El sorteo se ejecutó exitosamente");
            } else {
                console.log("⚠️  VRF puede no estar funcionando correctamente");
                console.log("⚠️  Los números ganadores no cambiaron");
                console.log("💡 Verifica que el contrato esté agregado como VRF consumer");
            }
            
        } else {
            console.log("❌ No es tiempo de upkeep aún");
            console.log("💡 Puede que necesites esperar más o ajustar el timing");
        }
        
    } catch (error) {
        console.error("❌ Error ejecutando test:", error.message);
        
        // Si el error es de autorización, mostrar info adicional
        if (error.message.includes("Not authorized")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- Este error indica que solo el contrato puede llamar ciertas funciones");
            console.log("- Vamos a intentar el método alternativo...");
        }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🔍 TEST DE VRF COMPLETADO");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 