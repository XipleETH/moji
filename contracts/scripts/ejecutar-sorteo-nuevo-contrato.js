const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 EJECUTAR SORTEO - NUEVO CONTRATO AVALANCHE FUJI");
    console.log("=".repeat(60));
    
    // NUEVO CONTRATO CON CONFIGURACIÓN VRF CORRECTA
    const CONTRACT_ADDRESS = "0xe980475E4aF2f0B937059E9394262b36827B215F";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Ejecutando con cuenta:", signer.address);
    console.log("📍 Nuevo Contrato:", CONTRACT_ADDRESS);
    console.log("🏔️ Red: Avalanche Fuji Testnet");
    
    try {
        // Conectar al nuevo contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // VERIFICAR ESTADO PREVIO
        console.log("\n📊 ESTADO PREVIO AL SORTEO:");
        console.log("-".repeat(40));
        
        const currentGameDay = await contract.getCurrentDay();
        const ticketCounter = await contract.ticketCounter();
        const totalDraws = await contract.totalDrawsExecuted();
        const lastDrawTime = await contract.lastDrawTime();
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        
        console.log("📅 Current Game Day:", currentGameDay.toString());
        console.log("🎫 Tickets vendidos:", ticketCounter.toString());
        console.log("🎯 Sorteos ejecutados:", totalDraws.toString());
        console.log("⏰ Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("🎮 Game Active:", gameActive ? "✅" : "❌");
        console.log("🤖 Automation Active:", automationActive ? "✅" : "❌");
        
        // VERIFICAR UPKEEP
        console.log("\n🔄 VERIFICACIÓN DE UPKEEP:");
        console.log("-".repeat(35));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep Needed:", upkeepNeeded ? "✅ SÍ" : "❌ NO");
        
        if (!upkeepNeeded) {
            console.log("❌ El upkeep no está listo. Abortando...");
            console.log("💡 Es posible que necesites esperar más tiempo o comprar tickets");
            return;
        }
        
        console.log("✅ Upkeep está listo para ejecutarse");
        
        // VERIFICAR POOLS ANTES DEL SORTEO (si hay tickets)
        if (Number(ticketCounter) > 0) {
            console.log("\n💰 POOLS ANTES DEL SORTEO:");
            console.log("-".repeat(35));
            
            const todaysPools = await contract.getDailyPoolInfo(currentGameDay);
            const mainPools = await contract.getMainPoolBalances();
            
            console.log("📅 Today's Collection:", ethers.formatUnits(todaysPools.totalCollected, 6), "USDC");
            console.log("💰 Main Pool - First Prize:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
            console.log("🥈 Main Pool - Second Prize:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
            console.log("🥉 Main Pool - Third Prize:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
        } else {
            console.log("\n💡 NO HAY TICKETS VENDIDOS");
            console.log("⚠️ El sorteo se ejecutará pero no habrá ganadores");
        }
        
        // EJECUTAR SORTEO
        console.log("\n🚀 EJECUTANDO SORTEO:");
        console.log("-".repeat(30));
        
        console.log("⚡ Enviando transacción performUpkeep...");
        console.log("🔄 Usando configuración específica para Avalanche Fuji...");
        
        // Configuración optimizada para Avalanche Fuji
        const performUpkeepTx = await contract.performUpkeep(performData, {
            gasLimit: 3000000, // Gas alto para VRF
            gasPrice: ethers.parseUnits("30", "gwei") // Gas price típico de Fuji
        });
        
        console.log("📡 Transacción enviada:", performUpkeepTx.hash);
        console.log("🔗 Snowtrace:", `https://testnet.snowtrace.io/tx/${performUpkeepTx.hash}`);
        console.log("⏳ Esperando confirmación...");
        
        const receipt = await performUpkeepTx.wait();
        
        if (receipt.status === 1) {
            console.log("✅ ¡TRANSACCIÓN CONFIRMADA!");
            console.log("⛽ Gas usado:", receipt.gasUsed.toString());
            
            // Esperar un poco para el VRF callback
            console.log("\n⏳ Esperando VRF callback (puede tomar 1-2 minutos)...");
            console.log("🎲 Chainlink VRF está generando números aleatorios...");
            
            // Verificar resultados periódicamente
            let attempts = 0;
            const maxAttempts = 12; // 2 minutos máximo
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar 10 segundos
                attempts++;
                
                console.log(`🔍 Verificación ${attempts}/${maxAttempts}...`);
                
                const updatedDraws = await contract.totalDrawsExecuted();
                const winningNumbers = await contract.lastWinningNumbers();
                
                if (Number(updatedDraws) > Number(totalDraws)) {
                    console.log("\n🎉 ¡SORTEO COMPLETADO!");
                    console.log("🎯 Total sorteos ejecutados:", updatedDraws.toString());
                    console.log("🎲 Números ganadores:", Array.from(winningNumbers).join(", "));
                    
                    // Verificar estado del día actual
                    const updatedTodaysPools = await contract.getDailyPoolInfo(currentGameDay);
                    console.log("🎲 Sorteo del día completado:", updatedTodaysPools.drawn ? "✅" : "❌");
                    console.log("💰 Distribución completada:", updatedTodaysPools.distributed ? "✅" : "❌");
                    
                    if (updatedTodaysPools.drawn) {
                        const todaysWinningNumbers = updatedTodaysPools.winningNumbers;
                        console.log("🎲 Números del día:", Array.from(todaysWinningNumbers).join(", "));
                    }
                    
                    // Verificar pools después del sorteo
                    const updatedMainPools = await contract.getMainPoolBalances();
                    const updatedReserves = await contract.getReserveBalances();
                    
                    console.log("\n💰 POOLS DESPUÉS DEL SORTEO:");
                    console.log("- First Prize:", ethers.formatUnits(updatedMainPools.firstPrizeAccumulated, 6), "USDC");
                    console.log("- Second Prize:", ethers.formatUnits(updatedMainPools.secondPrizeAccumulated, 6), "USDC");
                    console.log("- Third Prize:", ethers.formatUnits(updatedMainPools.thirdPrizeAccumulated, 6), "USDC");
                    console.log("- Development:", ethers.formatUnits(updatedMainPools.developmentAccumulated, 6), "USDC");
                    
                    const totalReserves = updatedReserves.firstPrizeReserve + 
                                        updatedReserves.secondPrizeReserve + 
                                        updatedReserves.thirdPrizeReserve;
                    console.log("- Total Reserves:", ethers.formatUnits(totalReserves, 6), "USDC");
                    
                    console.log("\n🎊 ¡SORTEO EXITOSO CON NUEVO CONTRATO!");
                    break;
                }
                
                if (attempts === maxAttempts) {
                    console.log("\n⏰ Tiempo de espera agotado");
                    console.log("💡 El VRF callback puede estar tardando más de lo normal");
                    console.log("🔄 Verifica en unos minutos si el sorteo se completó");
                }
            }
            
        } else {
            console.log("❌ Transacción falló");
        }
        
        console.log("\n📋 PRÓXIMOS PASOS:");
        console.log("-".repeat(25));
        console.log("1. ✅ Nuevo contrato funcionando con VRF correcto");
        console.log("2. 📱 Actualizar frontend con nueva dirección del contrato");
        console.log("3. 🎫 Comprar tickets para próximos sorteos");
        console.log("4. 🔄 Configurar Chainlink Automation para sorteos automáticos");
        console.log("5. ⏰ Próximo sorteo: mañana a las 4:00 UTC");
        
    } catch (error) {
        console.error("❌ Error ejecutando sorteo:", error.message);
        console.error("📋 Stack:", error.stack);
        
        if (error.code === 'CALL_EXCEPTION') {
            console.log("\n💡 POSIBLES CAUSAS:");
            console.log("- Problemas con la suscripción VRF");
            console.log("- Fondos LINK insuficientes");
            console.log("- Gas insuficiente");
            console.log("- Contrato no agregado como consumer VRF");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 