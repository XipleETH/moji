const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 FORZANDO SORTEO DEL DÍA 20267");
    console.log("=".repeat(70));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61"; // V6
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Ejecutando con cuenta:", signer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    console.log("\n📋 ESTADO INICIAL:");
    
    const initialGameDay = await contract.currentGameDay();
    const initialTotalDraws = await contract.totalDrawsExecuted();
    
    console.log("- Game Day actual:", initialGameDay.toString());
    console.log("- Total draws ejecutados:", initialTotalDraws.toString());
    
    const dailyPoolInfo = await contract.getDailyPoolInfo(20267);
    const gameDayTickets = await contract.getGameDayTickets(20267);
    
    console.log("\n🎫 DÍA 20267:");
    console.log("- Total collected:", ethers.formatUnits(dailyPoolInfo[0], 6), "USDC");
    console.log("- Tickets:", gameDayTickets.length);
    console.log("- Ya sorteado:", dailyPoolInfo[4]);
    
    const currentWinningNumbers = [];
    for (let i = 0; i < 4; i++) {
        currentWinningNumbers.push(await contract.lastWinningNumbers(i));
    }
    console.log("- Números actuales:", `[${currentWinningNumbers.join(', ')}]`);
    
    console.log("\n🎯 EJECUTANDO DRAW:");
    
    const automationActive = await contract.automationActive();
    if (!automationActive) {
        console.log("⚠️ Activando automation...");
        const toggleTx = await contract.toggleAutomation();
        await toggleTx.wait();
        console.log("✅ Automation activado");
    }
    
    try {
        const performData = ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [true]);
        const performTx = await contract.performUpkeep(performData, { gasLimit: 3000000 });
        
        console.log("📡 Tx enviada:", performTx.hash);
        await performTx.wait();
        console.log("✅ PerformUpkeep ejecutado");
        
        console.log("⏳ Esperando VRF (60 segundos)...");
        await new Promise(resolve => setTimeout(resolve, 60000));
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
    
    console.log("\n🔍 VERIFICANDO RESULTADOS:");
    
    const finalTotalDraws = await contract.totalDrawsExecuted();
    const finalWinningNumbers = [];
    for (let i = 0; i < 4; i++) {
        finalWinningNumbers.push(await contract.lastWinningNumbers(i));
    }
    
    const drawExecuted = finalTotalDraws > initialTotalDraws;
    console.log("- Draw ejecutado:", drawExecuted ? "✅ SÍ" : "❌ NO");
    console.log("- Números finales:", `[${finalWinningNumbers.join(', ')}]`);
    
    if (drawExecuted) {
        console.log("\n🎉 ¡SORTEO EJECUTADO!");
        
        const mainPools = await contract.getMainPoolBalances();
        console.log("\n💰 POOLS:");
        console.log("  - First Prize:", ethers.formatUnits(mainPools[0], 6), "USDC");
        console.log("  - Second Prize:", ethers.formatUnits(mainPools[1], 6), "USDC");
        console.log("  - Third Prize:", ethers.formatUnits(mainPools[2], 6), "USDC");
        console.log("  - Development:", ethers.formatUnits(mainPools[3], 6), "USDC");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 