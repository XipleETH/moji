const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICACIÓN BÁSICA DEL CONTRATO");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    
    try {
        const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
        
        // Probar funciones una por una
        console.log("📍 Contrato:", CONTRACT_ADDRESS);
        
        // Función simple para verificar que el contrato existe
        const code = await provider.getCode(CONTRACT_ADDRESS);
        console.log("📄 Contract Code Length:", code.length);
        
        if (code === "0x") {
            console.log("❌ ERROR: No hay contrato en esta dirección");
            return;
        }
        
        console.log("✅ Contrato encontrado");
        
        // Probar funciones básicas una por una
        const basicABI = [
            "function gameActive() view returns (bool)",
            "function getCurrentDay() view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, basicABI, provider);
        
        try {
            const gameActive = await contract.gameActive();
            console.log("✅ gameActive():", gameActive);
        } catch (error) {
            console.log("❌ gameActive() failed:", error.message);
        }
        
        try {
            const currentDay = await contract.getCurrentDay();
            console.log("✅ getCurrentDay():", currentDay.toString());
        } catch (error) {
            console.log("❌ getCurrentDay() failed:", error.message);
        }
        
        // Probar drawTimeUTC específicamente
        const timeABI = ["function drawTimeUTC() view returns (uint256)"];
        const timeContract = new ethers.Contract(CONTRACT_ADDRESS, timeABI, provider);
        
        try {
            const drawTimeUTC = await timeContract.drawTimeUTC();
            const hours = Number(drawTimeUTC) / 3600;
            console.log("✅ drawTimeUTC():", hours.toFixed(0) + ":00 UTC");
            
            // Calcular hora Colombia
            let colombiaHour = hours - 5;
            if (colombiaHour < 0) colombiaHour += 24;
            const period = colombiaHour >= 12 ? "PM" : "AM";
            const displayHour = colombiaHour === 0 ? 12 : colombiaHour > 12 ? colombiaHour - 12 : colombiaHour;
            console.log("🇨🇴 Hora Colombia:", displayHour.toFixed(0) + ":00 " + period);
            
            if (hours === 4) {
                console.log("\n✅ YA ESTÁ EN 4:00 UTC (11:00 PM Colombia)");
            } else {
                console.log("\n🔄 CAMBIO NECESARIO:");
                console.log("- Actual:", hours.toFixed(0) + ":00 UTC");
                console.log("- Deseado: 4:00 UTC (11:00 PM Colombia)");
                
                console.log("\n⚡ PARA CAMBIAR LA HORA:");
                console.log("1. Necesitas configurar una wallet con PRIVATE_KEY");
                console.log("2. La cuenta debe ser el owner del contrato");
                console.log("3. Función: setDrawTimeUTC(4)");
            }
            
        } catch (error) {
            console.log("❌ drawTimeUTC() failed:", error.message);
            
            // Intentar buscar en el ABI real del contrato
            console.log("\n🔍 Intentando buscar la función correcta...");
            try {
                // Usar el ABI completo del contrato desplegado
                const fs = require('fs');
                const path = require('path');
                const artifactPath = path.join(__dirname, '../artifacts/contracts/LottoMojiCore.sol/LottoMojiCore.json');
                
                if (fs.existsSync(artifactPath)) {
                    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
                    const fullContract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, provider);
                    
                    const drawTime = await fullContract.drawTimeUTC();
                    console.log("✅ Con ABI completo - drawTimeUTC:", (Number(drawTime) / 3600).toFixed(0) + ":00 UTC");
                } else {
                    console.log("❌ No se encontró el artifact del contrato");
                }
            } catch (fullError) {
                console.log("❌ Error con ABI completo:", fullError.message);
            }
        }
        
    } catch (error) {
        console.error("❌ Error general:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 