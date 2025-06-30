const { ethers } = require("hardhat");

async function main() {
    console.log("🔵 VERIFICAR SORTEO EN BASE SEPOLIA");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    
    console.log("📍 Contrato Base Sepolia:", CONTRACT_ADDRESS);
    console.log("🔵 Red: Base Sepolia Testnet");
    
    try {
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        console.log("\n📊 ESTADO ACTUAL DEL CONTRATO:");
        console.log("-".repeat(40));
        
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        const totalDraws = await contract.totalDrawsExecuted();
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const ticketCounter = await contract.ticketCounter();
        
        console.log("📅 Current Game Day:", currentGameDay.toString());
        console.log("🎫 Tickets vendidos:", ticketCounter.toString());
        console.log("🎯 Sorteos ejecutados:", totalDraws.toString());
        console.log("⏰ Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("🎮 Game Active:", gameActive ? "✅" : "❌");
        console.log("🤖 Automation Active:", automationActive ? "✅" : "❌");
        
        // Verificar próximo upkeep
        const [upkeepNeeded] = await contract.checkUpkeep("0x");
        console.log("🔄 Próximo upkeep necesario:", upkeepNeeded ? "✅ SÍ" : "❌ NO");
        
        // Verificar si hay un sorteo pendiente para el día actual
        console.log("\n🎲 ESTADO DEL SORTEO:");
        console.log("-".repeat(30));
        
        try {
            const dailyPools = await contract.getDailyPoolInfo(currentGameDay);
            console.log("💰 Pool del día:", ethers.formatUnits(dailyPools.totalCollected, 6), "USDC");
            console.log("🎲 Sorteo ejecutado:", dailyPools.drawn ? "✅ SÍ" : "❌ NO");
            console.log("💸 Distribución completada:", dailyPools.distributed ? "✅ SÍ" : "❌ NO");
            
            if (dailyPools.drawn) {
                const winningNumbers = dailyPools.winningNumbers;
                console.log("🎯 Números ganadores:", Array.from(winningNumbers).join(", "));
                
                console.log("\n🎉 ¡SORTEO COMPLETADO!");
                console.log("✅ VRF callback recibido");
                console.log("✅ Números generados exitosamente");
                
                // Verificar pools después del sorteo
                console.log("\n💰 ESTADO DE LAS POOLS:");
                console.log("-".repeat(30));
                
                try {
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
                    
                } catch (poolError) {
                    console.log("⚠️ No se pudieron obtener los detalles de las pools");
                }
                
            } else {
                console.log("⏳ Sorteo aún pendiente...");
                console.log("💡 El VRF callback puede tomar varios minutos");
                console.log("🔄 Verifica nuevamente en unos minutos");
            }
            
        } catch (poolError) {
            console.log("⚠️ No se pudo obtener información del pool del día");
        }
        
        // Calcular tiempo hasta próximo sorteo
        console.log("\n⏰ INFORMACIÓN DE TIMING:");
        console.log("-".repeat(35));
        
        const nextDrawTime = Number(lastDrawTime) + 24*3600;
        const currentTime = Math.floor(Date.now() / 1000);
        
        console.log("⏰ Próximo sorteo programado:", new Date(nextDrawTime * 1000).toISOString());
        
        if (nextDrawTime > currentTime) {
            const timeLeft = nextDrawTime - currentTime;
            const hoursLeft = Math.floor(timeLeft / 3600);
            const minutesLeft = Math.floor((timeLeft % 3600) / 60);
            console.log("⏰ Tiempo hasta próximo sorteo:", hoursLeft + "h " + minutesLeft + "m");
        } else {
            console.log("🚨 ¡Ya es tiempo del próximo sorteo!");
        }
        
        console.log("\n🔗 ENLACES:");
        console.log("• Contrato: https://sepolia.basescan.org/address/" + CONTRACT_ADDRESS);
        console.log("• Transacción de sorteo: https://sepolia.basescan.org/tx/0xdfd2e3ebb01a7e783ef8ffce988fa73beb07561db17c02e2046f91fd5c9aed95");
        console.log("• VRF Dashboard: https://vrf.chain.link/");
        
        // Resumen final
        if (Number(totalDraws) >= 2) {
            console.log("\n🎊 ¡SORTEO EXITOSO!");
            console.log("✅ Sistema funcionando correctamente");
        } else {
            console.log("\n⏳ ESPERANDO VRF CALLBACK...");
            console.log("💡 El sorteo fue iniciado exitosamente");
            console.log("🔄 Los números aleatorios pueden tardar unos minutos");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 