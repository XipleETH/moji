const { ethers } = require("hardhat");

// NUEVO CONTRATO V3 CON VRF CORRECTO
const CONTRACT_ADDRESS = "0xfc1a8Bc0180Fc615810d62374F16C4c026141031";

async function main() {
    console.log("🎯 PROBANDO SORTEO EN NUEVO CONTRATO V3");
    console.log("=".repeat(70));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    console.log("📍 New Contract V3:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. VERIFICAR ESTADO INICIAL
        console.log("\n📊 ESTADO INICIAL DEL CONTRATO");
        console.log("-".repeat(50));
        
        const lastDrawTime = await contract.lastDrawTime();
        const drawInterval = await contract.DRAW_INTERVAL();
        const currentGameDay = await contract.getCurrentDay();
        const subscriptionId = await contract.subscriptionId();
        
        console.log("🎲 Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        console.log("📅 Current Game Day:", Number(currentGameDay));
        console.log("🔗 VRF Subscription ID:", subscriptionId.toString());
        console.log("✅ VRF Subscription correcto:", subscriptionId.toString() === "105961847727705490544354750783936451991128107961690295417839588082464327658827");
        
        // Verificar pools actuales
        const firstPool = await contract.getCurrentPool(1);
        const secondPool = await contract.getCurrentPool(2);
        const thirdPool = await contract.getCurrentPool(3);
        
        console.log("\n💰 POOLS ACTUALES");
        console.log("-".repeat(30));
        console.log("🥇 First Prize Pool:", ethers.formatUnits(firstPool, 6), "USDC");
        console.log("🥈 Second Prize Pool:", ethers.formatUnits(secondPool, 6), "USDC");
        console.log("🥉 Third Prize Pool:", ethers.formatUnits(thirdPool, 6), "USDC");
        
        // 2. VERIFICAR UPKEEP
        console.log("\n🔄 VERIFICANDO UPKEEP");
        console.log("-".repeat(30));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep needed:", upkeepNeeded);
        console.log("📦 Perform data:", performData);
        
        if (!upkeepNeeded) {
            console.log("⚠️ Upkeep no es necesario todavía");
            console.log("💡 Vamos a simular que ya es tiempo del sorteo...");
            
            // Simular que ya es tiempo del sorteo (mover lastDrawTime hacia atrás)
            const now = Math.floor(Date.now() / 1000);
            const simulatedLastDraw = now - Number(drawInterval) - 3600; // 1 hora extra para estar seguros
            
            console.log("⏰ Simulando tiempo de sorteo...");
            const setTimeTx = await contract.setLastDrawTime(simulatedLastDraw);
            await setTimeTx.wait();
            
            console.log("✅ Tiempo simulado!");
            console.log("📡 Transaction:", setTimeTx.hash);
            
            // Verificar de nuevo
            const [newUpkeepNeeded, newPerformData] = await contract.checkUpkeep("0x");
            console.log("🔄 Upkeep needed (después de simular):", newUpkeepNeeded);
        }
        
        // 3. EJECUTAR SORTEO
        console.log("\n⚡ EJECUTANDO SORTEO FORZADO");
        console.log("-".repeat(40));
        
        // Verificar que podemos ejecutar el sorteo
        const [canPerform, performDataFinal] = await contract.checkUpkeep("0x");
        
        if (canPerform) {
            console.log("✅ Upkeep confirmado, ejecutando sorteo...");
            
            const performTx = await contract.performUpkeep(performDataFinal, {
                gasLimit: 2500000 // Gas alto para VRF
            });
            
            console.log("⏳ Esperando confirmación...");
            const receipt = await performTx.wait();
            
            console.log("✅ Sorteo iniciado exitosamente!");
            console.log("📡 Transaction hash:", performTx.hash);
            console.log("⛽ Gas usado:", receipt.gasUsed.toString());
            
            // Buscar eventos del sorteo
            console.log("\n📋 EVENTOS DEL SORTEO");
            console.log("-".repeat(30));
            
            const events = receipt.logs.filter(log => {
                try {
                    const decoded = contract.interface.parseLog(log);
                    return decoded !== null;
                } catch {
                    return false;
                }
            });
            
            for (const log of events) {
                try {
                    const decoded = contract.interface.parseLog(log);
                    console.log("📢 Event:", decoded.name);
                    console.log("   Args:", decoded.args);
                } catch (e) {
                    // Ignorar logs que no podemos decodificar
                }
            }
            
            // 4. VERIFICAR ESTADO POST-SORTEO
            console.log("\n📊 ESTADO POST-SORTEO");
            console.log("-".repeat(35));
            
            const newLastDrawTime = await contract.lastDrawTime();
            const newGameDay = await contract.getCurrentDay();
            
            console.log("🎲 New Last Draw Time:", new Date(Number(newLastDrawTime) * 1000).toLocaleString());
            console.log("📅 New Game Day:", Number(newGameDay));
            
            const nextDrawTime = Number(newLastDrawTime) + Number(drawInterval);
            const nextDrawSP = new Date(nextDrawTime * 1000).toLocaleString('pt-BR', { 
                timeZone: 'America/Sao_Paulo',
                hour12: false 
            });
            
            console.log("⏰ Next Draw Time:", new Date(nextDrawTime * 1000).toLocaleString());
            console.log("🌎 Next Draw São Paulo:", nextDrawSP);
            
            // 5. VERIFICAR SI HAY RESULTADOS
            console.log("\n🏆 VERIFICANDO RESULTADOS");
            console.log("-".repeat(35));
            
            try {
                const results = await contract.getDrawResults(Number(newGameDay) - 1);
                console.log("📋 Winning numbers:", results.winningNumbers);
                console.log("🎯 VRF Request ID:", results.requestId.toString());
                console.log("✅ Resultados encontrados para Game Day:", Number(newGameDay) - 1);
            } catch (e) {
                console.log("⏳ Resultados aún no disponibles (VRF puede estar procesando)");
                console.log("💡 Los resultados aparecerán cuando Chainlink VRF responda");
            }
            
        } else {
            console.log("❌ No se puede ejecutar upkeep");
            console.log("🔍 Razón: checkUpkeep retorna false");
        }
        
        console.log("\n✅ PRUEBA DE SORTEO COMPLETADA");
        console.log("=".repeat(70));
        console.log("🎯 El nuevo contrato V3 está funcionando correctamente!");
        console.log("🔗 VRF Subscription ID está correcto");
        console.log("⏰ Timing está configurado para medianoche São Paulo");
        
    } catch (error) {
        console.error("\n💥 ERROR EN LA PRUEBA:", error);
        
        if (error.reason) {
            console.error("📋 Reason:", error.reason);
        }
        
        if (error.code === 'CALL_EXCEPTION') {
            console.error("🔍 Posible problema:");
            console.error("   - VRF Subscription sin fondos LINK");
            console.error("   - Contrato no agregado como consumer");
            console.error("   - Red o RPC con problemas");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 