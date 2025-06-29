const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 ANÁLISIS COMPLETO DEL SORTEO RECIENTE");
    console.log("==========================================");
    
    const CONTRACT_ADDRESS = "0x900ebdF6C0807E4d3007e07009BDeDFc5E63fbB1";
    
    const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
    
    // Obtener datos básicos
    const currentGameDay = await contract.getCurrentDay();
    const lastDrawTime = await contract.lastDrawTime();
    const totalDraws = await contract.totalDrawsExecuted();
    const ticketCounter = await contract.ticketCounter();
    
    console.log("📊 ESTADO GENERAL:");
    console.log("- Game Day actual:", currentGameDay.toString());
    console.log("- Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
    console.log("- Total sorteos ejecutados:", totalDraws.toString());
    console.log("- Total tickets vendidos:", ticketCounter.toString());
    
    // Información del sorteo reciente
    const todayPool = await contract.getDailyPoolInfo(currentGameDay);
    
    // Declarar variables de ganadores fuera del bloque if
    let firstPrizeWinners = 0;
    let secondPrizeWinners = 0;
    let thirdPrizeWinners = 0;
    let freeTicketWinners = 0;
    let totalWinners = 0;
    
    console.log("\n🎲 ÚLTIMO SORTEO (DÍA " + currentGameDay + "):");
    console.log("- Sorteado:", todayPool[4] ? "✅ SÍ" : "❌ NO");
    
    if (todayPool[4]) {
        const winningNumbers = Array.from(todayPool[5]);
        console.log("- 🎯 Números ganadores:", winningNumbers.join(", "));
        
        // Mapeo de emojis
        const EMOJI_MAP = [
            "🎮", "🎲", "🎯", "🎸", "🎨",
            "💎", "💰", "💸", "🏆", "🎁", 
            "🚀", "🌙", "⭐", "✨", "🌟",
            "🎭", "🎪", "🎢", "🎡", "🎠",
            "🍀", "🌈", "⚡", "🔥", "💫"
        ];
        
        const winningEmojis = winningNumbers.map(num => EMOJI_MAP[num]).join(" ");
        console.log("- 😀 Emojis ganadores:", winningEmojis);
        
        // Analizar tickets del día
        const dayTickets = await contract.getGameDayTickets(currentGameDay);
        console.log("- 🎫 Total tickets del día:", dayTickets.length);
        
        const winners = {
            first: [],
            second: [],
            third: [],
            free: []
        };
        
        console.log("\n🔍 ANALIZANDO TODOS LOS TICKETS DEL DÍA...");
        
        for (let i = 0; i < dayTickets.length; i++) {
            const ticketId = dayTickets[i];
            try {
                const ticketDetails = await contract.getTicketPrizeDetails(ticketId);
                const prizeLevel = ticketDetails[0];
                const exactMatches = ticketDetails[1];
                const anyOrderMatches = ticketDetails[2];
                const prizeAmount = ticketDetails[3];
                const description = ticketDetails[4];
                
                if (prizeLevel > 0) {
                    totalWinners++;
                    const ticketInfo = await contract.getFullTicketInfo(ticketId);
                    const ticketNumbers = Array.from(ticketInfo[1]);
                    
                    const winnerData = {
                        ticketId: ticketId,
                        owner: ticketInfo[0],
                        numbers: ticketNumbers,
                        exactMatches: exactMatches,
                        anyOrderMatches: anyOrderMatches,
                        prizeAmount: prizeAmount,
                        description: description
                    };
                    
                    if (prizeLevel === 1) {
                        firstPrizeWinners++;
                        winners.first.push(winnerData);
                    } else if (prizeLevel === 2) {
                        secondPrizeWinners++;
                        winners.second.push(winnerData);
                    } else if (prizeLevel === 3) {
                        thirdPrizeWinners++;
                        winners.third.push(winnerData);
                    } else if (prizeLevel === 4) {
                        freeTicketWinners++;
                        winners.free.push(winnerData);
                    }
                }
            } catch (error) {
                console.log(`⚠️ Error analizando ticket ${ticketId}:`, error.message);
            }
        }
        
        console.log("\n🏆 RESUMEN DE GANADORES:");
        console.log("- 🥇 First Prize (4 emojis exactos):", firstPrizeWinners);
        console.log("- 🥈 Second Prize (4 emojis cualquier orden):", secondPrizeWinners);
        console.log("- 🥉 Third Prize (3 emojis exactos):", thirdPrizeWinners);
        console.log("- 🎫 Free Tickets (3 emojis cualquier orden):", freeTicketWinners);
        console.log("- 📊 Total ganadores:", totalWinners);
        
        // Mostrar detalles de ganadores
        if (winners.first.length > 0) {
            console.log("\n🥇 GANADORES DE FIRST PRIZE:");
            winners.first.forEach(winner => {
                const winnerEmojis = winner.numbers.map(num => EMOJI_MAP[num]).join(" ");
                console.log(`  Ticket ${winner.ticketId}: ${winnerEmojis} → ${ethers.formatUnits(winner.prizeAmount, 6)} USDC`);
            });
        }
        
        if (winners.second.length > 0) {
            console.log("\n🥈 GANADORES DE SECOND PRIZE:");
            winners.second.forEach(winner => {
                const winnerEmojis = winner.numbers.map(num => EMOJI_MAP[num]).join(" ");
                console.log(`  Ticket ${winner.ticketId}: ${winnerEmojis} → ${ethers.formatUnits(winner.prizeAmount, 6)} USDC`);
            });
        }
        
        if (winners.third.length > 0) {
            console.log("\n🥉 GANADORES DE THIRD PRIZE:");
            winners.third.forEach(winner => {
                const winnerEmojis = winner.numbers.map(num => EMOJI_MAP[num]).join(" ");
                console.log(`  Ticket ${winner.ticketId}: ${winnerEmojis} → ${ethers.formatUnits(winner.prizeAmount, 6)} USDC`);
            });
        }
        
        if (winners.free.length > 0) {
            console.log("\n🎫 GANADORES DE FREE TICKETS:");
            winners.free.forEach(winner => {
                const winnerEmojis = winner.numbers.map(num => EMOJI_MAP[num]).join(" ");
                console.log(`  Ticket ${winner.ticketId}: ${winnerEmojis} → ${ethers.formatUnits(winner.prizeAmount, 6)} USDC`);
            });
        }
        
    } else {
        console.log("⚠️ No se han sorteado números para este día");
    }
    
    // Análisis de las pools
    console.log("\n💰 ANÁLISIS DE POOLS DESPUÉS DEL SORTEO:");
    console.log("==========================================");
    
    const mainPools = await contract.getMainPoolBalances();
    const reserves = await contract.getReserveBalances();
    
    console.log("📊 MAIN POOLS (ACUMULADOS):");
    console.log("- 🥇 First Prize Pool:", ethers.formatUnits(mainPools[0], 6), "USDC");
    console.log("- 🥈 Second Prize Pool:", ethers.formatUnits(mainPools[1], 6), "USDC");
    console.log("- 🥉 Third Prize Pool:", ethers.formatUnits(mainPools[2], 6), "USDC");
    console.log("- 🔧 Development Pool:", ethers.formatUnits(mainPools[3], 6), "USDC");
    
    console.log("\n🏦 RESERVE POOLS:");
    console.log("- 🥇 First Prize Reserve:", ethers.formatUnits(reserves[0], 6), "USDC");
    console.log("- 🥈 Second Prize Reserve:", ethers.formatUnits(reserves[1], 6), "USDC");
    console.log("- 🥉 Third Prize Reserve:", ethers.formatUnits(reserves[2], 6), "USDC");
    
    // Análisis de la distribución del dinero
    console.log("\n💡 QUÉ PASÓ CON EL DINERO:");
    console.log("==========================");
    
    console.log("📈 POOLS DEL DÍA:");
    console.log("- Total recolectado:", ethers.formatUnits(todayPool[0], 6), "USDC");
    console.log("- Main pool portion (80%):", ethers.formatUnits(todayPool[1], 6), "USDC");
    console.log("- Reserve portion (20%):", ethers.formatUnits(todayPool[2], 6), "USDC");
    console.log("- Distribuido:", todayPool[3] ? "✅ SÍ" : "❌ NO");
    
    console.log("\n🎯 DISTRIBUCIÓN SEGÚN GANADORES:");
    
    if (firstPrizeWinners === 0) {
        console.log("🥇 First Prize: ❌ NO HAY GANADORES");
        console.log("   → El dinero se ACUMULA en main pool para futuros sorteos");
    } else {
        console.log("🥇 First Prize: ✅ HAY", firstPrizeWinners, "GANADORES");
        console.log("   → Los ganadores pueden RECLAMAR el pool acumulado");
    }
    
    if (secondPrizeWinners === 0) {
        console.log("🥈 Second Prize: ❌ NO HAY GANADORES");
        console.log("   → El dinero se ACUMULA en main pool para futuros sorteos");
    } else {
        console.log("🥈 Second Prize: ✅ HAY", secondPrizeWinners, "GANADORES");
        console.log("   → Los ganadores pueden RECLAMAR el pool acumulado");
    }
    
    if (thirdPrizeWinners === 0) {
        console.log("🥉 Third Prize: ❌ NO HAY GANADORES");
        console.log("   → El dinero se ACUMULA en main pool para futuros sorteos");
    } else {
        console.log("🥉 Third Prize: ✅ HAY", thirdPrizeWinners, "GANADORES");
        console.log("   → Los ganadores pueden RECLAMAR el pool acumulado");
    }
    
    console.log("🔧 Development: ✅ SIEMPRE se paga");
    console.log("   → El 5% va al development pool automáticamente");
    
    // Balance total
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    const usdcABI = ["function balanceOf(address) view returns (uint256)"];
    const usdc = new ethers.Contract(USDC_ADDRESS, usdcABI, ethers.provider);
    const contractBalance = await usdc.balanceOf(CONTRACT_ADDRESS);
    
    console.log("\n💰 BALANCE TOTAL DEL CONTRATO:");
    console.log("- USDC en contrato:", ethers.formatUnits(contractBalance, 6), "USDC");
    
    const totalMainPools = mainPools[0] + mainPools[1] + mainPools[2] + mainPools[3];
    const totalReserves = reserves[0] + reserves[1] + reserves[2];
    const totalAccounted = totalMainPools + totalReserves + todayPool[0];
    
    console.log("- Main pools:", ethers.formatUnits(totalMainPools, 6), "USDC");
    console.log("- Reserves:", ethers.formatUnits(totalReserves, 6), "USDC");
    console.log("- Today's pool:", ethers.formatUnits(todayPool[0], 6), "USDC");
    console.log("- Total contabilizado:", ethers.formatUnits(totalAccounted, 6), "USDC");
    console.log("- Diferencia:", ethers.formatUnits(contractBalance - totalAccounted, 6), "USDC");
    
    // IMPORTANTE: Verificar tickets de días anteriores que podrían tener ganadores
    console.log("\n🔍 VERIFICANDO DÍAS ANTERIORES...");
    const currentDayNum = Number(currentGameDay);
    
    for (let day = currentDayNum - 2; day < currentDayNum; day++) {
        try {
            const dayPool = await contract.getDailyPoolInfo(day);
            const dayTickets = await contract.getGameDayTickets(day);
            
            if (dayTickets.length > 0 && dayPool[4]) {
                console.log(`\n📅 DÍA ${day} (${dayTickets.length} tickets):`);
                console.log("- Total recolectado:", ethers.formatUnits(dayPool[0], 6), "USDC");
                console.log("- Números ganadores:", Array.from(dayPool[5]).join(", "));
                
                // Este es donde probablemente están los 100 tickets que compramos
                if (dayTickets.length >= 100) {
                    console.log("🎯 ESTE PODRÍA SER EL DÍA CON LOS 100 TICKETS COMPRADOS");
                }
            }
        } catch (error) {
            console.log(`⚠️ Error verificando día ${day}`);
        }
    }
    
    console.log("\n==========================================");
    console.log("🎯 ANÁLISIS COMPLETADO");
    console.log("📊 Sorteo horario funcionando correctamente");
    console.log("💎 Próximo sorteo: cada hora");
    console.log("==========================================");
}

main().catch(console.error); 