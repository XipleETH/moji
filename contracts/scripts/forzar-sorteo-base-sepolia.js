const { ethers } = require("hardhat");

async function main() {
    console.log("🔵 FORZAR SORTEO EN BASE SEPOLIA");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Ejecutando con cuenta:", signer.address);
    console.log("📍 Contrato Base Sepolia:", CONTRACT_ADDRESS);
    console.log("🔵 Red: Base Sepolia Testnet");
    
    try {
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // 1. Verificar estado previo
        console.log("\n📊 ESTADO PREVIO AL SORTEO:");
        console.log("-".repeat(35));
        
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        const totalDraws = await contract.totalDrawsExecuted();
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const ticketCounter = await contract.ticketCounter();
        
        console.log("📅 Current Game Day:", currentGameDay.toString());
        console.log("🎫 Tickets vendidos:", ticketCounter.toString());
        console.log("🎯 Sorteos ejecutados:", totalDraws.toString());
        console.log("⏰ Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("🎮 Game Active:", gameActive ? "✅" : "❌");
        console.log("🤖 Automation Active:", automationActive ? "✅" : "❌");
        
        // 2. Verificar upkeep
        console.log("\n🔄 VERIFICACIÓN DE UPKEEP:");
        console.log("-".repeat(35));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep Needed:", upkeepNeeded ? "✅ SÍ" : "❌ NO");
        
        if (!gameActive) {
            console.log("❌ El juego no está activo. Abortando...");
            return;
        }
        
        if (ticketCounter.toString() === "0") {
            console.log("❌ No hay tickets vendidos. Abortando...");
            return;
        }
        
        // 3. Intentar diferentes métodos de forzar sorteo
        console.log("\n🚀 INTENTANDO FORZAR SORTEO:");
        console.log("-".repeat(40));
        
        if (upkeepNeeded) {
            console.log("✅ Upkeep necesario - ejecutando performUpkeep...");
            
            try {
                const performTx = await contract.performUpkeep(performData, {
                    gasLimit: 3000000
                });
                console.log("📝 Transacción enviada:", performTx.hash);
                
                console.log("⏳ Esperando confirmación...");
                const receipt = await performTx.wait();
                
                if (receipt.status === 1) {
                    console.log("✅ performUpkeep ejecutado exitosamente");
                    console.log("🎲 Sorteo iniciado - esperando VRF callback...");
                    
                    // Esperar un poco para el callback VRF
                    console.log("⏳ Esperando 30 segundos para VRF callback...");
                    await new Promise(resolve => setTimeout(resolve, 30000));
                    
                } else {
                    console.log("❌ performUpkeep falló");
                }
            } catch (error) {
                console.log("❌ Error en performUpkeep:", error.message);
            }
        } else {
            console.log("❌ Upkeep no necesario actualmente");
            
            // Intentar ajustar el tiempo
            console.log("\n🕐 AJUSTANDO TIEMPO PARA FORZAR SORTEO:");
            console.log("-".repeat(50));
            
            const currentTime = Math.floor(Date.now() / 1000);
            const newLastDrawTime = currentTime - (25 * 60 * 60); // 25 horas atrás
            
            console.log("Ajustando lastDrawTime a:", new Date(newLastDrawTime * 1000).toISOString());
            
            try {
                const setTimeTx = await contract.setLastDrawTime(newLastDrawTime, {
                    gasLimit: 100000
                });
                await setTimeTx.wait();
                console.log("✅ Tiempo ajustado");
                
                // Verificar upkeep nuevamente
                const [newUpkeepNeeded, newPerformData] = await contract.checkUpkeep("0x");
                console.log("🔄 Upkeep necesario ahora:", newUpkeepNeeded ? "✅ SÍ" : "❌ NO");
                
                if (newUpkeepNeeded) {
                    console.log("🚀 Ejecutando sorteo forzado...");
                    
                    const performTx = await contract.performUpkeep(newPerformData, {
                        gasLimit: 3000000
                    });
                    console.log("📝 Transacción enviada:", performTx.hash);
                    
                    const receipt = await performTx.wait();
                    if (receipt.status === 1) {
                        console.log("✅ Sorteo forzado ejecutado exitosamente");
                        console.log("🎲 Esperando VRF callback...");
                        
                        // Esperar para VRF callback
                        console.log("⏳ Esperando 30 segundos para VRF callback...");
                        await new Promise(resolve => setTimeout(resolve, 30000));
                    }
                }
            } catch (error) {
                console.log("❌ Error ajustando tiempo:", error.message);
            }
        }
        
        // 4. Verificar resultado final
        console.log("\n📊 ESTADO DESPUÉS DEL SORTEO:");
        console.log("-".repeat(40));
        
        const finalTotalDraws = await contract.totalDrawsExecuted();
        const finalLastDrawTime = await contract.lastDrawTime();
        const finalGameDay = await contract.getCurrentDay();
        
        console.log("🎯 Sorteos ejecutados:", finalTotalDraws.toString());
        console.log("⏰ Último sorteo:", new Date(Number(finalLastDrawTime) * 1000).toISOString());
        console.log("📅 Game Day actual:", finalGameDay.toString());
        
        // Verificar si el sorteo fue exitoso
        if (Number(finalTotalDraws) > Number(totalDraws)) {
            console.log("\n🎉 ¡SORTEO EJECUTADO EXITOSAMENTE!");
            console.log("✅ Total de sorteos incrementado");
            console.log("✅ VRF funcionando correctamente");
            
            // Verificar números ganadores si están disponibles
            try {
                const dailyPools = await contract.getDailyPoolInfo(finalGameDay);
                if (dailyPools.drawn) {
                    console.log("🎲 Números ganadores:", Array.from(dailyPools.winningNumbers).join(", "));
                }
            } catch (error) {
                console.log("ℹ️ No se pudieron obtener los números ganadores");
            }
            
        } else {
            console.log("\n⚠️ El sorteo podría estar pendiente...");
            console.log("💡 El VRF callback puede tomar unos minutos");
            console.log("🔄 Verifica el estado en unos minutos");
        }
        
        console.log("\n🔗 ENLACES:");
        console.log("• Contrato: https://sepolia.basescan.org/address/" + CONTRACT_ADDRESS);
        console.log("• VRF Dashboard: https://vrf.chain.link/");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        if (error.message.includes("Automation paused")) {
            console.log("💡 El automation está pausado");
        } else if (error.message.includes("Not authorized")) {
            console.log("💡 No tienes autorización para esta función");
        } else if (error.message.includes("insufficient funds")) {
            console.log("💡 Fondos insuficientes para gas");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 