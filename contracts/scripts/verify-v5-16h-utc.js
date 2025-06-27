const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICANDO CONTRATO V5 - 16H UTC");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    // Conectar al contrato
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    console.log("📍 Contract Address:", CONTRACT_ADDRESS);
    
    try {
        console.log("\n📊 ESTADO GENERAL:");
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        
        console.log("- Game Active:", gameActive);
        console.log("- Automation Active:", automationActive);
        console.log("- Emergency Pause:", emergencyPause);
        
        console.log("\n⏰ CONFIGURACIÓN DE TIEMPO:");
        const drawTimeUTC = await contract.drawTimeUTC();
        const drawInterval = await contract.DRAW_INTERVAL();
        const currentGameDay = await contract.currentGameDay();
        const lastDrawTime = await contract.lastDrawTime();
        
        console.log("- Draw Time UTC:", Number(drawTimeUTC) / 3600, ":00 UTC");
        console.log("- Draw Interval:", Number(drawInterval) / 3600, "hours");
        console.log("- Current Game Day:", currentGameDay.toString());
        console.log("- Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toUTCString());
        
        console.log("\n🎲 CONFIGURACIÓN VRF:");
        const subscriptionId = await contract.subscriptionId();
        const lastWinningNumbers = [];
        try {
            for (let i = 0; i < 4; i++) {
                lastWinningNumbers.push(await contract.lastWinningNumbers(i));
            }
        } catch (error) {
            console.log("- Last Winning Numbers: Not available yet");
        }
        
        console.log("- Subscription ID:", subscriptionId.toString());
        if (lastWinningNumbers.length > 0) {
            console.log("- Last Winning Numbers:", lastWinningNumbers.map(n => n.toString()));
        }
        
        console.log("\n💰 POOLS PRINCIPALES:");
        const mainPools = await contract.getMainPoolBalances();
        console.log("- First Prize Accumulated:", ethers.formatUnits(mainPools[0], 6), "USDC");
        console.log("- Second Prize Accumulated:", ethers.formatUnits(mainPools[1], 6), "USDC");
        console.log("- Third Prize Accumulated:", ethers.formatUnits(mainPools[2], 6), "USDC");
        console.log("- Development Accumulated:", ethers.formatUnits(mainPools[3], 6), "USDC");
        
        console.log("\n🏦 POOLS DE RESERVA:");
        const reserves = await contract.getReserveBalances();
        console.log("- First Prize Reserve:", ethers.formatUnits(reserves[0], 6), "USDC");
        console.log("- Second Prize Reserve:", ethers.formatUnits(reserves[1], 6), "USDC");
        console.log("- Third Prize Reserve:", ethers.formatUnits(reserves[2], 6), "USDC");
        
        console.log("\n📊 ESTADÍSTICAS GENERALES:");
        const ticketCounter = await contract.ticketCounter();
        const totalDrawsExecuted = await contract.totalDrawsExecuted();
        const totalReservesProcessed = await contract.totalReservesProcessed();
        
        console.log("- Total Tickets Sold:", ticketCounter.toString());
        console.log("- Total Draws Executed:", totalDrawsExecuted.toString());
        console.log("- Total Reserves Processed:", totalReservesProcessed.toString());
        
        console.log("\n📅 INFORMACIÓN DEL DÍA ACTUAL:");
        const currentDay = await contract.getCurrentDay();
        const dailyPoolInfo = await contract.getDailyPoolInfo(currentDay);
        
        console.log("- Current Day:", currentDay.toString());
        console.log("- Total Collected Today:", ethers.formatUnits(dailyPoolInfo[0], 6), "USDC");
        console.log("- Main Pool Portion:", ethers.formatUnits(dailyPoolInfo[1], 6), "USDC");
        console.log("- Reserve Portion:", ethers.formatUnits(dailyPoolInfo[2], 6), "USDC");
        console.log("- Distributed:", dailyPoolInfo[3]);
        console.log("- Drawn:", dailyPoolInfo[4]);
        
        console.log("\n🔧 CONSTANTES DEL CONTRATO:");
        const ticketPrice = await contract.TICKET_PRICE();
        const dailyReservePercentage = await contract.DAILY_RESERVE_PERCENTAGE();
        const mainPoolPercentage = await contract.MAIN_POOL_PERCENTAGE();
        
        console.log("- Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("- Daily Reserve %:", dailyReservePercentage.toString() + "%");
        console.log("- Main Pool %:", mainPoolPercentage.toString() + "%");
        
        console.log("\n⏳ PRÓXIMO SORTEO:");
        const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
        const timeUntilNextDraw = nextDrawTime - Math.floor(Date.now() / 1000);
        
        console.log("- Next Draw Time:", new Date(nextDrawTime * 1000).toUTCString());
        console.log("- Time Until Next Draw:", Math.max(0, Math.floor(timeUntilNextDraw / 3600)), "hours,", Math.max(0, Math.floor((timeUntilNextDraw % 3600) / 60)), "minutes");
        
        console.log("\n✅ VERIFICACIÓN COMPLETADA!");
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("❌ Error verificando contrato:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 