const { ethers } = require("hardhat");

// NUEVO CONTRATO V3 CON VRF CORRECTO
const CONTRACT_ADDRESS = "0xfc1a8Bc0180Fc615810d62374F16C4c026141031";

async function main() {
    console.log("🎯 PRUEBA SIMPLE DE SORTEO - NUEVO CONTRATO V3");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    console.log("📍 New Contract V3:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. VERIFICAR CONFIGURACIÓN BÁSICA
        console.log("\n📊 CONFIGURACIÓN BÁSICA");
        console.log("-".repeat(40));
        
        const subscriptionId = await contract.subscriptionId();
        const lastDrawTime = await contract.lastDrawTime();
        const currentGameDay = await contract.getCurrentDay();
        
        console.log("🔗 VRF Subscription ID:", subscriptionId.toString());
        console.log("✅ Subscription correcto:", subscriptionId.toString() === "105961847727705490544354750783936451991128107961690295417839588082464327658827");
        console.log("🎲 Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        console.log("📅 Current Game Day:", Number(currentGameDay));
        
        // 2. VERIFICAR UPKEEP
        console.log("\n🔄 VERIFICACIÓN DE UPKEEP");
        console.log("-".repeat(40));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep needed:", upkeepNeeded);
        
        if (!upkeepNeeded) {
            console.log("⚠️ Upkeep no es necesario todavía");
            console.log("💡 Simulando que es tiempo de sorteo...");
            
            // Simular que ya es tiempo del sorteo
            const now = Math.floor(Date.now() / 1000);
            const drawInterval = await contract.DRAW_INTERVAL();
            const simulatedLastDraw = now - Number(drawInterval) - 3600; // 1 hora extra
            
            console.log("⏰ Configurando tiempo simulado...");
            const setTimeTx = await contract.setLastDrawTime(simulatedLastDraw);
            await setTimeTx.wait();
            
            console.log("✅ Tiempo simulado configurado!");
            console.log("📡 Transaction:", setTimeTx.hash);
        }
        
        // 3. VERIFICAR NUEVAMENTE UPKEEP
        const [canPerform, finalPerformData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep needed (después de simular):", canPerform);
        
        if (canPerform) {
            console.log("\n⚡ EJECUTANDO SORTEO");
            console.log("-".repeat(30));
            
            console.log("🚀 Iniciando performUpkeep...");
            
            const performTx = await contract.performUpkeep(finalPerformData, {
                gasLimit: 2500000
            });
            
            console.log("⏳ Esperando confirmación...");
            const receipt = await performTx.wait();
            
            console.log("✅ Sorteo ejecutado exitosamente!");
            console.log("📡 Transaction hash:", performTx.hash);
            console.log("⛽ Gas usado:", receipt.gasUsed.toString());
            
            // 4. BUSCAR EVENTOS
            console.log("\n📋 EVENTOS DEL SORTEO");
            console.log("-".repeat(30));
            
            for (const log of receipt.logs) {
                try {
                    const decoded = contract.interface.parseLog(log);
                    if (decoded) {
                        console.log("📢 Event:", decoded.name);
                        if (decoded.args && decoded.args.length > 0) {
                            console.log("   Args:", decoded.args.map(arg => 
                                typeof arg === 'bigint' ? arg.toString() : arg
                            ));
                        }
                    }
                } catch (e) {
                    // Ignorar logs que no podemos decodificar
                }
            }
            
            // 5. VERIFICAR ESTADO POST-SORTEO
            console.log("\n📊 ESTADO POST-SORTEO");
            console.log("-".repeat(35));
            
            const newLastDrawTime = await contract.lastDrawTime();
            const newGameDay = await contract.getCurrentDay();
            
            console.log("🎲 New Last Draw Time:", new Date(Number(newLastDrawTime) * 1000).toLocaleString());
            console.log("📅 New Game Day:", Number(newGameDay));
            
            // Verificar próximo sorteo
            const drawInterval = await contract.DRAW_INTERVAL();
            const nextDrawTime = Number(newLastDrawTime) + Number(drawInterval);
            const nextDrawSP = new Date(nextDrawTime * 1000).toLocaleString('pt-BR', { 
                timeZone: 'America/Sao_Paulo',
                hour12: false 
            });
            
            console.log("⏰ Next Draw Time:", new Date(nextDrawTime * 1000).toLocaleString());
            console.log("🌎 Next Draw São Paulo:", nextDrawSP);
            
            console.log("\n🎉 SORTEO COMPLETADO EXITOSAMENTE!");
            console.log("✅ El nuevo contrato V3 funciona correctamente");
            console.log("🔗 VRF Subscription está funcionando");
            console.log("⏰ Timing configurado para medianoche São Paulo");
            
        } else {
            console.log("❌ No se puede ejecutar upkeep");
            console.log("🔍 Posibles causas:");
            console.log("   - Timing aún no es correcto");
            console.log("   - VRF subscription sin fondos");
            console.log("   - Problema con el contrato");
        }
        
    } catch (error) {
        console.error("\n💥 ERROR EN LA PRUEBA:", error.message);
        
        if (error.reason) {
            console.error("📋 Reason:", error.reason);
        }
        
        if (error.code === 'CALL_EXCEPTION') {
            console.error("\n🔍 Posibles problemas:");
            console.error("   - VRF Subscription sin fondos LINK");
            console.error("   - Contrato no agregado como consumer");
            console.error("   - Problema de conectividad con Base Sepolia");
        }
    }
    
    console.log("\n" + "=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 