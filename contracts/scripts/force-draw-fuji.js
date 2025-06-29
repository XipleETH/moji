const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 FORZAR SORTEO MANUAL - AVALANCHE FUJI");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0x1B0B1A24983E51d809FBfAc424946B314fEFA271";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Ejecutando con cuenta:", signer.address);
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. VERIFICAR ESTADO PREVIO
        console.log("\n📊 1. ESTADO PREVIO AL SORTEO:");
        console.log("-".repeat(35));
        
        const currentGameDay = await contract.getCurrentDay();
        const ticketCounter = await contract.ticketCounter();
        const totalDrawsExecuted = await contract.totalDrawsExecuted();
        const lastDrawTime = await contract.lastDrawTime();
        
        console.log("📅 Current Game Day:", currentGameDay.toString());
        console.log("🎫 Tickets vendidos:", ticketCounter.toString());
        console.log("🎯 Sorteos ejecutados:", totalDrawsExecuted.toString());
        console.log("⏰ Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
        
        // 2. VERIFICAR UPKEEP
        console.log("\n🔄 2. VERIFICACIÓN DE UPKEEP:");
        console.log("-".repeat(35));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep Needed:", upkeepNeeded ? "✅ SÍ" : "❌ NO");
        
        if (!upkeepNeeded) {
            console.log("❌ El upkeep no está listo. Abortando...");
            return;
        }
        
        console.log("✅ Upkeep está listo para ejecutarse");
        
        // 3. VERIFICAR POOLS ANTES DEL SORTEO
        console.log("\n💰 3. POOLS ANTES DEL SORTEO:");
        console.log("-".repeat(35));
        
        const todaysPools = await contract.getDailyPoolInfo(currentGameDay);
        const mainPools = await contract.getMainPoolBalances();
        
        console.log("📅 Today's Collection:", ethers.formatUnits(todaysPools.totalCollected, 6), "USDC");
        console.log("💰 Main Pool - First Prize:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
        console.log("🥈 Main Pool - Second Prize:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
        console.log("🥉 Main Pool - Third Prize:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
        
        // 4. EJECUTAR UPKEEP MANUALMENTE
        console.log("\n🚀 4. EJECUTANDO SORTEO MANUAL:");
        console.log("-".repeat(35));
        
        console.log("⚡ Enviando transacción performUpkeep...");
        const performUpkeepTx = await contract.performUpkeep(performData, {
            gasLimit: 3000000 // Gas alto para VRF callback
        });
        
        console.log("📡 Transacción enviada:", performUpkeepTx.hash);
        console.log("⏳ Esperando confirmación...");
        
        const receipt = await performUpkeepTx.wait();
        console.log("✅ Transacción confirmada!");
        console.log("⛽ Gas usado:", receipt.gasUsed.toString());
        console.log("🔗 Snowtrace:", `https://testnet.snowtrace.io/tx/${performUpkeepTx.hash}`);
        
        // 5. VERIFICAR RESULTADOS INMEDIATOS
        console.log("\n📊 5. ESTADO DESPUÉS DEL UPKEEP:");
        console.log("-".repeat(35));
        
        const updatedDrawsExecuted = await contract.totalDrawsExecuted();
        const updatedLastDrawTime = await contract.lastDrawTime();
        const winningNumbers = await contract.lastWinningNumbers();
        
        console.log("🎯 Sorteos ejecutados:", updatedDrawsExecuted.toString());
        console.log("⏰ Nuevo Last Draw Time:", new Date(Number(updatedLastDrawTime) * 1000).toISOString());
        console.log("🎲 Números ganadores:", Array.from(winningNumbers).join(", "));
        
        // 6. VERIFICAR ESTADO DEL DÍA ACTUAL
        console.log("\n📅 6. ESTADO DEL DÍA ACTUAL:");
        console.log("-".repeat(35));
        
        const updatedTodaysPools = await contract.getDailyPoolInfo(currentGameDay);
        console.log("🎯 Today Distributed:", updatedTodaysPools.distributed ? "✅ SÍ" : "❌ NO");
        console.log("🎲 Today Drawn:", updatedTodaysPools.drawn ? "✅ SÍ" : "❌ NO");
        
        if (updatedTodaysPools.drawn) {
            const todaysWinningNumbers = updatedTodaysPools.winningNumbers;
            console.log("🎲 Números del día:", Array.from(todaysWinningNumbers).join(", "));
        }
        
        // 7. VERIFICAR POOLS DESPUÉS DEL SORTEO
        console.log("\n💰 7. POOLS DESPUÉS DEL SORTEO:");
        console.log("-".repeat(35));
        
        const updatedMainPools = await contract.getMainPoolBalances();
        const updatedReserves = await contract.getReserveBalances();
        
        console.log("💰 Main Pool - First Prize:", ethers.formatUnits(updatedMainPools.firstPrizeAccumulated, 6), "USDC");
        console.log("🥈 Main Pool - Second Prize:", ethers.formatUnits(updatedMainPools.secondPrizeAccumulated, 6), "USDC");
        console.log("🥉 Main Pool - Third Prize:", ethers.formatUnits(updatedMainPools.thirdPrizeAccumulated, 6), "USDC");
        console.log("🏦 First Prize Reserve:", ethers.formatUnits(updatedReserves.firstPrizeReserve, 6), "USDC");
        console.log("🏦 Second Prize Reserve:", ethers.formatUnits(updatedReserves.secondPrizeReserve, 6), "USDC");
        console.log("🏦 Third Prize Reserve:", ethers.formatUnits(updatedReserves.thirdPrizeReserve, 6), "USDC");
        
        console.log("\n" + "=".repeat(50));
        console.log("🎉 SORTEO MANUAL COMPLETADO");
        console.log("=".repeat(50));
        
        console.log("\n📋 SIGUIENTES PASOS RECOMENDADOS:");
        console.log("1. 🔗 Configurar Chainlink Automation para sorteos automáticos");
        console.log("2. 📱 Verificar ganadores en el frontend");
        console.log("3. 🎁 Los ganadores pueden reclamar sus premios");
        console.log("4. ⏰ Próximo sorteo: mañana a las 04:00 UTC");
        
    } catch (error) {
        console.error("❌ Error ejecutando sorteo manual:", error.message);
        console.error("📋 Stack:", error.stack);
        
        if (error.code === 'CALL_EXCEPTION') {
            console.log("\n💡 POSIBLES CAUSAS:");
            console.log("- El upkeep ya no está listo");
            console.log("- Problemas con la suscripción VRF");
            console.log("- Gas insuficiente");
            console.log("- Estado del contrato cambió");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 