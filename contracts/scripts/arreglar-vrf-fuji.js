const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 ARREGLAR VRF - AVALANCHE FUJI");
    console.log("=".repeat(45));
    
    const CONTRACT_ADDRESS = "0x1B0B1A24983E51d809FBfAc424946B314fEFA271";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const SUBSCRIPTION_ID = "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("🔗 VRF Coordinator:", VRF_COORDINATOR);
    console.log("🆔 Subscription ID:", SUBSCRIPTION_ID);
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // Verificar que el subscription ID del contrato sea correcto
        const contractSubId = await contract.subscriptionId();
        console.log("✅ Contract Subscription ID:", contractSubId.toString());
        
        if (contractSubId.toString() !== SUBSCRIPTION_ID) {
            console.log("❌ ERROR: Subscription ID del contrato no coincide");
            return;
        }
        
        // ABI completo para VRF Coordinator
        const vrfCoordinatorABI = [
            "function addConsumer(uint256 subId, address consumer) external",
            "function getSubscription(uint256 subId) view returns (uint256 balance, uint256 reqCount, address owner, address[] memory consumers)",
            "function pendingRequestExists(uint256 subId) view returns (bool)",
            "function removeConsumer(uint256 subId, address consumer) external"
        ];
        
        const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, vrfCoordinatorABI, signer);
        
        console.log("\n🔍 VERIFICANDO SUSCRIPCIÓN...");
        console.log("-".repeat(35));
        
        let subscriptionInfo;
        try {
            // Intentar obtener información de la suscripción
            subscriptionInfo = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
            const balance = subscriptionInfo[0];
            const reqCount = subscriptionInfo[1];
            const owner = subscriptionInfo[2];
            const consumers = subscriptionInfo[3];
            
            console.log("💰 Balance LINK:", ethers.formatUnits(balance, 18), "LINK");
            console.log("📊 Request Count:", reqCount.toString());
            console.log("👤 Owner:", owner);
            console.log("🏭 Consumers:", consumers.length);
            
            // Verificar si nuestro contrato está como consumer
            const isConsumer = consumers.some(consumer => 
                consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
            );
            
            console.log("✅ Contrato es consumer:", isConsumer ? "SÍ" : "NO");
            
            // SOLUCIÓN 1: Agregar como consumer si no está
            if (!isConsumer) {
                console.log("\n🔧 SOLUCIONANDO: Agregando contrato como consumer...");
                
                // Verificar si somos el owner
                if (owner.toLowerCase() === signer.address.toLowerCase()) {
                    try {
                        const addTx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, CONTRACT_ADDRESS);
                        console.log("📡 Transacción enviada:", addTx.hash);
                        await addTx.wait();
                        console.log("✅ Contrato agregado como consumer exitosamente!");
                    } catch (error) {
                        console.log("❌ Error agregando consumer:", error.message);
                        console.log("💡 Necesitas agregar manualmente en https://vrf.chain.link/");
                    }
                } else {
                    console.log("❌ No eres el owner de la suscripción");
                    console.log("👤 Owner:", owner);
                    console.log("👤 Tu cuenta:", signer.address);
                    console.log("💡 Usa la cuenta owner o ve a https://vrf.chain.link/");
                }
            }
            
            // SOLUCIÓN 2: Verificar balance LINK
            if (balance === 0n) {
                console.log("\n❌ PROBLEMA: Sin fondos LINK");
                console.log("🔧 SOLUCIÓN: Fondear con LINK tokens en https://vrf.chain.link/");
                console.log("🪙 Obtener LINK gratis: https://faucets.chain.link/fuji");
            } else {
                console.log("✅ Suscripción tiene fondos LINK");
            }
            
        } catch (error) {
            console.log("❌ Error accediendo a suscripción:", error.message);
            
            if (error.message.includes("execution reverted")) {
                console.log("\n💡 POSIBLES SOLUCIONES:");
                console.log("1. La suscripción no existe - crear en https://vrf.chain.link/");
                console.log("2. Problema de permisos - verificar owner");
                console.log("3. Subscription ID incorrecto");
                console.log("4. Red incorrecta - asegurar Avalanche Fuji");
            }
            return;
        }
        
        // SOLUCIÓN 3: Probar request VRF directamente
        console.log("\n🧪 PROBANDO REQUEST VRF DIRECTO...");
        console.log("-".repeat(40));
        
        try {
            // Verificar si podemos hacer checkUpkeep
            const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
            console.log("🔄 Upkeep Needed:", upkeepNeeded);
            
            if (upkeepNeeded) {
                console.log("✅ Upkeep está listo");
                
                // Intentar performUpkeep con gas específico
                console.log("🚀 Intentando performUpkeep con configuración específica...");
                
                try {
                    const performTx = await contract.performUpkeep(performData, {
                        gasLimit: 2500000, // Gas específico para Avalanche
                        gasPrice: ethers.parseUnits("30", "gwei") // Gas price para Fuji
                    });
                    
                    console.log("📡 Transacción enviada:", performTx.hash);
                    console.log("⏳ Esperando confirmación...");
                    
                    const receipt = await performTx.wait();
                    console.log("✅ ¡SORTEO EJECUTADO EXITOSAMENTE!");
                    console.log("⛽ Gas usado:", receipt.gasUsed.toString());
                    console.log("🔗 Ver en Snowtrace: https://testnet.snowtrace.io/tx/" + performTx.hash);
                    
                    // Verificar resultados
                    const totalDraws = await contract.totalDrawsExecuted();
                    const winningNumbers = await contract.lastWinningNumbers();
                    
                    console.log("🎯 Total sorteos:", totalDraws.toString());
                    console.log("🎲 Números ganadores:", Array.from(winningNumbers).join(", "));
                    
                } catch (performError) {
                    console.log("❌ Error en performUpkeep:", performError.message);
                    
                    if (performError.message.includes("insufficient funds")) {
                        console.log("💡 SOLUCIÓN: Agregar más fondos LINK a la suscripción");
                    } else if (performError.message.includes("consumer not added")) {
                        console.log("💡 SOLUCIÓN: Agregar contrato como consumer VRF");
                    } else {
                        console.log("💡 SOLUCIÓN: Verificar configuración VRF en dashboard");
                    }
                }
            } else {
                console.log("❌ Upkeep no está listo todavía");
            }
            
        } catch (error) {
            console.log("❌ Error en test VRF:", error.message);
        }
        
        console.log("\n📋 RESUMEN DE ACCIONES:");
        console.log("-".repeat(30));
        console.log("1. ✅ Verificar suscripción VRF");
        console.log("2. 🔧 Agregar contrato como consumer (si es necesario)");
        console.log("3. 💰 Verificar fondos LINK");
        console.log("4. 🧪 Probar performUpkeep con configuración específica");
        
        console.log("\n🔗 ENLACES ÚTILES:");
        console.log("• VRF Dashboard: https://vrf.chain.link/");
        console.log("• LINK Faucet: https://faucets.chain.link/fuji");
        console.log("• Contrato: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
        
    } catch (error) {
        console.error("❌ Error general:", error.message);
        console.error("📋 Stack:", error.stack);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 