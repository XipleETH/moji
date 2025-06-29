const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 INVESTIGANDO SORTEO RECIENTE Y DISTRIBUCIÓN DE POOLS");
    console.log("======================================================");
    
    const CONTRACT_ADDRESS = "0x900ebdF6C0807E4d3007e07009BDeDFc5E63fbB1";
    
    const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("⏰ VERIFICANDO ESTADO ACTUAL...");
    
    // Obtener datos básicos
    const currentGameDay = await contract.getCurrentDay();
    const lastDrawTime = await contract.lastDrawTime();
    const drawInterval = await contract.DRAW_INTERVAL();
    const totalDraws = await contract.totalDrawsExecuted();
    const ticketCounter = await contract.ticketCounter();
    
    const now = Math.floor(Date.now() / 1000);
    const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
    const timeSinceLastDraw = now - Number(lastDrawTime);
    const timeToNextDraw = nextDrawTime - now;
    
    console.log("\n📊 ESTADO GENERAL:");
    console.log("- Game Day actual:", currentGameDay.toString());
    console.log("- Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
    console.log("- Tiempo desde último sorteo:", Math.floor(timeSinceLastDraw / 60), "minutos");
    console.log("- Próximo sorteo:", new Date(nextDrawTime * 1000).toISOString());
    console.log("- Tiempo hasta próximo:", Math.floor(timeToNextDraw / 60), "minutos");
    console.log("- Total sorteos ejecutados:", totalDraws.toString());
    console.log("- Total tickets:", ticketCounter.toString());
    
    // Obtener pools principales
    console.log("\n💰 MAIN POOLS (ACUMULADOS):");
    const mainPools = await contract.getMainPoolBalances();
    console.log("- 🥇 First Prize Pool:", ethers.formatUnits(mainPools[0], 6), "USDC");
    console.log("- 🥈 Second Prize Pool:", ethers.formatUnits(mainPools[1], 6), "USDC");
    console.log("- 🥉 Third Prize Pool:", ethers.formatUnits(mainPools[2], 6), "USDC");
    console.log("- 🔧 Development Pool:", ethers.formatUnits(mainPools[3], 6), "USDC");
    
    const totalMainPools = mainPools[0] + mainPools[1] + mainPools[2] + mainPools[3];
    console.log("- 📊 TOTAL MAIN POOLS:", ethers.formatUnits(totalMainPools, 6), "USDC");
    
    // Obtener pools de reserva
    console.log("\n🏦 RESERVE POOLS:");
    const reserves = await contract.getReserveBalances();
    console.log("- 🥇 First Prize Reserve:", ethers.formatUnits(reserves[0], 6), "USDC");
    console.log("- 🥈 Second Prize Reserve:", ethers.formatUnits(reserves[1], 6), "USDC");
    console.log("- 🥉 Third Prize Reserve:", ethers.formatUnits(reserves[2], 6), "USDC");
    
    const totalReserves = reserves[0] + reserves[1] + reserves[2];
    console.log("- 📊 TOTAL RESERVES:", ethers.formatUnits(totalReserves, 6), "USDC");
    
    // Obtener pool del día actual
    console.log("\n📅 TODAY'S POOL (DIA " + currentGameDay + "):");
    const todayPool = await contract.getDailyPoolInfo(currentGameDay);
    console.log("- 💵 Total recolectado hoy:", ethers.formatUnits(todayPool[0], 6), "USDC");
    console.log("- 🏆 Main pool portion (80%):", ethers.formatUnits(todayPool[1], 6), "USDC");
    console.log("- 🏦 Reserve portion (20%):", ethers.formatUnits(todayPool[2], 6), "USDC");
    console.log("- ✅ Distribuido:", todayPool[3] ? "SÍ" : "NO");
    console.log("- 🎲 Sorteado:", todayPool[4] ? "SÍ" : "NO");
    
    if (todayPool[4]) {
        console.log("- 🎯 Números ganadores:", Array.from(todayPool[5]).join(", "));
        
        // Mapeo de emojis
        const EMOJI_MAP = [
            "🎮", "🎲", "🎯", "🎸", "🎨",
            "💎", "💰", "💸", "🏆", "🎁", 
            "🚀", "🌙", "⭐", "✨", "🌟",
            "🎭", "🎪", "🎢", "🎡", "🎠",
            "🍀", "🌈", "⚡", "🔥", "💫"
        ];
        
        const winningEmojis = Array.from(todayPool[5]).map(num => EMOJI_MAP[num]).join(" ");
        console.log("- 😀 Emojis ganadores:", winningEmojis);
        
        // Analizar ganadores
        const dayTickets = await contract.getGameDayTickets(currentGameDay);
        console.log("- 🎫 Total tickets del día:", dayTickets.length);
        
        if (dayTickets.length > 0) {
            let firstPrizeWinners = 0;
            let secondPrizeWinners = 0;
            let thirdPrizeWinners = 0;
            let freeTicketWinners = 0;
            
            console.log("\n🔍 VERIFICANDO TICKETS...");
            
            // Analizar tickets para ver ganadores
            const ticketsToCheck = Math.min(10, dayTickets.length);
            for (let i = 0; i < ticketsToCheck; i++) {
                const ticketId = dayTickets[i];
                try {
                    const ticketDetails = await contract.getTicketPrizeDetails(ticketId);
                    const prizeLevel = ticketDetails[0];
                    const exactMatches = ticketDetails[1];
                    const anyOrderMatches = ticketDetails[2];
                    const prizeAmount = ticketDetails[3];
                    const description = ticketDetails[4];
                    
                    if (prizeLevel > 0) {
                        console.log(`🎫 Ticket ${ticketId}: ${description} - ${ethers.formatUnits(prizeAmount, 6)} USDC`);
                        
                        if (prizeLevel === 1) firstPrizeWinners++;
                        else if (prizeLevel === 2) secondPrizeWinners++;
                        else if (prizeLevel === 3) thirdPrizeWinners++;
                        else if (prizeLevel === 4) freeTicketWinners++;
                    }
                } catch (error) {
                    console.log(`⚠️ Error verificando ticket ${ticketId}`);
                }
            }
            
            if (ticketsToCheck < dayTickets.length) {
                console.log(`... (revisando solo ${ticketsToCheck} de ${dayTickets.length} tickets)`);
            }
            
            console.log("\n📊 RESUMEN DE GANADORES:");
            console.log("- 🥇 First Prize (4 exactos):", firstPrizeWinners);
            console.log("- 🥈 Second Prize (4 cualquier orden):", secondPrizeWinners);
            console.log("- 🥉 Third Prize (3 exactos):", thirdPrizeWinners);
            console.log("- 🎫 Free Tickets (3 cualquier orden):", freeTicketWinners);
            
            // Explicar qué pasó con las pools
            console.log("\n💡 QUÉ PASÓ CON EL DINERO:");
            console.log("------------------------------");
            
            if (firstPrizeWinners === 0) {
                console.log("🥇 First Prize: NO HAY GANADORES → Dinero se acumula en main pool");
            } else {
                console.log("🥇 First Prize: HAY GANADORES → Pueden reclamar el pool acumulado");
            }
            
            if (secondPrizeWinners === 0) {
                console.log("🥈 Second Prize: NO HAY GANADORES → Dinero se acumula en main pool");
            } else {
                console.log("🥈 Second Prize: HAY GANADORES → Pueden reclamar el pool acumulado");
            }
            
            if (thirdPrizeWinners === 0) {
                console.log("🥉 Third Prize: NO HAY GANADORES → Dinero se acumula en main pool");
            } else {
                console.log("🥉 Third Prize: HAY GANADORES → Pueden reclamar el pool acumulado");
            }
        }
        
    } else {
        console.log("- ⚠️ Aún no se han sorteado números");
    }
    
    // Balance total del contrato
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    const usdcABI = ["function balanceOf(address) view returns (uint256)"];
    const usdc = new ethers.Contract(USDC_ADDRESS, usdcABI, ethers.provider);
    const contractBalance = await usdc.balanceOf(CONTRACT_ADDRESS);
    
    console.log("\n💰 BALANCE TOTAL DEL CONTRATO:");
    console.log("- USDC en contrato:", ethers.formatUnits(contractBalance, 6), "USDC");
    console.log("- Main pools teórico:", ethers.formatUnits(totalMainPools, 6), "USDC");
    console.log("- Reserves teórico:", ethers.formatUnits(totalReserves, 6), "USDC");
    console.log("- Today's pool:", ethers.formatUnits(todayPool[0], 6), "USDC");
    
    const totalAccounted = totalMainPools + totalReserves + todayPool[0];
    console.log("- Total contabilizado:", ethers.formatUnits(totalAccounted, 6), "USDC");
    console.log("- Diferencia:", ethers.formatUnits(contractBalance - totalAccounted, 6), "USDC");
    
    console.log("\n============================================================");
    console.log("🎯 INVESTIGACIÓN COMPLETADA");
    console.log("📊 Contrato con sorteos horarios funcionando");
    console.log("============================================================");
}

main().catch(console.error); 