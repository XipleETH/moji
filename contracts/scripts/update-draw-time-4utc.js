const { ethers } = require("hardhat");

async function main() {
    console.log("⏰ CAMBIANDO HORA DE SORTEO A 4:00 UTC");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    const NEW_DRAW_HOUR = 4; // 4:00 UTC = 11:00 PM Colombia
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("🕓 Nueva hora:", NEW_DRAW_HOUR + ":00 UTC (11:00 PM Colombia)");
    
    try {
        // Conectar con provider para evitar problemas de signer
        const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
        
        // Para transacciones, necesitamos un wallet
        // Por ahora, solo verificamos el estado actual
        const contractABI = [
            "function drawTimeUTC() view returns (uint256)",
            "function gameActive() view returns (bool)",
            "function getCurrentDay() view returns (uint256)",
            "function setDrawTimeUTC(uint256) external",
            "function lastDrawTime() view returns (uint256)",
            "function DRAW_INTERVAL() view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
        
        // Verificar estado actual
        console.log("\n📋 ESTADO ACTUAL:");
        const currentDrawTimeUTC = await contract.drawTimeUTC();
        const gameActive = await contract.gameActive();
        const currentGameDay = await contract.getCurrentDay();
        
        console.log("- Hora actual:", (Number(currentDrawTimeUTC) / 3600).toFixed(0) + ":00 UTC");
        console.log("- Game Active:", gameActive);
        console.log("- Current Game Day:", currentGameDay.toString());
        
        // Mostrar información de cambio
        console.log("\n🔄 CAMBIO PROPUESTO:");
        console.log("- Hora actual:", (Number(currentDrawTimeUTC) / 3600).toFixed(0) + ":00 UTC");
        console.log("- Nueva hora:", NEW_DRAW_HOUR + ":00 UTC");
        console.log("- Hora Colombia actual:", getColombiaTime(Number(currentDrawTimeUTC) / 3600));
        console.log("- Nueva hora Colombia:", getColombiaTime(NEW_DRAW_HOUR));
        
        // Calcular próximo sorteo con nueva hora
        const lastDrawTime = await contract.lastDrawTime();
        const drawInterval = await contract.DRAW_INTERVAL();
        
        console.log("\n📅 CRONOGRAMA:");
        console.log("- Último sorteo:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        console.log("- Intervalo:", (Number(drawInterval) / 3600).toFixed(1), "horas");
        
        console.log("\n⚡ PARA EJECUTAR EL CAMBIO:");
        console.log("Necesitas ejecutar el siguiente comando con una wallet configurada:");
        console.log("npx hardhat run scripts/execute-draw-time-change.js --network base-sepolia");
        
        console.log("\n📝 PREPARACIÓN PARA CAMBIO:");
        console.log("✅ Hora objetivo: 4:00 UTC (11:00 PM Colombia)");
        console.log("✅ Función disponible: setDrawTimeUTC(4)");
        console.log("✅ Contrato funcional");
        console.log("⚠️ Requiere configuración de wallet para ejecutar");
        
    } catch (error) {
        console.error("❌ Error verificando contrato:", error.message);
    }
}

function getColombiaTime(utcHour) {
    // Colombia es UTC-5
    let colombiaHour = utcHour - 5;
    if (colombiaHour < 0) {
        colombiaHour += 24;
    }
    
    const period = colombiaHour >= 12 ? "PM" : "AM";
    const displayHour = colombiaHour === 0 ? 12 : colombiaHour > 12 ? colombiaHour - 12 : colombiaHour;
    
    return `${displayHour}:00 ${period}`;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 