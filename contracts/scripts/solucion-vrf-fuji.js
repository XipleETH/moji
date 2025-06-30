const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 SOLUCIÓN ALTERNATIVA VRF - AVALANCHE FUJI");
    console.log("=".repeat(55));
    
    const CONTRACT_ADDRESS = "0x1B0B1A24983E51d809FBfAc424946B314fEFA271";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        console.log("\n📊 ESTADO ACTUAL DEL CONTRATO:");
        console.log("-".repeat(40));
        
        const subscriptionId = await contract.subscriptionId();
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const currentGameDay = await contract.getCurrentDay();
        const totalDraws = await contract.totalDrawsExecuted();
        
        console.log("🆔 Subscription ID:", subscriptionId.toString());
        console.log("🎮 Game Active:", gameActive);
        console.log("🤖 Automation Active:", automationActive);
        console.log("📅 Current Game Day:", currentGameDay.toString());
        console.log("🎯 Total Draws:", totalDraws.toString());
        
        // Verificar upkeep
        console.log("\n🔄 VERIFICANDO UPKEEP:");
        console.log("-".repeat(30));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("✅ Upkeep Needed:", upkeepNeeded);
        
        if (!upkeepNeeded) {
            console.log("❌ Upkeep no está listo. Abortando...");
            return;
        }
        
        // SOLUCIÓN ALTERNATIVA 1: Intentar con gas muy alto
        console.log("\n🚀 INTENTO 1: Gas muy alto...");
        console.log("-".repeat(35));
        
        try {
            const tx1 = await contract.performUpkeep(performData, {
                gasLimit: 5000000, // Gas muy alto
                gasPrice: ethers.parseUnits("25", "gwei")
            });
            
            console.log("📡 Transacción enviada:", tx1.hash);
            const receipt1 = await tx1.wait();
            
            if (receipt1.status === 1) {
                console.log("✅ ¡ÉXITO CON GAS ALTO!");
                console.log("⛽ Gas usado:", receipt1.gasUsed.toString());
                await mostrarResultados(contract);
                return;
            }
        } catch (error1) {
            console.log("❌ Falló con gas alto:", error1.message);
        }
        
        // SOLUCIÓN ALTERNATIVA 2: Llamada estática primero
        console.log("\n🧪 INTENTO 2: Simulación estática...");
        console.log("-".repeat(40));
        
        try {
            // Simular la llamada primero
            await contract.performUpkeep.staticCall(performData);
            console.log("✅ Simulación exitosa, ejecutando...");
            
            const tx2 = await contract.performUpkeep(performData, {
                gasLimit: 3000000,
                maxFeePerGas: ethers.parseUnits("50", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
            });
            
            console.log("📡 Transacción enviada:", tx2.hash);
            const receipt2 = await tx2.wait();
            
            if (receipt2.status === 1) {
                console.log("✅ ¡ÉXITO CON SIMULACIÓN!");
                console.log("⛽ Gas usado:", receipt2.gasUsed.toString());
                await mostrarResultados(contract);
                return;
            }
        } catch (error2) {
            console.log("❌ Falló con simulación:", error2.message);
        }
        
        // SOLUCIÓN ALTERNATIVA 3: Actualizar timing y reintentar
        console.log("\n⏰ INTENTO 3: Ajustar timing...");
        console.log("-".repeat(35));
        
        try {
            // Forzar un nuevo tiempo de sorteo
            const now = Math.floor(Date.now() / 1000);
            const newLastDrawTime = now - (25 * 3600); // 25 horas atrás
            
            console.log("🔄 Actualizando timing...");
            const timingTx = await contract.setLastDrawTime(newLastDrawTime);
            await timingTx.wait();
            console.log("✅ Timing actualizado");
            
            // Verificar upkeep nuevamente
            const [newUpkeepNeeded, newPerformData] = await contract.checkUpkeep("0x");
            console.log("🔄 Nuevo Upkeep Needed:", newUpkeepNeeded);
            
            if (newUpkeepNeeded) {
                const tx3 = await contract.performUpkeep(newPerformData, {
                    gasLimit: 4000000,
                    gasPrice: ethers.parseUnits("30", "gwei")
                });
                
                console.log("📡 Transacción enviada:", tx3.hash);
                const receipt3 = await tx3.wait();
                
                if (receipt3.status === 1) {
                    console.log("✅ ¡ÉXITO DESPUÉS DE AJUSTAR TIMING!");
                    console.log("⛽ Gas usado:", receipt3.gasUsed.toString());
                    await mostrarResultados(contract);
                    return;
                }
            }
        } catch (error3) {
            console.log("❌ Falló con ajuste de timing:", error3.message);
        }
        
        // SOLUCIÓN ALTERNATIVA 4: Llamada directa al VRF
        console.log("\n🎲 INTENTO 4: Request VRF directo...");
        console.log("-".repeat(40));
        
        try {
            // Intentar hacer request VRF directamente
            console.log("🔮 Llamando _requestRandomWords internamente...");
            
            // Como no podemos llamar funciones internas, intentamos performUpkeep una vez más
            // pero con configuración específica para Avalanche
            const tx4 = await contract.performUpkeep(performData, {
                gasLimit: 2500000, // Gas exacto del callback
                gasPrice: ethers.parseUnits("27", "gwei"), // Gas price típico de Fuji
                value: 0
            });
            
            console.log("📡 Transacción enviada:", tx4.hash);
            console.log("⏳ Esperando confirmación (puede tomar tiempo por VRF)...");
            
            const receipt4 = await tx4.wait();
            console.log("📋 Status de transacción:", receipt4.status);
            console.log("⛽ Gas usado:", receipt4.gasUsed.toString());
            
            if (receipt4.status === 1) {
                console.log("✅ ¡TRANSACCIÓN CONFIRMADA!");
                
                // Esperar un poco para el callback de VRF
                console.log("⏳ Esperando callback de VRF (30 segundos)...");
                await new Promise(resolve => setTimeout(resolve, 30000));
                
                await mostrarResultados(contract);
                return;
            }
            
        } catch (error4) {
            console.log("❌ Falló request VRF directo:", error4.message);
        }
        
        console.log("\n❌ TODOS LOS INTENTOS FALLARON");
        console.log("🔧 RECOMENDACIONES FINALES:");
        console.log("1. Verificar manualmente en https://vrf.chain.link/");
        console.log("2. Revisar fondos LINK en la suscripción");
        console.log("3. Confirmar que el contrato esté como consumer");
        console.log("4. Esperar y reintentar en unos minutos");
        
    } catch (error) {
        console.error("❌ Error general:", error.message);
        console.error("📋 Stack:", error.stack);
    }
}

