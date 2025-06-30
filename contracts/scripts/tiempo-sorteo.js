const { ethers } = require("hardhat");

async function main() {
    console.log("⏰ PRÓXIMO SORTEO - CONTRATO V6");
    console.log("=".repeat(50));
    
    const contract = await ethers.getContractAt(
        "LottoMojiCore", 
        "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61"
    );
    
    const lastDrawTime = await contract.lastDrawTime();
    const drawInterval = await contract.DRAW_INTERVAL();
    const drawTimeUTC = await contract.drawTimeUTC();
    const currentTime = Math.floor(Date.now() / 1000);
    
    const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
    const timeUntilDraw = nextDrawTime - currentTime;
    
    console.log("📅 INFORMACIÓN:");
    console.log("- Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
    console.log("- Intervalo:", Number(drawInterval) / 3600, "horas");
    console.log("- Hora configurada:", Number(drawTimeUTC) / 3600, ":00 UTC");
    
    console.log("\n🕐 PRÓXIMO SORTEO:");
    console.log("- Fecha UTC:", new Date(nextDrawTime * 1000).toISOString());
    console.log("- Tiempo restante:", Math.floor(timeUntilDraw / 3600), "horas");
    
    const upkeepNeeded = await contract.checkUpkeep("0x");
    console.log("\n🔍 ESTADO:");
    console.log("- ¿Es hora del sorteo?:", upkeepNeeded[0] ? "SÍ" : "NO");
    console.log("- Game Day:", (await contract.currentGameDay()).toString());
    
    if (timeUntilDraw > 0) {
        const hours = Math.floor(timeUntilDraw / 3600);
        const minutes = Math.floor((timeUntilDraw % 3600) / 60);
        console.log("\n⏳ Falta", hours, "horas y", minutes, "minutos");
    } else {
        console.log("\n🚨 ¡Es hora del sorteo!");
    }
}

main().catch(console.error); 