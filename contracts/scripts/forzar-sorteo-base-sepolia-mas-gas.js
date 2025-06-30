const { ethers } = require("hardhat");

async function main() {
    console.log("🔵 FORZAR SORTEO EN BASE SEPOLIA - CON MÁS GAS");
    console.log("=".repeat(55));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Ejecutando con cuenta:", signer.address);
    console.log("📍 Contrato Base Sepolia:", CONTRACT_ADDRESS);
    console.log("🔵 Red: Base Sepolia Testnet");
    
    // Analizar transacción fallida
    const failedTxHash = "0x3609c115642418f8891555c76cbdcc39992da7f07cb0e1f8111637583677977e";
    console.log("❌ TX fallida (out of gas):", failedTxHash);
    console.log("🔗 Ver en BaseScan: https://sepolia.basescan.org/tx/" + failedTxHash);
    
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
        
        // 2. Calcular gas necesario
        console.log("\n⛽ CÁLCULO DE GAS:");
        console.log("-".repeat(25));
        
        const ticketsCount = Number(ticketCounter);
        console.log("🎫 Tickets a procesar:", ticketsCount);
        
        // Estimación: ~2000 gas por ticket + ~1M gas base + ~1M gas VRF
        const estimatedGas = Math.max(5000000, ticketsCount * 2000 + 2000000);
        console.log("⛽ Gas estimado necesario:", estimatedGas.toLocaleString());
        console.log("⛽ Gas limit a usar:", Math.min(estimatedGas * 1.5, 8000000).toLocaleString());
        
        const gasLimit = Math.min(Math.floor(estimatedGas * 1.5), 8000000);
        
        // 3. Verificar balance ETH
        const balance = await signer.provider.getBalance(signer.address);
        const balanceEth = ethers.formatEther(balance);
        console.log("💰 Balance ETH:", balanceEth);
        
        if (Number(balanceEth) < 0.01) {
            console.log("❌ Balance ETH insuficiente para gas");
            console.log("💡 Necesitas al menos 0.01 ETH en Base Sepolia");
            return;
        }
        
        // 4. Verificar upkeep
        console.log("\n🔄 VERIFICACIÓN DE UPKEEP:");
        console.log("-".repeat(35));
        
        let [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep Needed:", upkeepNeeded ? "✅ SÍ" : "❌ NO");
        
        if (!gameActive) {
            console.log("❌ El juego no está activo. Abortando...");
            return;
        }
        
        if (ticketCounter.toString() === "0") {
            console.log("❌ No hay tickets vendidos. Abortando...");
            return;
        }
        
        // 5. Forzar sorteo con gas suficiente
        console.log("\n🚀 EJECUTANDO SORTEO CON MÁS GAS:");
        console.log("-".repeat(45));
        
        if (!upkeepNeeded) {
            // Ajustar tiempo primero
            const currentTime = Math.floor(Date.now() / 1000);
            const newLastDrawTime = currentTime - (25 * 60 * 60); // 25 horas atrás
            
            console.log("🕐 Ajustando tiempo para forzar upkeep...");
            const setTimeTx = await contract.setLastDrawTime(newLastDrawTime, {
                gasLimit: 100000
            });
            await setTimeTx.wait();
            console.log("✅ Tiempo ajustado");
            
            // Verificar upkeep nuevamente
            const [newUpkeepNeeded, newPerformData] = await contract.checkUpkeep("0x");
            if (newUpkeepNeeded) {
                upkeepNeeded = newUpkeepNeeded;
                performData = newPerformData;
            }
        }
        
        if (upkeepNeeded) {
            console.log("🚀 Ejecutando performUpkeep con gas limit:", gasLimit.toLocaleString());
            console.log("⏳ Esto puede tomar varios minutos...");
            
            try {
                // Intentar con gas alto
                const performTx = await contract.performUpkeep(performData, {
                    gasLimit: gasLimit,
                    maxFeePerGas: ethers.parseUnits("20", "gwei"), // Gas price más alto
                    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
                });
                
                console.log("📝 Transacción enviada:", performTx.hash);
                console.log("🔗 Ver progreso: https://sepolia.basescan.org/tx/" + performTx.hash);
                
                console.log("⏳ Esperando confirmación (puede tomar varios minutos)...");
                const receipt = await performTx.wait();
                
                if (receipt.status === 1) {
                    console.log("✅ performUpkeep ejecutado exitosamente!");
                    console.log("⛽ Gas usado:", receipt.gasUsed.toString());
                    console.log("🎲 Sorteo iniciado - esperando VRF callback...");
                    
                    // Esperar para VRF callback
                    console.log("⏳ Esperando 60 segundos para VRF callback...");
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    
                } else {
                    console.log("❌ performUpkeep falló");
                }
            } catch (error) {
                console.log("❌ Error en performUpkeep:", error.message);
                
                if (error.message.includes("gas")) {
                    console.log("💡 Aún hay problemas de gas. Intenta con:");
                    console.log("   - Más balance ETH");
                    console.log("   - Gas price más alto");
                    console.log("   - Menos tickets (si es posible)");
                }
            }
        } else {
            console.log("❌ No se pudo activar el upkeep");
        }
        
        // 6. Verificar resultado final
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
            console.log("✅ Gas suficiente para completar operación");
            
            try {
                const dailyPools = await contract.getDailyPoolInfo(finalGameDay);
                if (dailyPools.drawn) {
                    console.log("🎲 Números ganadores:", Array.from(dailyPools.winningNumbers).join(", "));
                }
            } catch (error) {
                console.log("ℹ️ Números ganadores pendientes (VRF callback)");
            }
            
        } else {
            console.log("\n⚠️ El sorteo podría estar pendiente...");
            console.log("💡 Verifica el VRF callback en unos minutos");
        }
        
        console.log("\n🔗 ENLACES:");
        console.log("• Contrato: https://sepolia.basescan.org/address/" + CONTRACT_ADDRESS);
        console.log("• VRF Dashboard: https://vrf.chain.link/");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        if (error.message.includes("gas")) {
            console.log("💡 Problema de gas detectado");
            console.log("🔧 Soluciones:");
            console.log("   1. Aumentar balance ETH");
            console.log("   2. Usar gas price más alto");
            console.log("   3. Dividir operación en pasos más pequeños");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 