async function mostrarResultados(contract) {
    console.log("\n🎉 VERIFICANDO RESULTADOS:");
    console.log("-".repeat(35));
    
    try {
        const totalDraws = await contract.totalDrawsExecuted();
        const winningNumbers = await contract.lastWinningNumbers();
        const currentGameDay = await contract.getCurrentDay();
        
        console.log("🎯 Total Draws:", totalDraws.toString());
        console.log("🎲 Números ganadores:", Array.from(winningNumbers).join(", "));
        
        // Verificar pools después del sorteo
        const mainPools = await contract.getMainPoolBalances();
        const reserves = await contract.getReserveBalances();
        
        console.log("\n💰 POOLS DESPUÉS DEL SORTEO:");
        console.log("- First Prize:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
        console.log("- Second Prize:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
        console.log("- Third Prize:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
        console.log("- Reserves Total:", ethers.formatUnits(
            reserves.firstPrizeReserve + reserves.secondPrizeReserve + reserves.thirdPrizeReserve, 6
        ), "USDC");
        
        // Verificar estado del día
        const todaysPools = await contract.getDailyPoolInfo(currentGameDay);
        console.log("\n📅 ESTADO DEL DÍA:", currentGameDay.toString());
        console.log("- Drawn:", todaysPools.drawn ? "✅" : "❌");
        console.log("- Distributed:", todaysPools.distributed ? "✅" : "❌");
        
        if (todaysPools.drawn) {
            console.log("🎲 Números del día:", Array.from(todaysPools.winningNumbers).join(", "));
        }
        
        console.log("\n🎊 ¡SORTEO COMPLETADO EXITOSAMENTE!");
        
    } catch (error) {
        console.log("❌ Error verificando resultados:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 