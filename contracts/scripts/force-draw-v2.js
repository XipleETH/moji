const { ethers } = require("hardhat");

async function main() {
    // Obtener argumentos de línea de comandos
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log("❌ Uso incorrecto");
        console.log("📖 Uso: node scripts/force-draw-v2.js <CONTRACT_ADDRESS>");
        console.log("");
        console.log("💡 Ejemplo:");
        console.log("  node scripts/force-draw-v2.js 0x836AB58c7B98363b263581cDA17202ac50Cb63ed");
        process.exit(1);
    }
    
    const contractAddress = args[0];
    
    console.log("🎲 FORZANDO SORTEO - CONTRATO V2");
    console.log("=".repeat(50));
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    
    // Verificar balance
    const balance = await ethers.provider.getBalance(signer.address);
    console.log("💳 Balance:", ethers.formatEther(balance), "AVAX");
    
    console.log("📍 Contrato:", contractAddress);
    
    try {
        console.log("🔗 Conectando al contrato...");
        
        // Conectar al contrato con reintentos
        let contract;
        let connectionAttempts = 0;
        const maxAttempts = 3;
        
        while (connectionAttempts < maxAttempts) {
            try {
                const contractFactory = await ethers.getContractFactory("LottoMojiCore");
                contract = contractFactory.attach(contractAddress);
                
                // Probar una llamada simple para verificar conexión
                await contract.gameActive();
                console.log("✅ Conexión al contrato exitosa");
                break;
                
            } catch (connectionError) {
                connectionAttempts++;
                console.log(`⚠️ Intento ${connectionAttempts}/${maxAttempts} - Error de conexión:`, connectionError.message);
                
                if (connectionAttempts < maxAttempts) {
                    console.log("⏳ Esperando 5 segundos antes del siguiente intento...");
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    throw new Error("❌ No se pudo conectar al contrato después de " + maxAttempts + " intentos");
                }
            }
        }
        
        console.log("\n📊 VERIFICANDO ESTADO ACTUAL:");
        console.log("-".repeat(35));
        
        // Verificar estado básico
        try {
            const gameActive = await contract.gameActive();
            const automationActive = await contract.automationActive();
            const emergencyPause = await contract.emergencyPause();
            
            console.log("🎯 Game Active:", gameActive ? "✅ SÍ" : "❌ NO");
            console.log("🤖 Automation Active:", automationActive ? "✅ SÍ" : "❌ NO");
            console.log("⏸️ Emergency Pause:", emergencyPause ? "⚠️ PAUSADO" : "✅ NORMAL");
            
            if (!gameActive) {
                throw new Error("❌ El juego no está activo");
            }
            
            if (emergencyPause) {
                throw new Error("❌ El contrato está en pausa de emergencia");
            }
            
        } catch (stateError) {
            console.log("⚠️ Error verificando estado:", stateError.message);
            console.log("💡 Continuando con el sorteo forzado...");
        }
        
        // Verificar timing
        try {
            const currentGameDay = await contract.getCurrentDay();
            const lastDrawTime = await contract.lastDrawTime();
            const drawTimeUTC = await contract.drawTimeUTC();
            
            console.log("📅 Día de juego actual:", currentGameDay.toString());
            
            const lastDrawDate = new Date(Number(lastDrawTime) * 1000);
            console.log("🕐 Último sorteo:", lastDrawDate.toUTCString());
            
            const drawHours = Math.floor(Number(drawTimeUTC) / 3600);
            const drawMinutes = Math.floor((Number(drawTimeUTC) % 3600) / 60);
            console.log("⏰ Hora configurada:", drawHours + ":" + drawMinutes.toString().padStart(2, '0'), "UTC");
            
        } catch (timingError) {
            console.log("⚠️ Error verificando timing:", timingError.message);
        }
        
        // Verificar tickets vendidos
        try {
            const ticketCounter = await contract.ticketCounter();
            console.log("🎫 Total tickets vendidos:", ticketCounter.toString());
            
            if (Number(ticketCounter) === 0) {
                console.log("⚠️ No hay tickets vendidos, pero continuamos con el sorteo");
            }
            
        } catch (ticketError) {
            console.log("⚠️ Error verificando tickets:", ticketError.message);
        }
        
        console.log("\n🎲 FORZANDO SORTEO:");
        console.log("-".repeat(25));
        
        // Método 1: Intentar performUpkeep directo
        console.log("🔄 Método 1: Intentando performUpkeep directo...");
        
        try {
            // Verificar si necesita upkeep
            const checkResult = await contract.checkUpkeep("0x");
            console.log("🔍 CheckUpkeep result:", checkResult[0] ? "✅ NECESARIO" : "❌ NO NECESARIO");
            
            if (checkResult[0]) {
                console.log("✅ El contrato indica que necesita upkeep, ejecutando...");
                
                // Estimar gas
                const gasEstimate = await contract.performUpkeep.estimateGas("0x01");
                console.log("⛽ Gas estimado:", gasEstimate.toString());
                
                // Ejecutar performUpkeep
                const tx = await contract.performUpkeep("0x01", {
                    gasLimit: gasEstimate + ethers.parseUnits("50000", 0) // Margen de gas
                });
                
                console.log("📤 Transacción enviada:", tx.hash);
                console.log("⏳ Esperando confirmación...");
                
                const receipt = await tx.wait();
                
                if (receipt.status === 1) {
                    console.log("✅ PerformUpkeep ejecutado exitosamente!");
                    console.log("📋 Block:", receipt.blockNumber);
                    console.log("⛽ Gas usado:", receipt.gasUsed.toString());
                    
                    console.log("\n🎯 SORTEO INICIADO:");
                    console.log("- Se solicitaron números aleatorios al VRF");
                    console.log("- Espera ~2-5 minutos para el callback");
                    console.log("- El sorteo se completará automáticamente");
                    
                } else {
                    throw new Error("❌ PerformUpkeep falló");
                }
                
            } else {
                console.log("⚠️ El contrato indica que NO necesita upkeep");
                console.log("💡 Esto puede ser porque:");
                console.log("   - Ya se ejecutó un sorteo hoy");
                console.log("   - No es la hora correcta");
                console.log("   - El automation está desactivado");
                
                // Método 2: Ajustar el timing y forzar
                console.log("\n🔄 Método 2: Ajustando timing y forzando...");
                
                try {
                    console.log("⏰ Ajustando lastDrawTime para permitir sorteo...");
                    
                    // Calcular timestamp que permita sorteo inmediato
                    const currentTime = Math.floor(Date.now() / 1000);
                    const newLastDrawTime = currentTime - (25 * 3600); // 25 horas atrás
                    
                    console.log("🔧 Estableciendo lastDrawTime a:", new Date(newLastDrawTime * 1000).toUTCString());
                    
                    // Estimar gas para setLastDrawTime
                    const gasEstimateTime = await contract.setLastDrawTime.estimateGas(newLastDrawTime);
                    console.log("⛽ Gas estimado para timing:", gasEstimateTime.toString());
                    
                    // Ejecutar setLastDrawTime
                    const timeTx = await contract.setLastDrawTime(newLastDrawTime, {
                        gasLimit: gasEstimateTime + ethers.parseUnits("10000", 0)
                    });
                    
                    console.log("📤 Ajustando timing - TX:", timeTx.hash);
                    console.log("⏳ Esperando confirmación...");
                    
                    const timeReceipt = await timeTx.wait();
                    
                    if (timeReceipt.status === 1) {
                        console.log("✅ Timing ajustado exitosamente!");
                        
                        // Esperar un momento
                        console.log("⏳ Esperando 3 segundos...");
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // Intentar performUpkeep nuevamente
                        console.log("🔄 Intentando performUpkeep nuevamente...");
                        
                        const checkResult2 = await contract.checkUpkeep("0x");
                        console.log("🔍 CheckUpkeep result (después del ajuste):", checkResult2[0] ? "✅ NECESARIO" : "❌ NO NECESARIO");
                        
                        if (checkResult2[0]) {
                            const gasEstimate2 = await contract.performUpkeep.estimateGas("0x01");
                            console.log("⛽ Gas estimado:", gasEstimate2.toString());
                            
                            const tx2 = await contract.performUpkeep("0x01", {
                                gasLimit: gasEstimate2 + ethers.parseUnits("50000", 0)
                            });
                            
                            console.log("📤 Transacción enviada:", tx2.hash);
                            console.log("⏳ Esperando confirmación...");
                            
                            const receipt2 = await tx2.wait();
                            
                            if (receipt2.status === 1) {
                                console.log("✅ ¡SORTEO FORZADO EXITOSAMENTE!");
                                console.log("📋 Block:", receipt2.blockNumber);
                                console.log("⛽ Gas usado:", receipt2.gasUsed.toString());
                                
                                console.log("\n🎯 RESULTADO:");
                                console.log("✅ Se ajustó el timing del contrato");
                                console.log("✅ Se ejecutó performUpkeep exitosamente");
                                console.log("✅ Se solicitaron números aleatorios al VRF");
                                console.log("⏳ Esperando callback del VRF (~2-5 minutos)");
                                
                            } else {
                                throw new Error("❌ Segundo intento de performUpkeep falló");
                            }
                        } else {
                            console.log("❌ Incluso después del ajuste, no se necesita upkeep");
                        }
                        
                    } else {
                        throw new Error("❌ No se pudo ajustar el timing");
                    }
                    
                } catch (timingError) {
                    console.log("❌ Error en método 2:", timingError.message);
                }
            }
            
        } catch (upkeepError) {
            console.log("❌ Error en performUpkeep:", upkeepError.message);
            
            if (upkeepError.message.includes("Not authorized")) {
                console.log("\n💡 SOLUCIÓN:");
                console.log("- Solo el owner del contrato puede ejecutar funciones admin");
                console.log("- Verifica que estés usando la cuenta correcta");
            } else if (upkeepError.message.includes("Automation paused")) {
                console.log("\n💡 SOLUCIÓN:");
                console.log("- El automation está pausado");
                console.log("- Activa el automation primero");
            }
        }
        
    } catch (error) {
        console.error("❌ Error general:", error.message);
        
        if (error.message.includes("could not decode result data")) {
            console.log("\n💡 POSIBLES CAUSAS:");
            console.log("- El contrato aún no se ha propagado en la red");
            console.log("- Espera 1-2 minutos más y vuelve a intentar");
            console.log("- Verifica la dirección del contrato");
        }
        
        process.exit(1);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("🎲 OPERACIÓN DE SORTEO COMPLETADA");
    console.log("📍 Contrato:", contractAddress);
    console.log("🔗 Verificar en explorador: https://testnet.snowtrace.io/address/" + contractAddress);
    console.log("=".repeat(50));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 