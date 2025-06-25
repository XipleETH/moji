const { ethers } = require("hardhat");

// CONTRACT V3 ADDRESS
const CONTRACT_ADDRESS = "0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5";

async function main() {
    console.log("🚨 EJECUCION DE SORTEO DE EMERGENCIA - LOTTOMOJI V3");
    console.log("=".repeat(65));
    console.log("⚠️ ADVERTENCIA: Este script simula números aleatorios");
    console.log("⚠️ Solo usar en emergencias cuando VRF no funcione");
    console.log("=".repeat(65));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. Verificar que somos owner
        const owner = await contract.owner();
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("❌ ERROR: No eres el owner del contrato");
            return;
        }
        
        console.log("✅ Owner verificado");
        
        // 2. Generar números pseudo-aleatorios usando block hash + timestamp
        console.log("\n🎲 GENERANDO NUMEROS PSEUDO-ALEATORIOS");
        console.log("-".repeat(40));
        
        const latestBlock = await ethers.provider.getBlock('latest');
        const blockHash = latestBlock.hash;
        const timestamp = Math.floor(Date.now() / 1000);
        
        console.log("📦 Block Hash:", blockHash);
        console.log("⏰ Timestamp:", timestamp);
        
        // Crear semilla combinando block hash y timestamp
        const seed = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ['bytes32', 'uint256'], 
                [blockHash, timestamp]
            )
        );
        
        console.log("🌱 Seed:", seed);
        
        // Generar 4 números aleatorios (0-9 para 10 emojis)
        const randomNumbers = [];
        for (let i = 0; i < 4; i++) {
            const slice = seed.slice(2 + i * 8, 2 + (i + 1) * 8); // 8 hex chars = 4 bytes
            const number = parseInt(slice, 16) % 10; // 0-9 para 10 emojis
            randomNumbers.push(number);
        }
        
        console.log("🎯 Números generados:", randomNumbers);
        
        // 3. Verificar si el contrato tiene función directa para setear ganadores
        console.log("\n🏆 3. INTENTANDO EJECUCION DIRECTA");
        console.log("-".repeat(40));
        
        try {
            // Verificar current game day para el sorteo
            const currentGameDay = await contract.getCurrentDay();
            const gameDay = Number(currentGameDay) - 1; // Draw for previous day
            
            console.log("📅 Game Day para sorteo:", gameDay);
            
            // Método 1: Si existe función para simular VRF response
            try {
                console.log("🔄 Attempting to simulate VRF fulfillment...");
                
                // Algunos contratos tienen una función de testing/emergency
                const fulfillTx = await contract.fulfillRandomWords(
                    1, // requestId
                    randomNumbers.map(n => ethers.toBigInt(n))
                );
                await fulfillTx.wait();
                
                console.log("✅ VRF simulation successful!");
                console.log("📡 Transaction:", fulfillTx.hash);
                
            } catch (fulfillError) {
                console.log("❌ VRF simulation not available:", fulfillError.message);
                
                // Método 2: Intentar forzar a través de automation
                console.log("🔧 Attempting forced automation...");
                
                try {
                    // Toggle automation off and on to potentially reset VRF state
                    await contract.toggleAutomation();
                    await contract.toggleAutomation();
                    
                    // Try performUpkeep one more time
                    const [upkeepNeeded, data] = await contract.checkUpkeep("0x");
                    
                    if (upkeepNeeded) {
                        const performTx = await contract.performUpkeep(data, {
                            gasLimit: 3000000 // Higher gas limit
                        });
                        await performTx.wait();
                        
                        console.log("✅ Forced automation successful!");
                        console.log("📡 Transaction:", performTx.hash);
                    } else {
                        throw new Error("Upkeep no longer needed after reset");
                    }
                    
                } catch (automationError) {
                    console.log("❌ Forced automation failed:", automationError.message);
                    
                    // Método 3: Información para intervención manual
                    console.log("\n🆘 INTERVENCION MANUAL REQUERIDA");
                    console.log("-".repeat(40));
                    console.log("Los números sugeridos para el sorteo son:", randomNumbers);
                    console.log("Opciones:");
                    console.log("1. Esperar a que VRF se recupere automáticamente");
                    console.log("2. Fondear VRF subscription en https://vrf.chain.link/");
                    console.log("3. Fondear Chainlink Automation en https://automation.chain.link/");
                    console.log("4. Contactar soporte de Chainlink");
                    console.log("5. Usar función de emergency draw si existe en el contrato");
                }
            }
            
        } catch (error) {
            console.log("❌ Error en ejecución directa:", error.message);
        }
        
        // 4. Verificación final
        console.log("\n📊 4. VERIFICACION FINAL");
        console.log("-".repeat(40));
        
        const finalGameDay = await contract.getCurrentDay();
        const finalLastDrawTime = await contract.lastDrawTime();
        const [finalUpkeepNeeded] = await contract.checkUpkeep("0x");
        
        console.log("📅 Current Game Day:", Number(finalGameDay));
        console.log("🕒 Last Draw Time:", new Date(Number(finalLastDrawTime) * 1000).toLocaleString());
        console.log("🔄 Upkeep Still Needed:", finalUpkeepNeeded);
        
        if (!finalUpkeepNeeded) {
            console.log("✅ SUCCESS: El sorteo se ejecutó correctamente!");
        } else {
            console.log("⚠️ El sorteo sigue pendiente. Se requiere intervención manual.");
            
            console.log("\n📞 CONTACTOS DE SOPORTE:");
            console.log("- Chainlink Discord: https://discord.gg/chainlink");
            console.log("- Chainlink Docs: https://docs.chain.link/");
            console.log("- VRF Dashboard: https://vrf.chain.link/");
            console.log("- Automation Dashboard: https://automation.chain.link/");
        }
        
        console.log("\n✅ PROCESO DE EMERGENCIA COMPLETADO");
        console.log("=".repeat(65));
        
    } catch (error) {
        console.error("💥 Error crítico en script de emergencia:", error);
        
        if (error.reason) {
            console.error("📋 Reason:", error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 