const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICANDO LÓGICA DE GANADORES V5");
    console.log("=".repeat(70));
    
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    // Obtener signer
    const [signer] = await ethers.getSigners();
    console.log("👤 Verificando con cuenta:", signer.address);
    
    // Conectar al contrato
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    // Mapeo de emojis para visualización
    const EMOJI_MAP = [
        '🎮', '🎲', '🎯', '🎸', '🎨', // Gaming & Art (0-4)
        '💎', '💰', '💸', '🏆', '🎁', // Money & Prizes (5-9)
        '🚀', '🌙', '⭐', '✨', '🌟', // Space & Stars (10-14)
        '🎭', '🎪', '🎢', '🎡', '🎠', // Entertainment (15-19)
        '🍀', '🌈', '⚡', '🔥', '💫'  // Luck & Magic (20-24)
    ];
    
    console.log("\n📋 ESTADO ACTUAL:");
    console.log("=".repeat(40));
    
    const currentGameDay = await contract.currentGameDay();
    const totalDraws = await contract.totalDrawsExecuted();
    
    // Obtener números ganadores actuales
    const winningNumbers = [];
    for (let i = 0; i < 4; i++) {
        winningNumbers.push(await contract.lastWinningNumbers(i));
    }
    
    console.log("- Game Day:", currentGameDay.toString());
    console.log("- Total draws:", totalDraws.toString());
    console.log("- Números ganadores:", `[${winningNumbers.join(', ')}]`);
    console.log("- Emojis ganadores:", winningNumbers.map(n => EMOJI_MAP[n]).join(' '));
    
    // Obtener tickets del día actual
    const gameDayTickets = await contract.getGameDayTickets(currentGameDay);
    console.log("- Total tickets del día:", gameDayTickets.length);
    
    console.log("\n🎯 VERIFICANDO LÓGICA DE COMPARACIÓN:");
    console.log("=".repeat(50));
    
    // Función para calcular matches manualmente
    function calculateMatches(ticketNumbers, winningNumbers) {
        let matches = 0;
        for (let i = 0; i < 4; i++) {
            if (ticketNumbers[i] === winningNumbers[i]) {
                matches++;
            }
        }
        return matches;
    }
    
    // Verificar algunos tickets específicos
    console.log("📊 ANÁLISIS DETALLADO DE TICKETS:");
    
    let totalAnalyzed = 0;
    let winners = { first: [], second: [], third: [], none: [] };
    let manualCount = { first: 0, second: 0, third: 0, none: 0 };
    let contractCount = { first: 0, second: 0, third: 0, none: 0 };
    
    for (let i = 0; i < gameDayTickets.length; i++) {
        const ticketId = gameDayTickets[i];
        
        try {
            const ticketInfo = await contract.getFullTicketInfo(ticketId);
            const ticketNumbers = ticketInfo[1].map(n => Number(n));
            const contractMatches = Number(ticketInfo[6]);
            
            // Calcular matches manualmente
            const manualMatches = calculateMatches(ticketNumbers, winningNumbers.map(n => Number(n)));
            
            // Verificar consistencia
            const consistent = manualMatches === contractMatches;
            
            const ticketData = {
                id: ticketId,
                numbers: ticketNumbers,
                emojis: ticketNumbers.map(n => EMOJI_MAP[n]),
                contractMatches,
                manualMatches,
                consistent,
                owner: ticketInfo[0]
            };
            
            // Clasificar por matches
            if (contractMatches === 4) {
                winners.first.push(ticketData);
                contractCount.first++;
            } else if (contractMatches === 3) {
                winners.second.push(ticketData);
                contractCount.second++;
            } else if (contractMatches === 2) {
                winners.third.push(ticketData);
                contractCount.third++;
            } else {
                winners.none.push(ticketData);
                contractCount.none++;
            }
            
            // Contar manual
            if (manualMatches === 4) manualCount.first++;
            else if (manualMatches === 3) manualCount.second++;
            else if (manualMatches === 2) manualCount.third++;
            else manualCount.none++;
            
            totalAnalyzed++;
            
            // Mostrar inconsistencias
            if (!consistent) {
                console.log(`❌ INCONSISTENCIA - Ticket ${ticketId}:`);
                console.log(`   Números: [${ticketNumbers.join(', ')}]`);
                console.log(`   Contrato: ${contractMatches} matches`);
                console.log(`   Manual: ${manualMatches} matches`);
            }
            
            // Mostrar progreso
            if ((i + 1) % 20 === 0) {
                console.log(`   Procesados ${i + 1}/${gameDayTickets.length} tickets...`);
            }
            
        } catch (error) {
            console.log(`❌ Error procesando ticket ${ticketId}:`, error.message);
        }
    }
    
    console.log("\n📊 RESUMEN DE VERIFICACIÓN:");
    console.log("=".repeat(40));
    console.log("Total tickets analizados:", totalAnalyzed);
    
    console.log("\nCONTEO DEL CONTRATO:");
    console.log("🥇 Primer Premio (4 matches):", contractCount.first);
    console.log("🥈 Segundo Premio (3 matches):", contractCount.second);
    console.log("🥉 Tercer Premio (2 matches):", contractCount.third);
    console.log("❌ Sin premio:", contractCount.none);
    
    console.log("\nCONTEO MANUAL:");
    console.log("🥇 Primer Premio (4 matches):", manualCount.first);
    console.log("🥈 Segundo Premio (3 matches):", manualCount.second);
    console.log("🥉 Tercer Premio (2 matches):", manualCount.third);
    console.log("❌ Sin premio:", manualCount.none);
    
    // Verificar consistencia total
    const totalConsistent = 
        contractCount.first === manualCount.first &&
        contractCount.second === manualCount.second &&
        contractCount.third === manualCount.third &&
        contractCount.none === manualCount.none;
    
    console.log("\n✅ CONSISTENCIA GENERAL:", totalConsistent ? "CORRECTA" : "❌ ERROR");
    
    // Mostrar ganadores detallados
    if (winners.first.length > 0) {
        console.log("\n🥇 GANADORES PRIMER PREMIO (4 matches):");
        winners.first.forEach(winner => {
            console.log(`   Ticket ${winner.id}: [${winner.numbers.join(', ')}] ${winner.emojis.join(' ')}`);
            console.log(`   Owner: ${winner.owner.slice(0, 8)}...`);
        });
    }
    
    if (winners.second.length > 0) {
        console.log("\n🥈 GANADORES SEGUNDO PREMIO (3 matches):");
        winners.second.forEach(winner => {
            console.log(`   Ticket ${winner.id}: [${winner.numbers.join(', ')}] ${winner.emojis.join(' ')}`);
            console.log(`   Owner: ${winner.owner.slice(0, 8)}...`);
        });
    }
    
    if (winners.third.length > 0) {
        console.log("\n🥉 GANADORES TERCER PREMIO (2 matches):");
        winners.third.slice(0, 10).forEach(winner => { // Solo mostrar primeros 10
            console.log(`   Ticket ${winner.id}: [${winner.numbers.join(', ')}] ${winner.emojis.join(' ')}`);
            console.log(`   Owner: ${winner.owner.slice(0, 8)}...`);
        });
        if (winners.third.length > 10) {
            console.log(`   ... y ${winners.third.length - 10} ganadores más`);
        }
    }
    
    // Verificar lógica de comparación específica
    console.log("\n🔍 VERIFICACIÓN DETALLADA DE COMPARACIÓN:");
    console.log("=".repeat(50));
    console.log("Números ganadores:", `[${winningNumbers.join(', ')}]`);
    console.log("Emojis ganadores: ", winningNumbers.map(n => EMOJI_MAP[n]).join(' '));
    
    // Tomar algunos tickets de ejemplo para verificar posición por posición
    const sampleTickets = gameDayTickets.slice(0, 5);
    console.log("\nEJEMPLOS DE COMPARACIÓN POSICIÓN POR POSICIÓN:");
    
    for (let i = 0; i < sampleTickets.length; i++) {
        const ticketId = sampleTickets[i];
        const ticketInfo = await contract.getFullTicketInfo(ticketId);
        const ticketNumbers = ticketInfo[1].map(n => Number(n));
        const contractMatches = Number(ticketInfo[6]);
        
        console.log(`\nTicket ${ticketId}: [${ticketNumbers.join(', ')}]`);
        console.log(`Emojis: ${ticketNumbers.map(n => EMOJI_MAP[n]).join(' ')}`);
        
        let positionMatches = [];
        for (let j = 0; j < 4; j++) {
            const match = ticketNumbers[j] === Number(winningNumbers[j]);
            positionMatches.push(match);
            console.log(`   Pos ${j}: ${ticketNumbers[j]} vs ${winningNumbers[j]} = ${match ? '✅' : '❌'}`);
        }
        
        const manualTotal = positionMatches.filter(m => m).length;
        console.log(`   Total matches: ${manualTotal} (contrato: ${contractMatches})`);
        
        if (manualTotal !== contractMatches) {
            console.log(`   ❌ DISCREPANCIA DETECTADA!`);
        }
    }
    
    // Verificar función de cálculo de premios
    console.log("\n💰 VERIFICACIÓN DE CÁLCULO DE PREMIOS:");
    console.log("=".repeat(45));
    
    const dailyPoolInfo = await contract.getDailyPoolInfo(currentGameDay);
    const mainPools = await contract.getMainPoolBalances();
    
    console.log("Pools del día actual:");
    console.log("- Total collected:", ethers.formatUnits(dailyPoolInfo[0], 6), "USDC");
    console.log("- Main portion:", ethers.formatUnits(dailyPoolInfo[1], 6), "USDC");
    
    // Calcular distribución esperada
    const mainPortion = dailyPoolInfo[1];
    const expectedFirst = (mainPortion * 80n) / 100n;
    const expectedSecond = (mainPortion * 10n) / 100n;
    const expectedThird = (mainPortion * 5n) / 100n;
    
    console.log("\nDistribución esperada por día:");
    console.log("- First Prize:", ethers.formatUnits(expectedFirst, 6), "USDC");
    console.log("- Second Prize:", ethers.formatUnits(expectedSecond, 6), "USDC");
    console.log("- Third Prize:", ethers.formatUnits(expectedThird, 6), "USDC");
    
    console.log("\nPools acumuladas:");
    console.log("- First Accumulated:", ethers.formatUnits(mainPools[0], 6), "USDC");
    console.log("- Second Accumulated:", ethers.formatUnits(mainPools[1], 6), "USDC");
    console.log("- Third Accumulated:", ethers.formatUnits(mainPools[2], 6), "USDC");
    
    // Verificar premios para ganadores
    if (winners.third.length > 0) {
        console.log("\n🎁 VERIFICANDO PREMIOS PARA GANADORES:");
        const winnerTicket = winners.third[0];
        
        try {
            // Simular cálculo de premio
            const expectedPrize = expectedThird + mainPools[2]; // daily + accumulated
            console.log(`Ticket ${winnerTicket.id} debería recibir:`);
            console.log(`- Daily portion: ${ethers.formatUnits(expectedThird, 6)} USDC`);
            console.log(`- Accumulated: ${ethers.formatUnits(mainPools[2], 6)} USDC`);
            console.log(`- Total esperado: ${ethers.formatUnits(expectedPrize, 6)} USDC`);
            
        } catch (error) {
            console.log("Error calculando premio:", error.message);
        }
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("🔍 VERIFICACIÓN DE LÓGICA COMPLETADA");
    
    if (totalConsistent) {
        console.log("✅ La lógica de comparación funciona CORRECTAMENTE");
    } else {
        console.log("❌ Se detectaron INCONSISTENCIAS en la lógica");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error en el script:", error);
        process.exit(1);
    }); 