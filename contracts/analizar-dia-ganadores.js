const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 ANÁLISIS DETALLADO DEL DÍA CON TICKETS");
    console.log("=========================================");
    
    const CONTRACT_ADDRESS = "0x900ebdF6C0807E4d3007e07009BDeDFc5E63fbB1";
    const TARGET_DAY = 486470; // Día donde están los 201 tickets
    
    const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("📅 Analizando día:", TARGET_DAY);
    
    // Información del día específico
    const dayPool = await contract.getDailyPoolInfo(TARGET_DAY);
    const dayTickets = await contract.getGameDayTickets(TARGET_DAY);
    
    console.log("\n📊 INFORMACIÓN DEL DÍA", TARGET_DAY + ":");
    console.log("- Total recolectado:", ethers.formatUnits(dayPool[0], 6), "USDC");
    console.log("- Main pool portion (80%):", ethers.formatUnits(dayPool[1], 6), "USDC");
    console.log("- Reserve portion (20%):", ethers.formatUnits(dayPool[2], 6), "USDC");
    console.log("- Distribuido:", dayPool[3] ? "✅ SÍ" : "❌ NO");
    console.log("- Sorteado:", dayPool[4] ? "✅ SÍ" : "❌ NO");
    console.log("- Total tickets:", dayTickets.length);
    
    if (dayPool[4]) {
        const winningNumbers = Array.from(dayPool[5]);
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
        
        // Contadores de ganadores
        let firstPrizeWinners = 0;
        let secondPrizeWinners = 0;
        let thirdPrizeWinners = 0;
        let freeTicketWinners = 0;
        let totalWinners = 0;
        
        const winners = {
            first: [],
            second: [],
            third: [],
            free: []
        };
        
        console.log("\n🔍 ANALIZANDO LOS", dayTickets.length, "TICKETS...");
        console.log("(Esto puede tomar un momento...)");
        
        // Analizar en lotes para mejor rendimiento
        const batchSize = 50;
        for (let i = 0; i < dayTickets.length; i += batchSize) {
            const batch = dayTickets.slice(i, Math.min(i + batchSize, dayTickets.length));
            console.log(`📊 Procesando tickets ${i + 1} - ${Math.min(i + batchSize, dayTickets.length)}...`);
            
            for (const ticketId of batch) {
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
                        const owner = ticketInfo[0];
                        
                        const winnerData = {
                            ticketId: ticketId,
                            owner: owner,
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
                        
                        // Mostrar ganador inmediatamente
                        const ticketEmojis = ticketNumbers.map(num => EMOJI_MAP[num]).join(" ");
                        console.log(`🎫 ¡GANADOR! Ticket ${ticketId}: ${ticketEmojis}`);
                        console.log(`   ${description} → ${ethers.formatUnits(prizeAmount, 6)} USDC`);
                        console.log(`   Propietario: ${owner}`);
                    }
                } catch (error) {
                    console.log(`⚠️ Error analizando ticket ${ticketId}:`, error.message);
                }
            }
        }
        
        console.log("\n🏆 RESUMEN FINAL DE GANADORES:");
        console.log("==============================");
        console.log("- 🥇 First Prize (4 emojis exactos):", firstPrizeWinners);
        console.log("- 🥈 Second Prize (4 emojis cualquier orden):", secondPrizeWinners);
        console.log("- 🥉 Third Prize (3 emojis exactos):", thirdPrizeWinners);
        console.log("- 🎫 Free Tickets (3 emojis cualquier orden):", freeTicketWinners);
        console.log("- 📊 Total ganadores:", totalWinners);
        console.log("- 📉 Tickets sin premio:", dayTickets.length - totalWinners);
        
        // Calcular premios totales
        let totalPrizesPending = BigInt(0);
        
        [...winners.first, ...winners.second, ...winners.third, ...winners.free].forEach(winner => {
            totalPrizesPending += winner.prizeAmount;
        });
        
        console.log("- 💰 Total premios por reclamar:", ethers.formatUnits(totalPrizesPending, 6), "USDC");
        
        // Mostrar detalles por categoría
        if (winners.first.length > 0) {
            console.log("\n🥇 DETALLES DE FIRST PRIZE WINNERS:");
            winners.first.forEach((winner, index) => {
                const winnerEmojis = winner.numbers.map(num => EMOJI_MAP[num]).join(" ");
                console.log(`  ${index + 1}. Ticket ${winner.ticketId}: ${winnerEmojis}`);
                console.log(`     → ${ethers.formatUnits(winner.prizeAmount, 6)} USDC`);
                console.log(`     → Owner: ${winner.owner}`);
            });
        }
        
        if (winners.second.length > 0) {
            console.log("\n🥈 DETALLES DE SECOND PRIZE WINNERS:");
            winners.second.forEach((winner, index) => {
                const winnerEmojis = winner.numbers.map(num => EMOJI_MAP[num]).join(" ");
                console.log(`  ${index + 1}. Ticket ${winner.ticketId}: ${winnerEmojis}`);
                console.log(`     → ${ethers.formatUnits(winner.prizeAmount, 6)} USDC`);
                console.log(`     → Owner: ${winner.owner}`);
            });
        }
        
        if (winners.third.length > 0) {
            console.log("\n🥉 DETALLES DE THIRD PRIZE WINNERS:");
            winners.third.forEach((winner, index) => {
                const winnerEmojis = winner.numbers.map(num => EMOJI_MAP[num]).join(" ");
                console.log(`  ${index + 1}. Ticket ${winner.ticketId}: ${winnerEmojis}`);
                console.log(`     → ${ethers.formatUnits(winner.prizeAmount, 6)} USDC`);
                console.log(`     → Owner: ${winner.owner}`);
            });
        }
        
        if (winners.free.length > 0) {
            console.log("\n🎫 DETALLES DE FREE TICKET WINNERS:");
            winners.free.slice(0, 10).forEach((winner, index) => { // Mostrar solo primeros 10
                const winnerEmojis = winner.numbers.map(num => EMOJI_MAP[num]).join(" ");
                console.log(`  ${index + 1}. Ticket ${winner.ticketId}: ${winnerEmojis}`);
                console.log(`     → ${ethers.formatUnits(winner.prizeAmount, 6)} USDC`);
            });
            if (winners.free.length > 10) {
                console.log(`  ... y ${winners.free.length - 10} ganadores más de free tickets`);
            }
        }
        
        // Análisis de la distribución del dinero
        console.log("\n💡 QUÉ PASÓ CON EL DINERO DE ESTE DÍA:");
        console.log("======================================");
        
        console.log("📊 DISTRIBUCIÓN ORIGINAL:");
        console.log("- Total recolectado:", ethers.formatUnits(dayPool[0], 6), "USDC");
        console.log("- Para main pools (80%):", ethers.formatUnits(dayPool[1], 6), "USDC");
        console.log("- Para reserves (20%):", ethers.formatUnits(dayPool[2], 6), "USDC");
        
        console.log("\n🎯 RESULTADO DEL SORTEO:");
        if (firstPrizeWinners === 0) {
            console.log("🥇 First Prize: ❌ NO HAY GANADORES → Dinero acumulado en main pool");
        } else {
            console.log(`🥇 First Prize: ✅ ${firstPrizeWinners} GANADORES → Pueden reclamar premios`);
        }
        
        if (secondPrizeWinners === 0) {
            console.log("🥈 Second Prize: ❌ NO HAY GANADORES → Dinero acumulado en main pool");
        } else {
            console.log(`🥈 Second Prize: ✅ ${secondPrizeWinners} GANADORES → Pueden reclamar premios`);
        }
        
        if (thirdPrizeWinners === 0) {
            console.log("🥉 Third Prize: ❌ NO HAY GANADORES → Dinero acumulado en main pool");
        } else {
            console.log(`🥉 Third Prize: ✅ ${thirdPrizeWinners} GANADORES → Pueden reclamar premios`);
        }
        
        console.log("🔧 Development: ✅ SIEMPRE pagado automáticamente");
        console.log("🏦 Reserves: ✅ 20% enviado a pools de reserva");
        
    } else {
        console.log("⚠️ Este día aún no ha sido sorteado");
    }
    
    console.log("\n=========================================");
    console.log("🎯 ANÁLISIS DETALLADO COMPLETADO");
    console.log("📊 Día", TARGET_DAY, "con", dayTickets.length, "tickets analizado");
    console.log("=========================================");
}

main().catch(console.error); 