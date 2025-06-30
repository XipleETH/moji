const { ethers } = require("hardhat");

async function main() {
    // Obtener argumentos de línea de comandos
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log("❌ Uso incorrecto");
        console.log("📖 Uso: node scripts/change-day-time.js <CONTRACT_ADDRESS> <NEW_HOUR_UTC>");
        console.log("");
        console.log("💡 Ejemplos:");
        console.log("  Para 0:00 UTC: node scripts/change-day-time.js 0x123... 0");
        console.log("  Para 4:00 UTC: node scripts/change-day-time.js 0x123... 4");
        console.log("  Para 12:00 UTC: node scripts/change-day-time.js 0x123... 12");
        console.log("  Para 20:00 UTC: node scripts/change-day-time.js 0x123... 20");
        console.log("");
        console.log("ℹ️ La hora debe estar entre 0 y 23 (formato 24 horas UTC)");
        process.exit(1);
    }
    
    const contractAddress = args[0];
    const newHour = Number(args[1]);
    
    console.log("⏰ CAMBIANDO HORA DE CAMBIO DE DÍA");
    console.log("=".repeat(45));
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    
    // Verificar balance
    const balance = await ethers.provider.getBalance(signer.address);
    console.log("💳 Balance:", ethers.formatEther(balance), "AVAX");
    
    // Conectar al contrato
    const contractFactory = await ethers.getContractFactory("LottoMojiCore");
    const contract = contractFactory.attach(contractAddress);
    
    console.log("📍 Contrato:", contractAddress);
    
    try {
        // Validar hora
        if (isNaN(newHour) || newHour < 0 || newHour > 23) {
            throw new Error("❌ Hora inválida: " + args[1] + " (debe estar entre 0 y 23)");
        }
        
        // Obtener configuración actual
        const currentDayChangeTime = await contract.dayChangeTimeUTC();
        const currentDrawTime = await contract.drawTimeUTC();
        const currentGameDay = await contract.getCurrentDay();
        
        const currentDayChangeHour = Number(currentDayChangeTime) / 3600;
        const currentDrawHour = Number(currentDrawTime) / 3600;
        
        console.log("🕐 Hora actual de cambio de día:", currentDayChangeHour + ":00 UTC");
        console.log("🎲 Hora actual de sorteo:", currentDrawHour + ":00 UTC");
        console.log("📅 Día de juego actual:", currentGameDay.toString());
        
        console.log("\n🎯 Nueva hora de cambio de día:", newHour + ":00 UTC");
        
        // Confirmar cambio
        if (currentDayChangeHour === newHour) {
            console.log("⚠️ La hora ya es la misma, no se necesita cambio");
            return;
        }
        
        console.log("\n🔄 Ejecutando cambio de hora...");
        
        // Estimar gas
        const gasEstimate = await contract.setDayChangeTimeUTC.estimateGas(newHour);
        console.log("⛽ Gas estimado:", gasEstimate.toString());
        
        // Ejecutar transacción
        const tx = await contract.setDayChangeTimeUTC(newHour, {
            gasLimit: gasEstimate + ethers.parseUnits("10000", 0) // Agregar margen de gas
        });
        
        console.log("📤 Transacción enviada:", tx.hash);
        console.log("⏳ Esperando confirmación...");
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log("✅ Transacción confirmada!");
            console.log("📋 Block:", receipt.blockNumber);
            console.log("⛽ Gas usado:", receipt.gasUsed.toString());
            
            // Verificar el cambio
            const updatedDayChangeTime = await contract.dayChangeTimeUTC();
            const updatedGameDay = await contract.getCurrentDay();
            
            const updatedDayChangeHour = Number(updatedDayChangeTime) / 3600;
            
            console.log("\n🎉 HORA DE CAMBIO DE DÍA ACTUALIZADA:");
            console.log("✅ Hora anterior:", currentDayChangeHour + ":00 UTC");
            console.log("✅ Hora nueva:", updatedDayChangeHour + ":00 UTC");
            console.log("✅ Día de juego actual:", updatedGameDay.toString());
            
            // Verificar si cambió el día de juego
            if (currentGameDay.toString() !== updatedGameDay.toString()) {
                console.log("⚠️ El día de juego cambió de", currentGameDay.toString(), "a", updatedGameDay.toString());
                console.log("💡 Esto es normal cuando se cambia la hora de cambio de día");
            }
            
            // Buscar evento emitido
            const events = receipt.logs;
            for (let event of events) {
                try {
                    const parsedEvent = contract.interface.parseLog(event);
                    if (parsedEvent.name === "DayChangeTimeUTCUpdated") {
                        const oldHour = Number(parsedEvent.args.oldTime) / 3600;
                        const newHour = Number(parsedEvent.args.newTime) / 3600;
                        const newGameDay = parsedEvent.args.newGameDay.toString();
                        console.log("📢 Evento emitido: DayChangeTimeUTCUpdated");
                        console.log("   - Hora anterior:", oldHour + ":00 UTC");
                        console.log("   - Hora nueva:", newHour + ":00 UTC");
                        console.log("   - Nuevo día de juego:", newGameDay);
                    }
                } catch (e) {
                    // Evento de otro contrato, ignorar
                }
            }
            
            console.log("\n💡 INFORMACIÓN IMPORTANTE:");
            console.log("- La hora de cambio de día es independiente de la hora de sorteo");
            console.log("- Hora de sorteo actual:", currentDrawHour + ":00 UTC");
            console.log("- Hora de cambio de día:", updatedDayChangeHour + ":00 UTC");
            console.log("- Los tickets se agrupan por día según la hora de cambio de día");
            console.log("- Los sorteos ocurren según la hora de sorteo");
            
        } else {
            throw new Error("❌ Transacción falló");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        if (error.message.includes("Not authorized")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- Solo el owner del contrato puede cambiar la hora");
            console.log("- Verifica que estés usando la cuenta correcta");
        } else if (error.message.includes("Invalid hour")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- La hora debe estar entre 0 y 23");
            console.log("- Usa formato 24 horas UTC");
        }
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 