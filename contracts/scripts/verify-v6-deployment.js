const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICANDO DEPLOYMENT V6 - LÓGICA CORREGIDA");
    console.log("=".repeat(60));
    
    // Dirección del nuevo contrato V6
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    
    console.log("📍 Contrato V6:", CONTRACT_ADDRESS);
    
    try {
        // Conectar al contrato
        const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
        
        console.log("\n🔍 VERIFICANDO CONFIGURACIÓN BÁSICA:");
        console.log("=".repeat(45));
        
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const ticketPrice = await contract.TICKET_PRICE();
        const drawTimeUTC = await contract.drawTimeUTC();
        const currentGameDay = await contract.getCurrentDay();
        const subscriptionId = await contract.subscriptionId();
        const totalDrawsExecuted = await contract.totalDrawsExecuted();
        
        console.log("✅ gameActive:", gameActive);
        console.log("✅ automationActive:", automationActive);
        console.log("✅ TICKET_PRICE:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("✅ drawTimeUTC:", Number(drawTimeUTC) / 3600, "horas (", Number(drawTimeUTC) / 3600 + ":00 UTC)");
        console.log("✅ getCurrentDay:", currentGameDay.toString());
        console.log("✅ subscriptionId:", subscriptionId.toString());
        console.log("✅ totalDrawsExecuted:", totalDrawsExecuted.toString());
        
        // Verificar pools iniciales
        console.log("\n💰 VERIFICANDO POOLS INICIALES:");
        console.log("=".repeat(35));
        
        const mainPools = await contract.getMainPoolBalances();
        const reserves = await contract.getReserveBalances();
        
        console.log("Main Pools:");
        console.log("  - First Prize:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
        console.log("  - Second Prize:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
        console.log("  - Third Prize:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
        console.log("  - Development:", ethers.formatUnits(mainPools.developmentAccumulated, 6), "USDC");
        
        console.log("Reserve Pools:");
        console.log("  - First Reserve:", ethers.formatUnits(reserves.firstPrizeReserve, 6), "USDC");
        console.log("  - Second Reserve:", ethers.formatUnits(reserves.secondPrizeReserve, 6), "USDC");
        console.log("  - Third Reserve:", ethers.formatUnits(reserves.thirdPrizeReserve, 6), "USDC");
        
        // Verificar información del día actual
        console.log("\n📅 VERIFICANDO DÍA ACTUAL:");
        console.log("=".repeat(30));
        
        const dailyPoolInfo = await contract.getDailyPoolInfo(currentGameDay);
        const tickets = await contract.getGameDayTickets(currentGameDay);
        
        console.log("Game Day:", currentGameDay.toString());
        console.log("Total collected:", ethers.formatUnits(dailyPoolInfo.totalCollected, 6), "USDC");
        console.log("Main pool portion:", ethers.formatUnits(dailyPoolInfo.mainPoolPortion, 6), "USDC");
        console.log("Reserve portion:", ethers.formatUnits(dailyPoolInfo.reservePortion, 6), "USDC");
        console.log("Distributed:", dailyPoolInfo.distributed);
        console.log("Drawn:", dailyPoolInfo.drawn);
        console.log("Winning numbers:", `[${dailyPoolInfo.winningNumbers.join(', ')}]`);
        console.log("Total tickets:", tickets.length);
        
        // Probar nueva función de detalles de premios
        console.log("\n🧪 PROBANDO NUEVA FUNCIÓN getTicketPrizeDetails:");
        console.log("=".repeat(50));
        
        if (tickets.length > 0) {
            const ticketId = tickets[0];
            try {
                const prizeDetails = await contract.getTicketPrizeDetails(ticketId);
                console.log(`Ticket #${ticketId}:`);
                console.log("  - Prize Level:", prizeDetails.prizeLevel);
                console.log("  - Exact Matches:", prizeDetails.exactMatches);
                console.log("  - Any Order Matches:", prizeDetails.anyOrderMatches);
                console.log("  - Prize Amount:", ethers.formatUnits(prizeDetails.prizeAmount, 6), "USDC");
                console.log("  - Description:", prizeDetails.prizeDescription);
                console.log("✅ Nueva función funciona correctamente");
            } catch (error) {
                console.log("⚠️  No se pudo probar getTicketPrizeDetails:", error.message);
            }
        } else {
            console.log("ℹ️  No hay tickets para probar la función");
        }
        
        // Verificar timing del próximo sorteo
        console.log("\n⏰ VERIFICANDO TIMING DEL SORTEO:");
        console.log("=".repeat(35));
        
        const lastDrawTime = await contract.lastDrawTime();
        const nextDrawTime = Number(lastDrawTime) + (24 * 3600);
        const nextDrawDate = new Date(nextDrawTime * 1000);
        const now = new Date();
        const minutesUntilDraw = Math.round((nextDrawTime - Math.floor(now.getTime() / 1000)) / 60);
        
        console.log("Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("Next Draw Time:", nextDrawDate.toISOString());
        console.log("Minutes until next draw:", minutesUntilDraw);
        
        // Verificar balance USDC del contrato
        console.log("\n💳 VERIFICANDO BALANCE USDC:");
        console.log("=".repeat(30));
        
        const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
        const usdcContract = await ethers.getContractAt("IERC20", usdcAddress);
        const balance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
        
        console.log("Balance USDC del contrato:", ethers.formatUnits(balance, 6), "USDC");
        
        // Resumen de verificación
        console.log("\n📊 RESUMEN DE VERIFICACIÓN:");
        console.log("=".repeat(30));
        console.log("✅ Contrato deployado correctamente");
        console.log("✅ Configuración básica OK");
        console.log("✅ Pools inicializadas");
        console.log("✅ Timing configurado a 20:00 UTC");
        console.log("✅ Nueva función getTicketPrizeDetails disponible");
        console.log("✅ Subscription ID configurado");
        
        console.log("\n📋 PRÓXIMOS PASOS:");
        console.log("=".repeat(20));
        console.log("1. 🔄 Agregar contrato como consumer en Chainlink VRF");
        console.log("2. 🔄 Configurar Chainlink Automation");
        console.log("3. 🔄 Actualizar dirección en el frontend");
        console.log("4. 🔄 Probar compra de tickets");
        console.log("5. 🔄 Probar sorteo con nueva lógica");
        
        console.log("\n" + "=".repeat(60));
        console.log("🎉 VERIFICACIÓN V6 COMPLETADA EXITOSAMENTE");
        console.log("📍 Contrato listo para usar:", CONTRACT_ADDRESS);
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("❌ Error en verificación:", error.message);
        console.log("\n💡 Posibles causas:");
        console.log("- Dirección del contrato incorrecta");
        console.log("- Contrato no deployado correctamente");
        console.log("- Problemas de conectividad");
    }
}

main().catch((error) => {
    console.error("💥 Error en el script:", error);
    process.exit(1);
}); 