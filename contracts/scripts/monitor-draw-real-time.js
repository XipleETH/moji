const { ethers } = require("hardhat");

async function main() {
    console.log("👁️  MONITOR EN TIEMPO REAL DEL SORTEO");
    console.log("=".repeat(60));
    
    // Dirección del contrato V5
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    // Conectar al contrato
    const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("⏰ Hora objetivo: 18:20 UTC");
    console.log("🔄 Verificando cada 30 segundos...");
    
    // Estado inicial
    let initialDrawsExecuted = await contract.totalDrawsExecuted();
    let initialGameDay = await contract.getCurrentDay();
    
    console.log("\n📊 ESTADO INICIAL:");
    console.log("🎲 Total draws ejecutados:", initialDrawsExecuted.toString());
    console.log("📅 Game Day actual:", initialGameDay.toString());
    
    // Función para verificar estado
    async function checkStatus() {
        try {
            const now = new Date();
            const currentDrawsExecuted = await contract.totalDrawsExecuted();
            const currentGameDay = await contract.getCurrentDay();
            const lastDrawTime = await contract.lastDrawTime();
            const nextDrawTime = Number(lastDrawTime) + (24 * 3600);
            const nextDrawDate = new Date(nextDrawTime * 1000);
            const minutesUntilDraw = Math.round((nextDrawTime - Math.floor(now.getTime() / 1000)) / 60);
            
            console.log(`\n⏰ ${now.toISOString()}`);
            console.log("🎲 Total draws:", currentDrawsExecuted.toString());
            console.log("📅 Game Day:", currentGameDay.toString());
            console.log("⏳ Próximo sorteo en:", minutesUntilDraw, "minutos");
            
            // Verificar si cambió el número de draws (significa que hubo sorteo)
            if (currentDrawsExecuted > initialDrawsExecuted) {
                console.log("\n🎉 ¡SORTEO EJECUTADO!");
                console.log("=".repeat(40));
                
                // Obtener detalles del sorteo
                const newGameDay = Number(currentGameDay) - 1; // El sorteo fue del día anterior
                const dailyPoolInfo = await contract.getDailyPoolInfo(newGameDay);
                
                console.log("📊 DETALLES DEL SORTEO:");
                console.log("📅 Game Day sorteado:", newGameDay);
                console.log("🎯 Números ganadores:", `[${dailyPoolInfo.winningNumbers.join(', ')}]`);
                console.log("💰 Total recaudado:", ethers.formatUnits(dailyPoolInfo.totalCollected, 6), "USDC");
                console.log("✅ Distribuido:", dailyPoolInfo.distributed);
                console.log("✅ Sorteado:", dailyPoolInfo.drawn);
                
                // Verificar ganadores
                const tickets = await contract.getGameDayTickets(newGameDay);
                console.log("🎫 Tickets participantes:", tickets.length);
                
                let winners = [];
                for (let i = 0; i < tickets.length; i++) {
                    const ticketId = tickets[i];
                    const ticketInfo = await contract.getTicketInfo(ticketId);
                    if (ticketInfo.matches > 0) {
                        winners.push({
                            ticketId: ticketId.toString(),
                            numbers: ticketInfo.numbers,
                            matches: ticketInfo.matches,
                            owner: ticketInfo.ticketOwner
                        });
                    }
                }
                
                console.log("\n🏆 GANADORES:");
                if (winners.length > 0) {
                    winners.forEach(winner => {
                        let prizeType = "";
                        if (winner.matches === 4) prizeType = "🥇 Primer Premio";
                        else if (winner.matches === 3) prizeType = "🥈 Segundo Premio";
                        else if (winner.matches === 2) prizeType = "🥉 Tercer Premio";
                        else if (winner.matches === 1) prizeType = "🎫 Tickets Gratis";
                        
                        console.log(`- Ticket #${winner.ticketId}: [${winner.numbers.join(', ')}] - ${prizeType}`);
                    });
                } else {
                    console.log("❌ No hay ganadores en este sorteo");
                }
                
                // Verificar pools
                const mainPools = await contract.getMainPoolBalances();
                const reserves = await contract.getReserveBalances();
                
                console.log("\n💰 ESTADO DE POOLS:");
                console.log("🥇 Primer Premio:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
                console.log("🥈 Segundo Premio:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
                console.log("🥉 Tercer Premio:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
                console.log("🔧 Desarrollo:", ethers.formatUnits(mainPools.developmentAccumulated, 6), "USDC");
                
                console.log("\n🏦 RESERVAS:");
                console.log("🥇 Reserva Primer Premio:", ethers.formatUnits(reserves.firstPrizeReserve, 6), "USDC");
                console.log("🥈 Reserva Segundo Premio:", ethers.formatUnits(reserves.secondPrizeReserve, 6), "USDC");
                console.log("🥉 Reserva Tercer Premio:", ethers.formatUnits(reserves.thirdPrizeReserve, 6), "USDC");
                
                console.log("\n" + "=".repeat(60));
                console.log("✅ MONITOREO COMPLETADO - SORTEO EXITOSO");
                return true; // Terminar monitoreo
            }
            
            return false; // Continuar monitoreando
            
        } catch (error) {
            console.error("❌ Error en monitoreo:", error.message);
            return false;
        }
    }
    
    // Monitorear cada 30 segundos
    const monitorInterval = setInterval(async () => {
        const shouldStop = await checkStatus();
        if (shouldStop) {
            clearInterval(monitorInterval);
            process.exit(0);
        }
    }, 30000); // 30 segundos
    
    // Primera verificación inmediata
    const shouldStop = await checkStatus();
    if (shouldStop) {
        clearInterval(monitorInterval);
        process.exit(0);
    }
    
    // Timeout después de 15 minutos
    setTimeout(() => {
        console.log("\n⏰ Timeout: El sorteo no ocurrió en 15 minutos");
        console.log("💡 Posibles causas:");
        console.log("- Chainlink Automation no está activo");
        console.log("- Problemas de red");
        console.log("- Configuración incorrecta");
        clearInterval(monitorInterval);
        process.exit(1);
    }, 15 * 60 * 1000); // 15 minutos
    
    console.log("\n🔄 Monitoreo iniciado... Presiona Ctrl+C para detener");
}

main().catch((error) => {
    console.error("💥 Error en el monitor:", error);
    process.exit(1);
}); 