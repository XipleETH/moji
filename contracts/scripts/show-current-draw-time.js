const { ethers } = require("hardhat");

async function main() {
    console.log("⏰ VERIFICANDO HORA ACTUAL DE SORTEO");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    
    try {
        // Usar provider directo (solo lectura)
        const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
        
        const contractABI = [
            "function drawTimeUTC() view returns (uint256)",
            "function gameActive() view returns (bool)",
            "function getCurrentDay() view returns (uint256)",
            "function lastDrawTime() view returns (uint256)",
            "function DRAW_INTERVAL() view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
        
        // Obtener información actual
        const drawTimeUTC = await contract.drawTimeUTC();
        const gameActive = await contract.gameActive();
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        const drawInterval = await contract.DRAW_INTERVAL();
        
        const currentHour = Number(drawTimeUTC) / 3600;
        
        console.log("📍 Contrato:", CONTRACT_ADDRESS);
        console.log("✅ Game Active:", gameActive);
        console.log("📅 Current Game Day:", currentGameDay.toString());
        
        console.log("\n🕐 CONFIGURACIÓN ACTUAL:");
        console.log("- Hora UTC:", currentHour.toFixed(0) + ":00");
        console.log("- Hora Colombia:", getColombiaTime(currentHour));
        console.log("- Intervalo:", (Number(drawInterval) / 3600).toFixed(1), "horas");
        
        console.log("\n📅 CRONOGRAMA:");
        console.log("- Último sorteo:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        
        const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
        console.log("- Próximo sorteo:", new Date(nextDrawTime * 1000).toLocaleString());
        
        const timeUntilDraw = Math.max(0, nextDrawTime - Math.floor(Date.now() / 1000));
        console.log("- Tiempo restante:", Math.floor(timeUntilDraw / 3600), "horas", Math.floor((timeUntilDraw % 3600) / 60), "minutos");
        
        console.log("\n🎯 CAMBIO PROPUESTO:");
        console.log("- Hora actual: " + currentHour.toFixed(0) + ":00 UTC (" + getColombiaTime(currentHour) + ")");
        console.log("- Nueva hora: 4:00 UTC (11:00 PM Colombia)");
        
        if (currentHour === 4) {
            console.log("\n✅ YA ESTÁ CONFIGURADO EN 4:00 UTC!");
        } else {
            console.log("\n⚠️ CAMBIO REQUERIDO");
            console.log("Para cambiar la hora necesitas:");
            console.log("1. Crear archivo .env con PRIVATE_KEY");
            console.log("2. Asegurar que la cuenta sea el owner");
            console.log("3. Tener ETH para gas en Base Sepolia");
            console.log("4. Ejecutar: setDrawTimeUTC(4)");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
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