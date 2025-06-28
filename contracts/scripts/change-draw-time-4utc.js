const { ethers } = require("hardhat");

async function main() {
    console.log("⏰ CAMBIANDO HORA DE SORTEO A 4:00 UTC");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    const NEW_DRAW_HOUR = 4; // 4:00 UTC = 11:00 PM Colombia
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("🕓 Nueva hora:", NEW_DRAW_HOUR + ":00 UTC (11:00 PM Colombia)");
    
    try {
        // Obtener signer
        const [signer] = await ethers.getSigners();
        console.log("👤 Ejecutando con cuenta:", signer.address);
        
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // Verificar estado actual
        console.log("\n📋 ESTADO ACTUAL:");
        const currentDrawTimeUTC = await contract.drawTimeUTC();
        const gameActive = await contract.gameActive();
        const currentGameDay = await contract.getCurrentDay();
        
        console.log("- Hora actual:", (Number(currentDrawTimeUTC) / 3600).toFixed(0) + ":00 UTC");
        console.log("- Game Active:", gameActive);
        console.log("- Current Game Day:", currentGameDay.toString());
        
        if (!gameActive) {
            console.log("⚠️ ADVERTENCIA: El juego no está activo");
        }
        
        // Cambiar la hora
        console.log("\n🔄 CAMBIANDO HORA DE SORTEO...");
        console.log("De:", (Number(currentDrawTimeUTC) / 3600).toFixed(0) + ":00 UTC");
        console.log("A:", NEW_DRAW_HOUR + ":00 UTC");
        
        const changeTx = await contract.setDrawTimeUTC(NEW_DRAW_HOUR, {
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
        const newGameDay = await contract.getCurrentDay();
        
        console.log("- Nueva hora UTC:", (Number(newDrawTimeUTC) / 3600).toFixed(0) + ":00");
        console.log("- Nuevo Game Day:", newGameDay.toString());
        console.log("- Hora local Colombia:", getColombiaTime(Number(newDrawTimeUTC) / 3600));
        
        // Calcular próximo sorteo
        const lastDrawTime = await contract.lastDrawTime();
        const drawInterval = await contract.DRAW_INTERVAL();
        const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
        
        console.log("\n📅 CRONOGRAMA DE SORTEOS:");
        console.log("- Último sorteo:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        console.log("- Próximo sorteo:", new Date(nextDrawTime * 1000).toLocaleString());
        console.log("- Intervalo:", (Number(drawInterval) / 3600).toFixed(1), "horas");
        
        // Verificar que el cambio sea correcto
        const expectedSeconds = NEW_DRAW_HOUR * 3600;
        if (Number(newDrawTimeUTC) === expectedSeconds) {
            console.log("\n✅ CAMBIO EXITOSO!");
            console.log("🎯 Nueva configuración:");
            console.log("   • Hora UTC: " + NEW_DRAW_HOUR + ":00");
            console.log("   • Hora Colombia: 11:00 PM");
            console.log("   • Sorteos diarios a las 4:00 AM UTC");
            
            // Actualizar frontend
            console.log("\n📝 PRÓXIMOS PASOS:");
            console.log("1. ✅ Hora cambiada en el contrato");
            console.log("2. 🔄 Actualizar frontend con nueva hora");
            console.log("3. 📢 Notificar a usuarios del cambio");
            console.log("4. 🎯 Próximo sorteo será a las 4:00 UTC");
            
        } else {
            console.log("❌ ERROR: El cambio no se aplicó correctamente");
            console.log("Esperado:", expectedSeconds, "segundos");
            console.log("Obtenido:", Number(newDrawTimeUTC), "segundos");
        }
        
    } catch (error) {
        console.error("❌ Error cambiando hora:", error);
        
        if (error.message.includes("Not authorized")) {
            console.log("\n🔧 SOLUCIÓN:");
            console.log("- Verificar que estás usando la cuenta autorizada");
            console.log("- Solo el owner o el contrato mismo pueden cambiar la hora");
        } else if (error.message.includes("Invalid hour")) {
            console.log("\n🔧 SOLUCIÓN:");
            console.log("- La hora debe estar entre 0 y 23");
            console.log("- Verificar que el valor sea correcto");
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