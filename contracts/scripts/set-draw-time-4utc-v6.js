const { ethers } = require("hardhat");

async function main() {
    console.log("⏰ CAMBIANDO HORA DE SORTEO A 4:00 UTC");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    const NEW_DRAW_HOUR = 4; // 4:00 UTC = 11:00 PM Colombia
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("🕓 Nueva hora:", NEW_DRAW_HOUR + ":00 UTC (11:00 PM Colombia)");
    
    try {
        // Conectar con provider para verificación
        const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
        
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
        
        const currentHour = Number(currentDrawTimeUTC) / 3600;
        console.log("- Hora actual:", currentHour.toFixed(0) + ":00 UTC");
        console.log("- Game Active:", gameActive);
        console.log("- Current Game Day:", currentGameDay.toString());
        console.log("- Hora Colombia actual:", getColombiaTime(currentHour));
        
        // Verificar si ya está en la hora deseada
        if (currentHour === NEW_DRAW_HOUR) {
            console.log("\n✅ LA HORA YA ESTÁ CONFIGURADA CORRECTAMENTE");
            console.log("🎯 Sorteos diarios a las 4:00 UTC (11:00 PM Colombia)");
            return;
        }
        
        console.log("\n🔄 CAMBIO REQUERIDO:");
        console.log("- De:", currentHour.toFixed(0) + ":00 UTC (" + getColombiaTime(currentHour) + ")");
        console.log("- A:", NEW_DRAW_HOUR + ":00 UTC (" + getColombiaTime(NEW_DRAW_HOUR) + ")");
        
        // Para transacciones necesitamos un signer configurado
        console.log("\n⚡ EJECUTANDO CAMBIO...");
        
        // Intentar obtener un signer
        let signer;
        try {
            const signers = await ethers.getSigners();
            if (signers.length === 0) {
                throw new Error("No signers available");
            }
            signer = signers[0];
            console.log("👤 Usando cuenta:", signer.address);
        } catch (error) {
            console.log("❌ No hay wallet configurada para transacciones");
            console.log("\n🔧 CONFIGURACIÓN REQUERIDA:");
            console.log("1. Crear archivo .env en la carpeta contracts/");
            console.log("2. Agregar: PRIVATE_KEY=tu_private_key_aquí");
            console.log("3. Asegurar que la cuenta tenga ETH para gas");
            console.log("4. La cuenta debe ser el owner del contrato");
            return;
        }
        
        // Ejecutar transacción
        const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
        
        const changeTx = await contractWithSigner.setDrawTimeUTC(NEW_DRAW_HOUR, {
            gasLimit: 300000
        });
        
        console.log("📡 Transacción enviada:", changeTx.hash);
        console.log("⏳ Esperando confirmación...");
        
        const receipt = await changeTx.wait();
        console.log("✅ Transacción confirmada en bloque:", receipt.blockNumber);
        console.log("⛽ Gas usado:", receipt.gasUsed.toString());
        
        // Verificar el cambio
        console.log("\n🔍 VERIFICANDO CAMBIO...");
        const newDrawTimeUTC = await contract.drawTimeUTC();
        const newHour = Number(newDrawTimeUTC) / 3600;
        
        console.log("- Nueva hora UTC:", newHour.toFixed(0) + ":00");
        console.log("- Nueva hora Colombia:", getColombiaTime(newHour));
        
        if (newHour === NEW_DRAW_HOUR) {
            console.log("\n🎉 ¡CAMBIO EXITOSO!");
            console.log("✅ Nueva configuración:");
            console.log("   • Sorteos diarios a las 4:00 UTC");
            console.log("   • Hora local Colombia: 11:00 PM");
            console.log("   • Mejor horario para participación nocturna");
            
            console.log("\n📝 PRÓXIMOS PASOS:");
            console.log("1. ✅ Hora actualizada en el contrato");
            console.log("2. 🔄 Actualizar configuración del frontend");
            console.log("3. 📢 Informar a los usuarios del cambio");
            
        } else {
            console.log("❌ ERROR: El cambio no se aplicó correctamente");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        if (error.message.includes("Not authorized")) {
            console.log("\n🔧 SOLUCIÓN:");
            console.log("- Solo el owner del contrato puede cambiar la hora");
            console.log("- Verificar que la wallet usada sea la correcta");
        }
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