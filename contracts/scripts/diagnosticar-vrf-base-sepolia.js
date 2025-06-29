const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 DIAGNOSTICAR VRF EN BASE SEPOLIA");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    
    console.log("📍 Contrato Base Sepolia:", CONTRACT_ADDRESS);
    console.log("🔵 Red: Base Sepolia Testnet");
    
    try {
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // 1. Obtener configuración VRF del contrato
        console.log("\n⚙️ CONFIGURACIÓN VRF DEL CONTRATO:");
        console.log("-".repeat(45));
        
        const subscriptionId = await contract.subscriptionId();
        console.log("🔗 Subscription ID:", subscriptionId.toString());
        
        // Obtener configuración hardcodeada
        console.log("📋 Configuración hardcodeada:");
        console.log("   - VRF Coordinator: (hardcodeado en el contrato)");
        console.log("   - Key Hash: (hardcodeado en el contrato)");
        console.log("   - Callback Gas Limit: 2,500,000");
        console.log("   - Request Confirmations: 1");
        console.log("   - Num Words: 4");
        
        // 2. Verificar estado del sorteo
        console.log("\n🎲 ESTADO DEL SORTEO:");
        console.log("-".repeat(30));
        
        const totalDraws = await contract.totalDrawsExecuted();
        const lastDrawTime = await contract.lastDrawTime();
        const currentGameDay = await contract.getCurrentDay();
        
        console.log("🎯 Total sorteos ejecutados:", totalDraws.toString());
        console.log("⏰ Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("📅 Game Day actual:", currentGameDay.toString());
        
        // Verificar si el sorteo del día actual está pendiente
        const dailyPools = await contract.getDailyPoolInfo(currentGameDay);
        console.log("🎲 Sorteo del día ejecutado:", dailyPools.drawn ? "✅ SÍ" : "❌ NO");
        console.log("💰 Pool del día:", ethers.formatUnits(dailyPools.totalCollected, 6), "USDC");
        
        // 3. Verificar la transacción de sorteo
        console.log("\n📊 ANÁLISIS DE LA TRANSACCIÓN:");
        console.log("-".repeat(40));
        
        const txHash = "0xdfd2e3ebb01a7e783ef8ffce988fa73beb07561db17c02e2046f91fd5c9aed95";
        console.log("📝 TX Hash:", txHash);
        console.log("🔗 Ver en BaseScan: https://sepolia.basescan.org/tx/" + txHash);
        
        try {
            const provider = contract.provider;
            const tx = await provider.getTransaction(txHash);
            if (tx) {
                console.log("✅ Transacción encontrada");
                console.log("📅 Block Number:", tx.blockNumber);
                console.log("⛽ Gas Used:", tx.gasLimit.toString());
                
                const receipt = await provider.getTransactionReceipt(txHash);
                if (receipt) {
                    console.log("✅ Transacción confirmada");
                    console.log("📊 Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
                    console.log("⛽ Gas Used:", receipt.gasUsed.toString());
                    
                    // Buscar eventos VRF
                    console.log("\n🔍 BUSCANDO EVENTOS VRF:");
                    console.log("-".repeat(35));
                    
                    let vrfRequestFound = false;
                    let vrfFulfillmentFound = false;
                    
                    for (const log of receipt.logs) {
                        // Buscar evento RandomWordsRequested
                        if (log.topics[0] === '0x7dffc5ae5ee4e2e4df1651cf6ad329a73cebdb728f37ea0187b9b17e036756e4') {
                            console.log("🎲 VRF Request encontrado:");
                            console.log("   - Request ID:", log.topics[1]);
                            vrfRequestFound = true;
                        }
                        
                        // Buscar evento RandomWordsFulfilled  
                        if (log.topics[0] === '0xfe2e2c21cff9d3f197d9187e908f1c8e2c8d0e8d9b6b5e5c2c9f7a4b6c1a0b2c') {
                            console.log("✅ VRF Fulfillment encontrado:");
                            vrfFulfillmentFound = true;
                        }
                    }
                    
                    if (vrfRequestFound && !vrfFulfillmentFound) {
                        console.log("⏳ VRF Request enviado pero no completado");
                        console.log("💡 Esto es normal - puede tomar varios minutos");
                    } else if (!vrfRequestFound) {
                        console.log("❌ No se encontró VRF Request");
                        console.log("💡 Posible problema con la configuración VRF");
                    } else if (vrfFulfillmentFound) {
                        console.log("✅ VRF completado exitosamente");
                    }
                    
                } else {
                    console.log("❌ No se pudo obtener el receipt");
                }
            } else {
                console.log("❌ Transacción no encontrada");
            }
        } catch (txError) {
            console.log("❌ Error analizando transacción:", txError.message);
        }
        
        // 4. Diagnóstico de posibles problemas
        console.log("\n🔍 DIAGNÓSTICO DE PROBLEMAS:");
        console.log("-".repeat(40));
        
        console.log("📋 Posibles causas de delay:");
        console.log("1. ⏳ VRF normal delay (1-5 minutos)");
        console.log("2. 🔗 Contrato no registrado como consumer VRF");
        console.log("3. 💰 Fondos LINK insuficientes en la suscripción");
        console.log("4. 🚫 Suscripción VRF cancelada o inactiva");
        console.log("5. ⚠️ Problemas en la red Base Sepolia VRF");
        
        console.log("\n💡 RECOMENDACIONES:");
        console.log("-".repeat(25));
        console.log("1. 🕐 Esperar 5-10 minutos más");
        console.log("2. 🔗 Verificar VRF Dashboard:");
        console.log("   https://vrf.chain.link/");
        console.log("3. 💰 Verificar fondos LINK en la suscripción");
        console.log("4. 📋 Verificar que el contrato esté como consumer");
        console.log("5. 🔄 Intentar el sorteo nuevamente si persiste");
        
        // 5. Información para seguimiento
        console.log("\n📊 INFORMACIÓN PARA SEGUIMIENTO:");
        console.log("-".repeat(45));
        console.log("📍 Contrato:", CONTRACT_ADDRESS);
        console.log("🔗 Subscription ID:", subscriptionId.toString());
        console.log("📝 TX Hash:", txHash);
        console.log("🔗 BaseScan:", "https://sepolia.basescan.org/address/" + CONTRACT_ADDRESS);
        console.log("🎲 VRF Dashboard:", "https://vrf.chain.link/");
        console.log("⏰ Tiempo transcurrido: ~5-10 minutos");
        
        // 6. Comandos para seguimiento
        console.log("\n📋 COMANDOS DE SEGUIMIENTO:");
        console.log("-".repeat(35));
        console.log("# Verificar estado nuevamente:");
        console.log("npx hardhat run scripts/verificar-sorteo-base-sepolia.js --network base-sepolia");
        console.log("");
        console.log("# Intentar otro sorteo si es necesario:");
        console.log("npx hardhat run scripts/forzar-sorteo-base-sepolia.js --network base-sepolia");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 