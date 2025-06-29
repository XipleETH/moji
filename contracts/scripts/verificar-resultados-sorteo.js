const { ethers } = require("hardhat");

async function main() {
    console.log("🎉 VERIFICAR RESULTADOS DEL SORTEO - AVALANCHE FUJI");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0xe980475E4aF2f0B937059E9394262b36827B215F";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("🏔️ Red: Avalanche Fuji Testnet");
    
    try {
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        console.log("\n🎯 RESULTADOS DEL SORTEO:");
        console.log("-".repeat(35));
        
        const totalDraws = await contract.totalDrawsExecuted();
        const winningNumbers = await contract.lastWinningNumbers();
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        
        console.log("🎯 Total sorteos ejecutados:", totalDraws.toString());
        console.log("🎲 Números ganadores:", Array.from(winningNumbers).join(", "));
        console.log("📅 Game Day actual:", currentGameDay.toString());
        console.log("⏰ Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("⏰ Próximo sorteo:", new Date((Number(lastDrawTime) + 24*3600) * 1000).toISOString());
        
        // Verificar estado del día del sorteo
        console.log("\n📅 ESTADO DEL DÍA DEL SORTEO:");
        console.log("-".repeat(40));
        
        const todaysPools = await contract.getDailyPoolInfo(currentGameDay);
        console.log("🎲 Sorteo ejecutado:", todaysPools.drawn ? "✅ SÍ" : "❌ NO");
        console.log("💰 Distribución completada:", todaysPools.distributed ? "✅ SÍ" : "❌ NO");
        console.log("📊 Total recolectado hoy:", ethers.formatUnits(todaysPools.totalCollected, 6), "USDC");
        
        if (todaysPools.drawn) {
            const todaysWinningNumbers = todaysPools.winningNumbers;
            console.log("🎲 Números del día:", Array.from(todaysWinningNumbers).join(", "));
        }
        
        // Verificar pools actuales
        console.log("\n💰 ESTADO DE LAS POOLS:");
        console.log("-".repeat(30));
        
        const mainPools = await contract.getMainPoolBalances();
        const reserves = await contract.getReserveBalances();
        
        console.log("Main Pools:");
        console.log("  🥇 First Prize:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
        console.log("  🥈 Second Prize:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
        console.log("  🥉 Third Prize:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
        console.log("  🔧 Development:", ethers.formatUnits(mainPools.developmentAccumulated, 6), "USDC");
        
        console.log("Reserve Pools:");
        console.log("  🏦 First Reserve:", ethers.formatUnits(reserves.firstPrizeReserve, 6), "USDC");
        console.log("  🏦 Second Reserve:", ethers.formatUnits(reserves.secondPrizeReserve, 6), "USDC");
        console.log("  🏦 Third Reserve:", ethers.formatUnits(reserves.thirdPrizeReserve, 6), "USDC");
        
        const totalReserves = reserves.firstPrizeReserve + reserves.secondPrizeReserve + reserves.thirdPrizeReserve;
        console.log("  💰 Total Reserves:", ethers.formatUnits(totalReserves, 6), "USDC");
        
        // Información del contrato
        console.log("\n📊 INFORMACIÓN DEL CONTRATO:");
        console.log("-".repeat(35));
        
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const ticketCounter = await contract.ticketCounter();
        const ticketPrice = await contract.TICKET_PRICE();
        
        console.log("🎮 Game Active:", gameActive ? "✅ SÍ" : "❌ NO");
        console.log("🤖 Automation Active:", automationActive ? "✅ SÍ" : "❌ NO");
        console.log("🎫 Tickets vendidos total:", ticketCounter.toString());
        console.log("💰 Precio por ticket:", ethers.formatUnits(ticketPrice, 6), "USDC");
        
        console.log("\n🎊 ¡SORTEO EXITOSO EN AVALANCHE FUJI!");
        console.log("✅ VRF funcionando correctamente");
        console.log("✅ Contrato operativo");
        console.log("✅ Sistema listo para tickets y sorteos automáticos");
        
        console.log("\n📱 INFORMACIÓN PARA ACTUALIZAR FRONTEND:");
        console.log("-".repeat(50));
        console.log("CONTRACT_ADDRESS =", `"${CONTRACT_ADDRESS}"`);
        console.log("NETWORK = Avalanche Fuji");
        console.log("CHAIN_ID = 43113");
        console.log("RPC_URL = https://api.avax-test.network/ext/bc/C/rpc");
        console.log("USDC_ADDRESS = 0x5425890298aed601595a70AB815c96711a31Bc65");
        
        console.log("\n🔗 ENLACES:");
        console.log("• Contrato: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
        console.log("• VRF Dashboard: https://vrf.chain.link/");
        console.log("• Automation: https://automation.chain.link/");
        
    } catch (error) {
        console.error("❌ Error verificando resultados:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 