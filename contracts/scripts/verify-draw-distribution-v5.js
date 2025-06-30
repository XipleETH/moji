const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICANDO DISTRIBUCIÓN DETALLADA V5");
    console.log("=".repeat(70));
    
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    // Obtener signer
    const [signer] = await ethers.getSigners();
    console.log("👤 Verificando con cuenta:", signer.address);
    
    // Conectar al contrato
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    console.log("\n📋 ESTADO ACTUAL DEL CONTRATO:");
    console.log("=".repeat(50));
    
    const currentGameDay = await contract.currentGameDay();
    const totalDraws = await contract.totalDrawsExecuted();
    const totalReserves = await contract.totalReservesProcessed();
    
    // Obtener números ganadores actuales
    const winningNumbers = [];
    for (let i = 0; i < 4; i++) {
        winningNumbers.push(await contract.lastWinningNumbers(i));
    }
    
    console.log("- Game Day actual:", currentGameDay.toString());
    console.log("- Total draws ejecutados:", totalDraws.toString());
    console.log("- Total reserves procesadas:", totalReserves.toString());
    console.log("- Números ganadores actuales:", `[${winningNumbers.join(', ')}]`);
    
    // Verificar información del día actual
    const dailyPoolInfo = await contract.getDailyPoolInfo(currentGameDay);
    console.log("\n🎫 INFORMACIÓN DEL DÍA ACTUAL:");
    console.log("- Total collected:", ethers.formatUnits(dailyPoolInfo[0], 6), "USDC");
    console.log("- Main pool portion:", ethers.formatUnits(dailyPoolInfo[1], 6), "USDC");
    console.log("- Reserve portion:", ethers.formatUnits(dailyPoolInfo[2], 6), "USDC");
    console.log("- Distributed:", dailyPoolInfo[3]);
    console.log("- Drawn:", dailyPoolInfo[4]);
    console.log("- Winning numbers del día:", `[${dailyPoolInfo[5].join(', ')}]`);
    
    // Si el día no está drawn, verificar el día anterior
    let targetGameDay = currentGameDay;
    if (!dailyPoolInfo[4]) {
        targetGameDay = currentGameDay - 1n;
        console.log("\n🔄 El día actual no está drawn, verificando día anterior:", targetGameDay.toString());
        
        const prevDailyInfo = await contract.getDailyPoolInfo(targetGameDay);
        console.log("DÍA ANTERIOR (", targetGameDay.toString(), "):");
        console.log("- Total collected:", ethers.formatUnits(prevDailyInfo[0], 6), "USDC");
        console.log("- Main pool portion:", ethers.formatUnits(prevDailyInfo[1], 6), "USDC");
        console.log("- Reserve portion:", ethers.formatUnits(prevDailyInfo[2], 6), "USDC");
        console.log("- Distributed:", prevDailyInfo[3]);
        console.log("- Drawn:", prevDailyInfo[4]);
        console.log("- Winning numbers:", `[${prevDailyInfo[5].join(', ')}]`);
    }
    
    // Obtener pools actuales
    const mainPools = await contract.getMainPoolBalances();
    const reservePools = await contract.getReserveBalances();
    
    console.log("\n💰 POOLS ACTUALES:");
    console.log("Main Pools:");
    console.log("  - First Prize:", ethers.formatUnits(mainPools[0], 6), "USDC");
    console.log("  - Second Prize:", ethers.formatUnits(mainPools[1], 6), "USDC");
    console.log("  - Third Prize:", ethers.formatUnits(mainPools[2], 6), "USDC");
    console.log("  - Development:", ethers.formatUnits(mainPools[3], 6), "USDC");
    
    console.log("Reserve Pools:");
    console.log("  - First Prize Reserve:", ethers.formatUnits(reservePools[0], 6), "USDC");
    console.log("  - Second Prize Reserve:", ethers.formatUnits(reservePools[1], 6), "USDC");
    console.log("  - Third Prize Reserve:", ethers.formatUnits(reservePools[2], 6), "USDC");
    
    // Obtener tickets del día y analizar ganadores
    const gameDayTickets = await contract.getGameDayTickets(currentGameDay);
    console.log("\n🎫 ANÁLISIS DE TICKETS DEL DÍA ACTUAL:");
    console.log("- Total tickets del día:", gameDayTickets.length);
    
    if (gameDayTickets.length > 0) {
        let winners = { first: 0, second: 0, third: 0, none: 0 };
        let winnerTickets = { first: [], second: [], third: [] };
        
        console.log("\n🔍 Analizando todos los tickets...");
        
        for (let i = 0; i < gameDayTickets.length; i++) {
            const ticketId = gameDayTickets[i];
            try {
                const ticketInfo = await contract.getFullTicketInfo(ticketId);
                const ticketNumbers = ticketInfo[1];
                const matches = ticketInfo[6];
                
                if (matches == 4) {
                    winners.first++;
                    winnerTickets.first.push({id: ticketId, numbers: ticketNumbers});
                } else if (matches == 3) {
                    winners.second++;
                    winnerTickets.second.push({id: ticketId, numbers: ticketNumbers});
                } else if (matches == 2) {
                    winners.third++;
                    winnerTickets.third.push({id: ticketId, numbers: ticketNumbers});
                } else {
                    winners.none++;
                }
                
                // Mostrar progreso cada 10 tickets
                if ((i + 1) % 10 === 0) {
                    console.log(`  Procesados ${i + 1}/${gameDayTickets.length} tickets...`);
                }
            } catch (error) {
                console.log(`  Error procesando ticket ${ticketId}:`, error.message);
            }
        }
        
        console.log("\n🏆 RESUMEN DE GANADORES:");
        console.log("🥇 Primer Premio (4 matches):", winners.first);
        console.log("🥈 Segundo Premio (3 matches):", winners.second);
        console.log("🥉 Tercer Premio (2 matches):", winners.third);
        console.log("❌ Sin premio:", winners.none);
        
        // Mostrar tickets ganadores
        if (winnerTickets.first.length > 0) {
            console.log("\n🥇 TICKETS GANADORES PRIMER PREMIO:");
            winnerTickets.first.forEach(ticket => {
                console.log(`  Ticket ${ticket.id}: [${ticket.numbers.join(', ')}]`);
            });
        }
        
        if (winnerTickets.second.length > 0) {
            console.log("\n🥈 TICKETS GANADORES SEGUNDO PREMIO:");
            winnerTickets.second.forEach(ticket => {
                console.log(`  Ticket ${ticket.id}: [${ticket.numbers.join(', ')}]`);
            });
        }
        
        if (winnerTickets.third.length > 0) {
            console.log("\n🥉 TICKETS GANADORES TERCER PREMIO:");
            winnerTickets.third.slice(0, 5).forEach(ticket => { // Solo mostrar primeros 5
                console.log(`  Ticket ${ticket.id}: [${ticket.numbers.join(', ')}]`);
            });
            if (winnerTickets.third.length > 5) {
                console.log(`  ... y ${winnerTickets.third.length - 5} tickets más`);
            }
        }
        
        // Calcular premios esperados
        console.log("\n💰 CÁLCULO DE DISTRIBUCIÓN ESPERADA:");
        const totalCollected = dailyPoolInfo[0];
        const mainPortion = (totalCollected * 80n) / 100n; // 80% main
        const reservePortion = (totalCollected * 20n) / 100n; // 20% reserve
        
        const expectedFirstPrize = (mainPortion * 80n) / 100n; // 80% of main
        const expectedSecondPrize = (mainPortion * 10n) / 100n; // 10% of main
        const expectedThirdPrize = (mainPortion * 5n) / 100n; // 5% of main
        const expectedDevelopment = (mainPortion * 5n) / 100n; // 5% of main
        
        console.log("Del total collected:", ethers.formatUnits(totalCollected, 6), "USDC");
        console.log("- Main portion (80%):", ethers.formatUnits(mainPortion, 6), "USDC");
        console.log("- Reserve portion (20%):", ethers.formatUnits(reservePortion, 6), "USDC");
        
        console.log("Distribución esperada del main portion:");
        console.log("- First Prize (80%):", ethers.formatUnits(expectedFirstPrize, 6), "USDC");
        console.log("- Second Prize (10%):", ethers.formatUnits(expectedSecondPrize, 6), "USDC");
        console.log("- Third Prize (5%):", ethers.formatUnits(expectedThirdPrize, 6), "USDC");
        console.log("- Development (5%):", ethers.formatUnits(expectedDevelopment, 6), "USDC");
        
        // Explicar qué debería pasar según los ganadores
        console.log("\n📊 LÓGICA DE DISTRIBUCIÓN:");
        if (winners.first === 0) {
            console.log("🥇 Sin ganadores primer premio → Se acumula en mainPools.firstPrizeAccumulated");
        } else {
            console.log("🥇 Con ganadores primer premio → Se puede reclamar inmediatamente");
        }
        
        if (winners.second === 0) {
            console.log("🥈 Sin ganadores segundo premio → Se acumula en mainPools.secondPrizeAccumulated");
        } else {
            console.log("🥈 Con ganadores segundo premio → Se puede reclamar inmediatamente");
        }
        
        if (winners.third === 0) {
            console.log("🥉 Sin ganadores tercer premio → Se acumula en mainPools.thirdPrizeAccumulated");
        } else {
            console.log("🥉 Con ganadores tercer premio → Se puede reclamar inmediatamente");
        }
    }
    
    // Verificar balance USDC del contrato
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const usdcABI = ["function balanceOf(address) view returns (uint256)"];
    const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcABI, signer);
    const contractUsdcBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    
    console.log("\n💳 BALANCE USDC DEL CONTRATO:");
    console.log("- Balance total:", ethers.formatUnits(contractUsdcBalance, 6), "USDC");
    
    // Verificar si el día necesita ser procesado manualmente
    if (!dailyPoolInfo[3] && dailyPoolInfo[4]) {
        console.log("\n⚠️ ATENCIÓN:");
        console.log("El día está 'drawn' pero no 'distributed'");
        console.log("Esto significa que el VRF ejecutó pero la distribución no se completó");
        console.log("Puede necesitar procesamiento manual o hay un problema en el contrato");
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("🔍 VERIFICACIÓN COMPLETADA");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error en el script:", error);
        process.exit(1);
    }); 