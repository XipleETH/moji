const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 EJECUTANDO DRAW Y VERIFICANDO DISTRIBUCIÓN V5");
    console.log("=".repeat(70));
    
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    // Obtener signer
    const [signer] = await ethers.getSigners();
    console.log("👤 Ejecutando con cuenta:", signer.address);
    
    // Conectar al contrato
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    console.log("\n📋 ESTADO INICIAL DEL CONTRATO:");
    console.log("=".repeat(50));
    
    // Estado inicial
    const initialGameDay = await contract.currentGameDay();
    const initialTicketCounter = await contract.ticketCounter();
    const initialTotalDraws = await contract.totalDrawsExecuted();
    const initialTotalReserves = await contract.totalReservesProcessed();
    // Obtener lastWinningNumbers como array
    const initialLastWinningNumbers = [];
    for (let i = 0; i < 4; i++) {
        initialLastWinningNumbers.push(await contract.lastWinningNumbers(i));
    }
    
    console.log("- Game Day actual:", initialGameDay.toString());
    console.log("- Total tickets:", initialTicketCounter.toString());
    console.log("- Total draws ejecutados:", initialTotalDraws.toString());
    console.log("- Total reserves procesadas:", initialTotalReserves.toString());
    console.log("- Últimos números ganadores:", `[${initialLastWinningNumbers.join(', ')}]`);
    
    // Obtener pools iniciales
    const initialMainPools = await contract.getMainPoolBalances();
    const initialReservePools = await contract.getReserveBalances();
    
    console.log("\n💰 POOLS INICIALES:");
    console.log("Main Pools:");
    console.log("  - First Prize:", ethers.formatUnits(initialMainPools[0], 6), "USDC");
    console.log("  - Second Prize:", ethers.formatUnits(initialMainPools[1], 6), "USDC");
    console.log("  - Third Prize:", ethers.formatUnits(initialMainPools[2], 6), "USDC");
    console.log("  - Development:", ethers.formatUnits(initialMainPools[3], 6), "USDC");
    
    console.log("Reserve Pools:");
    console.log("  - First Prize Reserve:", ethers.formatUnits(initialReservePools[0], 6), "USDC");
    console.log("  - Second Prize Reserve:", ethers.formatUnits(initialReservePools[1], 6), "USDC");
    console.log("  - Third Prize Reserve:", ethers.formatUnits(initialReservePools[2], 6), "USDC");
    
    // Obtener información del día actual
    const currentGameDay = initialGameDay;
    const dailyPoolInfo = await contract.getDailyPoolInfo(currentGameDay);
    const gameDayTickets = await contract.getGameDayTickets(currentGameDay);
    
    console.log("\n🎫 INFORMACIÓN DEL DÍA ACTUAL:");
    console.log("- Game Day:", currentGameDay.toString());
    console.log("- Total collected:", ethers.formatUnits(dailyPoolInfo[0], 6), "USDC");
    console.log("- Main pool portion:", ethers.formatUnits(dailyPoolInfo[1], 6), "USDC");
    console.log("- Reserve portion:", ethers.formatUnits(dailyPoolInfo[2], 6), "USDC");
    console.log("- Distributed:", dailyPoolInfo[3]);
    console.log("- Drawn:", dailyPoolInfo[4]);
    console.log("- Tickets del día:", gameDayTickets.length);
    
    // Mostrar algunos tickets del día
    console.log("\n🎫 PRIMEROS 10 TICKETS DEL DÍA:");
    for (let i = 0; i < Math.min(10, gameDayTickets.length); i++) {
        const ticketId = gameDayTickets[i];
        const ticketInfo = await contract.getFullTicketInfo(ticketId);
        const numbers = ticketInfo[1];
        console.log(`  Ticket ${ticketId}: [${numbers.join(', ')}] - Owner: ${ticketInfo[0].slice(0, 8)}...`);
    }
    
    if (gameDayTickets.length > 10) {
        console.log(`  ... y ${gameDayTickets.length - 10} tickets más`);
    }
    
    console.log("\n🎲 EJECUTANDO DRAW FORZADO...");
    console.log("=".repeat(50));
    
    // Verificar si el automation está activo
    const automationActive = await contract.automationActive();
    console.log("- Automation activo:", automationActive);
    
    if (!automationActive) {
        console.log("⚠️ Activando automation...");
        const toggleTx = await contract.toggleAutomation();
        await toggleTx.wait();
        console.log("✅ Automation activado");
    }
    
    // Forzar draw usando performUpkeep
    try {
        console.log("🎯 Ejecutando performUpkeep para forzar draw...");
        const performData = ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [true]);
        
        const performTx = await contract.performUpkeep(performData, {
            gasLimit: 3000000 // Gas alto para VRF
        });
        
        console.log("📡 Tx de performUpkeep enviada:", performTx.hash);
        const receipt = await performTx.wait();
        console.log("✅ PerformUpkeep ejecutado en bloque:", receipt.blockNumber);
        
        // Esperar un poco para que el VRF responda
        console.log("⏳ Esperando respuesta del VRF (30 segundos)...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error("❌ Error en performUpkeep:", error.message);
        console.log("🔄 Intentando método alternativo...");
        
        // Método alternativo: actualizar lastDrawTime para forzar draw
        try {
            console.log("⏰ Actualizando lastDrawTime para forzar draw...");
            const currentTime = Math.floor(Date.now() / 1000);
            const pastTime = currentTime - (25 * 3600); // 25 horas atrás
            
            const setTimeTx = await contract.setLastDrawTime(pastTime);
            await setTimeTx.wait();
            console.log("✅ LastDrawTime actualizado");
            
            // Ahora intentar performUpkeep de nuevo
            console.log("🎯 Reintentando performUpkeep...");
            const performTx2 = await contract.performUpkeep(performData, {
                gasLimit: 3000000
            });
            
            console.log("📡 Tx de performUpkeep enviada:", performTx2.hash);
            await performTx2.wait();
            console.log("✅ PerformUpkeep ejecutado exitosamente");
            
            console.log("⏳ Esperando respuesta del VRF (30 segundos)...");
            await new Promise(resolve => setTimeout(resolve, 30000));
            
        } catch (error2) {
            console.error("❌ Error en método alternativo:", error2.message);
        }
    }
    
    console.log("\n🔍 VERIFICANDO RESULTADOS DEL DRAW:");
    console.log("=".repeat(50));
    
    // Verificar estado después del draw
    const finalGameDay = await contract.currentGameDay();
    const finalTicketCounter = await contract.ticketCounter();
    const finalTotalDraws = await contract.totalDrawsExecuted();
    const finalTotalReserves = await contract.totalReservesProcessed();
    // Obtener finalLastWinningNumbers como array
    const finalLastWinningNumbers = [];
    for (let i = 0; i < 4; i++) {
        finalLastWinningNumbers.push(await contract.lastWinningNumbers(i));
    }
    
    console.log("- Game Day final:", finalGameDay.toString());
    console.log("- Total tickets:", finalTicketCounter.toString());
    console.log("- Total draws ejecutados:", finalTotalDraws.toString());
    console.log("- Total reserves procesadas:", finalTotalReserves.toString());
    console.log("- Nuevos números ganadores:", `[${finalLastWinningNumbers.join(', ')}]`);
    
    // Verificar si hubo cambios
    const drawExecuted = finalTotalDraws > initialTotalDraws;
    const reservesProcessed = finalTotalReserves > initialTotalReserves;
    const numbersChanged = !finalLastWinningNumbers.every((num, index) => num === initialLastWinningNumbers[index]);
    
    console.log("\n📊 CAMBIOS DETECTADOS:");
    console.log("- Draw ejecutado:", drawExecuted ? "✅ SÍ" : "❌ NO");
    console.log("- Reserves procesadas:", reservesProcessed ? "✅ SÍ" : "❌ NO");
    console.log("- Números actualizados:", numbersChanged ? "✅ SÍ" : "❌ NO");
    
    if (drawExecuted) {
        console.log("\n🎉 ¡DRAW EJECUTADO EXITOSAMENTE!");
        
        // Obtener pools finales
        const finalMainPools = await contract.getMainPoolBalances();
        const finalReservePools = await contract.getReserveBalances();
        
        console.log("\n💰 POOLS DESPUÉS DEL DRAW:");
        console.log("Main Pools:");
        console.log("  - First Prize:", ethers.formatUnits(finalMainPools[0], 6), "USDC");
        console.log("  - Second Prize:", ethers.formatUnits(finalMainPools[1], 6), "USDC");
        console.log("  - Third Prize:", ethers.formatUnits(finalMainPools[2], 6), "USDC");
        console.log("  - Development:", ethers.formatUnits(finalMainPools[3], 6), "USDC");
        
        console.log("Reserve Pools:");
        console.log("  - First Prize Reserve:", ethers.formatUnits(finalReservePools[0], 6), "USDC");
        console.log("  - Second Prize Reserve:", ethers.formatUnits(finalReservePools[1], 6), "USDC");
        console.log("  - Third Prize Reserve:", ethers.formatUnits(finalReservePools[2], 6), "USDC");
        
        // Calcular cambios en pools
        console.log("\n📈 CAMBIOS EN POOLS:");
        const mainPoolChanges = [
            finalMainPools[0] - initialMainPools[0],
            finalMainPools[1] - initialMainPools[1],
            finalMainPools[2] - initialMainPools[2],
            finalMainPools[3] - initialMainPools[3]
        ];
        
        const reservePoolChanges = [
            finalReservePools[0] - initialReservePools[0],
            finalReservePools[1] - initialReservePools[1],
            finalReservePools[2] - initialReservePools[2]
        ];
        
        console.log("Main Pool Changes:");
        console.log("  - First Prize:", ethers.formatUnits(mainPoolChanges[0], 6), "USDC");
        console.log("  - Second Prize:", ethers.formatUnits(mainPoolChanges[1], 6), "USDC");
        console.log("  - Third Prize:", ethers.formatUnits(mainPoolChanges[2], 6), "USDC");
        console.log("  - Development:", ethers.formatUnits(mainPoolChanges[3], 6), "USDC");
        
        console.log("Reserve Pool Changes:");
        console.log("  - First Prize Reserve:", ethers.formatUnits(reservePoolChanges[0], 6), "USDC");
        console.log("  - Second Prize Reserve:", ethers.formatUnits(reservePoolChanges[1], 6), "USDC");
        console.log("  - Third Prize Reserve:", ethers.formatUnits(reservePoolChanges[2], 6), "USDC");
        
        // Analizar tickets ganadores
        console.log("\n🏆 ANÁLISIS DE TICKETS GANADORES:");
        console.log("Números ganadores:", `[${finalLastWinningNumbers.join(', ')}]`);
        
        let firstPrizeWinners = 0;
        let secondPrizeWinners = 0;
        let thirdPrizeWinners = 0;
        let noWinners = 0;
        
        console.log("\n🔍 Analizando tickets del día...");
        for (let i = 0; i < gameDayTickets.length; i++) {
            const ticketId = gameDayTickets[i];
            const ticketInfo = await contract.getFullTicketInfo(ticketId);
            const ticketNumbers = ticketInfo[1];
            const matches = ticketInfo[6]; // matches count
            
            if (matches == 4) {
                firstPrizeWinners++;
                console.log(`🥇 PRIMER PREMIO - Ticket ${ticketId}: [${ticketNumbers.join(', ')}] (4 matches)`);
            } else if (matches == 3) {
                secondPrizeWinners++;
                console.log(`🥈 SEGUNDO PREMIO - Ticket ${ticketId}: [${ticketNumbers.join(', ')}] (3 matches)`);
            } else if (matches == 2) {
                thirdPrizeWinners++;
                console.log(`🥉 TERCER PREMIO - Ticket ${ticketId}: [${ticketNumbers.join(', ')}] (2 matches)`);
            } else {
                noWinners++;
            }
        }
        
        console.log("\n📊 RESUMEN DE GANADORES:");
        console.log("🥇 Primer Premio (4 matches):", firstPrizeWinners);
        console.log("🥈 Segundo Premio (3 matches):", secondPrizeWinners);
        console.log("🥉 Tercer Premio (2 matches):", thirdPrizeWinners);
        console.log("❌ Sin premio:", noWinners);
        console.log("📊 Total tickets analizados:", gameDayTickets.length);
        
    } else {
        console.log("\n⚠️ EL DRAW NO SE EJECUTÓ");
        console.log("Posibles razones:");
        console.log("- VRF aún no ha respondido");
        console.log("- Condiciones de timing no se cumplieron");
        console.log("- Error en la transacción");
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("🎲 VERIFICACIÓN DE DRAW COMPLETADA");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error en el script:", error);
        process.exit(1);
    }); 