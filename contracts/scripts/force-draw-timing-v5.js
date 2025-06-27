const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 FORZANDO DRAW MEDIANTE AJUSTE DE TIMING V5");
    console.log("=".repeat(70));
    
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    // Obtener signer
    const [signer] = await ethers.getSigners();
    console.log("👤 Ejecutando con cuenta:", signer.address);
    
    // Conectar al contrato
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    console.log("\n📋 ESTADO INICIAL:");
    console.log("=".repeat(40));
    
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
    
    console.log("- Game Day:", initialGameDay.toString());
    console.log("- Total tickets:", initialTicketCounter.toString());
    console.log("- Total draws:", initialTotalDraws.toString());
    console.log("- Total reserves:", initialTotalReserves.toString());
    console.log("- Números actuales:", `[${initialLastWinningNumbers.join(', ')}]`);
    
    // Obtener pools iniciales
    const initialMainPools = await contract.getMainPoolBalances();
    const initialReservePools = await contract.getReserveBalances();
    
    console.log("\n💰 POOLS INICIALES:");
    console.log("Main Pools:");
    console.log("  - First:", ethers.formatUnits(initialMainPools[0], 6), "USDC");
    console.log("  - Second:", ethers.formatUnits(initialMainPools[1], 6), "USDC");
    console.log("  - Third:", ethers.formatUnits(initialMainPools[2], 6), "USDC");
    console.log("  - Development:", ethers.formatUnits(initialMainPools[3], 6), "USDC");
    
    console.log("Reserve Pools:");
    console.log("  - First Reserve:", ethers.formatUnits(initialReservePools[0], 6), "USDC");
    console.log("  - Second Reserve:", ethers.formatUnits(initialReservePools[1], 6), "USDC");
    console.log("  - Third Reserve:", ethers.formatUnits(initialReservePools[2], 6), "USDC");
    
    // Información del día actual
    const dailyPoolInfo = await contract.getDailyPoolInfo(initialGameDay);
    const gameDayTickets = await contract.getGameDayTickets(initialGameDay);
    
    console.log("\n🎫 DÍA ACTUAL (", initialGameDay.toString(), "):");
    console.log("- Total collected:", ethers.formatUnits(dailyPoolInfo[0], 6), "USDC");
    console.log("- Main portion:", ethers.formatUnits(dailyPoolInfo[1], 6), "USDC");
    console.log("- Reserve portion:", ethers.formatUnits(dailyPoolInfo[2], 6), "USDC");
    console.log("- Tickets:", gameDayTickets.length);
    console.log("- Distributed:", dailyPoolInfo[3]);
    console.log("- Drawn:", dailyPoolInfo[4]);
    
    console.log("\n⏰ AJUSTANDO TIMING PARA FORZAR DRAW...");
    console.log("=".repeat(50));
    
    try {
        // Obtener tiempo actual
        const currentTime = Math.floor(Date.now() / 1000);
        console.log("- Tiempo actual:", new Date(currentTime * 1000).toISOString());
        
        // Establecer lastDrawTime 25 horas atrás para forzar draw
        const pastTime = currentTime - (25 * 3600); // 25 horas atrás
        console.log("- Estableciendo lastDrawTime:", new Date(pastTime * 1000).toISOString());
        
        const setTimeTx = await contract.setLastDrawTime(pastTime);
        console.log("📡 Tx setLastDrawTime enviada:", setTimeTx.hash);
        await setTimeTx.wait();
        console.log("✅ LastDrawTime actualizado");
        
        // Verificar que automation esté activo
        const automationActive = await contract.automationActive();
        console.log("- Automation activo:", automationActive);
        
        if (!automationActive) {
            console.log("⚠️ Activando automation...");
            const toggleTx = await contract.toggleAutomation();
            await toggleTx.wait();
            console.log("✅ Automation activado");
        }
        
        // Ahora ejecutar performUpkeep
        console.log("\n🎯 EJECUTANDO PERFORM UPKEEP...");
        const performData = ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [true]);
        
        const performTx = await contract.performUpkeep(performData, {
            gasLimit: 3000000 // Gas alto para VRF
        });
        
        console.log("📡 Tx performUpkeep enviada:", performTx.hash);
        const receipt = await performTx.wait();
        console.log("✅ PerformUpkeep ejecutado en bloque:", receipt.blockNumber);
        
        // Esperar respuesta del VRF
        console.log("⏳ Esperando respuesta del VRF (45 segundos)...");
        await new Promise(resolve => setTimeout(resolve, 45000));
        
        console.log("\n🔍 VERIFICANDO RESULTADOS...");
        console.log("=".repeat(40));
        
        // Verificar estado después del draw
        const finalGameDay = await contract.currentGameDay();
        const finalTotalDraws = await contract.totalDrawsExecuted();
        const finalTotalReserves = await contract.totalReservesProcessed();
        
        // Obtener finalLastWinningNumbers como array
        const finalLastWinningNumbers = [];
        for (let i = 0; i < 4; i++) {
            finalLastWinningNumbers.push(await contract.lastWinningNumbers(i));
        }
        
        console.log("- Game Day final:", finalGameDay.toString());
        console.log("- Total draws final:", finalTotalDraws.toString());
        console.log("- Total reserves final:", finalTotalReserves.toString());
        console.log("- Números finales:", `[${finalLastWinningNumbers.join(', ')}]`);
        
        // Verificar cambios
        const drawExecuted = finalTotalDraws > initialTotalDraws;
        const reservesProcessed = finalTotalReserves > initialTotalReserves;
        const numbersChanged = !finalLastWinningNumbers.every((num, index) => num === initialLastWinningNumbers[index]);
        
        console.log("\n📊 CAMBIOS:");
        console.log("- Draw ejecutado:", drawExecuted ? "✅ SÍ" : "❌ NO");
        console.log("- Reserves procesadas:", reservesProcessed ? "✅ SÍ" : "❌ NO");
        console.log("- Números cambiaron:", numbersChanged ? "✅ SÍ" : "❌ NO");
        
        if (drawExecuted) {
            console.log("\n🎉 ¡DRAW EJECUTADO EXITOSAMENTE!");
            
            // Obtener pools finales
            const finalMainPools = await contract.getMainPoolBalances();
            const finalReservePools = await contract.getReserveBalances();
            
            console.log("\n💰 POOLS FINALES:");
            console.log("Main Pools:");
            console.log("  - First:", ethers.formatUnits(finalMainPools[0], 6), "USDC");
            console.log("  - Second:", ethers.formatUnits(finalMainPools[1], 6), "USDC");
            console.log("  - Third:", ethers.formatUnits(finalMainPools[2], 6), "USDC");
            console.log("  - Development:", ethers.formatUnits(finalMainPools[3], 6), "USDC");
            
            console.log("Reserve Pools:");
            console.log("  - First Reserve:", ethers.formatUnits(finalReservePools[0], 6), "USDC");
            console.log("  - Second Reserve:", ethers.formatUnits(finalReservePools[1], 6), "USDC");
            console.log("  - Third Reserve:", ethers.formatUnits(finalReservePools[2], 6), "USDC");
            
            // Calcular cambios
            console.log("\n📈 CAMBIOS EN POOLS:");
            const mainChanges = [
                finalMainPools[0] - initialMainPools[0],
                finalMainPools[1] - initialMainPools[1],
                finalMainPools[2] - initialMainPools[2],
                finalMainPools[3] - initialMainPools[3]
            ];
            
            console.log("Main Pool Changes:");
            console.log("  - First: +", ethers.formatUnits(mainChanges[0], 6), "USDC");
            console.log("  - Second: +", ethers.formatUnits(mainChanges[1], 6), "USDC");
            console.log("  - Third: +", ethers.formatUnits(mainChanges[2], 6), "USDC");
            console.log("  - Development: +", ethers.formatUnits(mainChanges[3], 6), "USDC");
            
            // Analizar ganadores
            console.log("\n🏆 ANÁLISIS DE GANADORES:");
            console.log("Números ganadores:", `[${finalLastWinningNumbers.join(', ')}]`);
            
            let winners = { first: 0, second: 0, third: 0, none: 0 };
            
            console.log("\n🔍 Verificando tickets...");
            for (let i = 0; i < Math.min(gameDayTickets.length, 20); i++) { // Solo mostrar primeros 20
                const ticketId = gameDayTickets[i];
                const ticketInfo = await contract.getFullTicketInfo(ticketId);
                const ticketNumbers = ticketInfo[1];
                const matches = ticketInfo[6];
                
                if (matches == 4) {
                    winners.first++;
                    console.log(`🥇 Ticket ${ticketId}: [${ticketNumbers.join(', ')}] - 4 matches`);
                } else if (matches == 3) {
                    winners.second++;
                    console.log(`🥈 Ticket ${ticketId}: [${ticketNumbers.join(', ')}] - 3 matches`);
                } else if (matches == 2) {
                    winners.third++;
                    console.log(`🥉 Ticket ${ticketId}: [${ticketNumbers.join(', ')}] - 2 matches`);
                } else {
                    winners.none++;
                }
            }
            
            // Contar todos los tickets si hay más de 20
            if (gameDayTickets.length > 20) {
                console.log(`\n⏳ Contando ${gameDayTickets.length - 20} tickets restantes...`);
                for (let i = 20; i < gameDayTickets.length; i++) {
                    const ticketId = gameDayTickets[i];
                    const ticketInfo = await contract.getFullTicketInfo(ticketId);
                    const matches = ticketInfo[6];
                    
                    if (matches == 4) winners.first++;
                    else if (matches == 3) winners.second++;
                    else if (matches == 2) winners.third++;
                    else winners.none++;
                }
            }
            
            console.log("\n📊 RESUMEN FINAL:");
            console.log("🥇 Primer Premio (4 matches):", winners.first);
            console.log("🥈 Segundo Premio (3 matches):", winners.second);
            console.log("🥉 Tercer Premio (2 matches):", winners.third);
            console.log("❌ Sin premio:", winners.none);
            console.log("📊 Total tickets:", gameDayTickets.length);
            
            // Verificar distribución del día
            const finalDailyInfo = await contract.getDailyPoolInfo(initialGameDay);
            console.log("\n📋 ESTADO FINAL DEL DÍA:");
            console.log("- Distributed:", finalDailyInfo[3]);
            console.log("- Drawn:", finalDailyInfo[4]);
            console.log("- Winning Numbers:", `[${finalDailyInfo[5].join(', ')}]`);
            
        } else {
            console.log("\n⚠️ EL DRAW NO SE EJECUTÓ");
            console.log("El VRF puede tardar más tiempo en responder.");
            console.log("Verifica en unos minutos si los números cambiaron.");
        }
        
    } catch (error) {
        console.error("❌ Error ejecutando draw:", error.message);
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("🎲 PROCESO COMPLETADO");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error en el script:", error);
        process.exit(1);
    }); 