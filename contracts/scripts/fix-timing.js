const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 CORRIGIENDO TIMING PARA 29 JUN 4:00 UTC");
    console.log("=".repeat(50));
    
    const contract = await ethers.getContractAt(
        "LottoMojiCore", 
        "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61"
    );
    
    const drawInterval = await contract.DRAW_INTERVAL();
    const drawTimeUTC = await contract.drawTimeUTC();
    
    // Objetivo: 29 de junio 2025 a las 4:00 UTC
    const targetDate = new Date("2025-06-29T04:00:00.000Z");
    const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
    const correctLastDrawTime = targetTimestamp - Number(drawInterval);
    
    console.log("OBJETIVO: 29 junio a las 4:00 UTC");
    console.log("Ajustando lastDrawTime...");
    
    const tx = await contract.setLastDrawTime(correctLastDrawTime);
    await tx.wait();
    console.log("✅ Timing corregido!");
    
    const lastDrawTime = await contract.lastDrawTime();
    const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilDraw = nextDrawTime - currentTime;
    
    console.log("\n📅 RESULTADO:");
    console.log("- Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
    console.log("- Próximo sorteo:", new Date(nextDrawTime * 1000).toISOString());
    console.log("- ¿Correcto?:", new Date(nextDrawTime * 1000).toISOString() === "2025-06-29T04:00:00.000Z" ? "✅ SÍ" : "❌ NO");
    
    const upkeepNeeded = await contract.checkUpkeep("0x");
    console.log("\n🔍 ESTADO:");
    console.log("- ¿Es hora del sorteo?:", upkeepNeeded[0] ? "SÍ" : "NO");
    
    if (timeUntilDraw > 0) {
        const hours = Math.floor(timeUntilDraw / 3600);
        const minutes = Math.floor((timeUntilDraw % 3600) / 60);
        console.log("\n⏳ Próximo sorteo en", hours, "horas y", minutes, "minutos");
        console.log("📅 29 de junio a las 4:00 UTC (11:00 PM Colombia)");
    } else {
        console.log("\n🚨 ¡Es hora del sorteo!");
    }
}

main().catch(console.error); 