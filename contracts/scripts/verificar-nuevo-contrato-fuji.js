const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 VERIFICAR NUEVO CONTRATO - AVALANCHE FUJI");
    console.log("=".repeat(55));
    
    // NUEVO CONTRATO CON VRF CORRECTO
    const CONTRACT_ADDRESS = "0xe980475E4aF2f0B937059E9394262b36827B215F";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const SUBSCRIPTION_ID = "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    
    console.log("📍 Nuevo Contrato:", CONTRACT_ADDRESS);
    console.log("🔗 VRF Coordinator:", VRF_COORDINATOR);
    console.log("🆔 Subscription ID:", SUBSCRIPTION_ID);
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    
    try {
        // Conectar al NUEVO contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        console.log("\n📊 ESTADO DEL NUEVO CONTRATO:");
        console.log("-".repeat(40));
        
        const subscriptionId = await contract.subscriptionId();
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const currentGameDay = await contract.getCurrentDay();
        const totalDraws = await contract.totalDrawsExecuted();
        const ticketCounter = await contract.ticketCounter();
        
        console.log("🆔 Subscription ID:", subscriptionId.toString());
        console.log("🎮 Game Active:", gameActive ? "✅" : "❌");
        console.log("🤖 Automation Active:", automationActive ? "✅" : "❌");
        console.log("📅 Current Game Day:", currentGameDay.toString());
        console.log("🎯 Total Draws:", totalDraws.toString());
        console.log("🎫 Tickets vendidos:", ticketCounter.toString());
        
        // Verificar configuración VRF
        console.log("\n🎲 VERIFICANDO VRF CON DIRECCIONES CORRECTAS:");
        console.log("-".repeat(50));
        
        const vrfCoordinatorABI = [
            "function addConsumer(uint256 subId, address consumer) external",
            "function getSubscription(uint256 subId) view returns (uint256 balance, uint256 reqCount, address owner, address[] memory consumers)",
            "function pendingRequestExists(uint256 subId) view returns (bool)"
        ];
        
        const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, vrfCoordinatorABI, signer);
        
        try {
            // Intentar obtener información de la suscripción CON EL COORDINATOR CORRECTO
            const subscriptionInfo = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
            const balance = subscriptionInfo[0];
            const reqCount = subscriptionInfo[1];
            const owner = subscriptionInfo[2];
            const consumers = subscriptionInfo[3];
            
            console.log("💰 Balance LINK:", ethers.formatUnits(balance, 18), "LINK");
            console.log("📊 Request Count:", reqCount.toString());
            console.log("👤 Owner:", owner);
            console.log("🏭 Consumers:", consumers.length);
            
            // Verificar si el NUEVO contrato está como consumer
            const isConsumer = consumers.some(consumer => 
                consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
            );
            
            console.log("✅ Nuevo contrato es consumer:", isConsumer ? "SÍ" : "NO");
            
            // AGREGAR EL NUEVO CONTRATO COMO CONSUMER SI NO ESTÁ
            if (!isConsumer) {
                console.log("\n🔧 AGREGANDO NUEVO CONTRATO COMO CONSUMER...");
                
                if (owner.toLowerCase() === signer.address.toLowerCase()) {
                    try {
                        const addTx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, CONTRACT_ADDRESS);
                        console.log("📡 Transacción enviada:", addTx.hash);
                        await addTx.wait();
                        console.log("✅ ¡NUEVO CONTRATO AGREGADO COMO CONSUMER EXITOSAMENTE!");
                    } catch (error) {
                        console.log("❌ Error agregando consumer:", error.message);
                        console.log("💡 Agregar manualmente en https://vrf.chain.link/");
                        console.log("📍 Dirección del contrato:", CONTRACT_ADDRESS);
                    }
                } else {
                    console.log("❌ No eres el owner de la suscripción");
                    console.log("👤 Owner:", owner);
                    console.log("👤 Tu cuenta:", signer.address);
                    console.log("💡 Necesitas agregar manualmente en https://vrf.chain.link/");
                    console.log("📍 Dirección del nuevo contrato:", CONTRACT_ADDRESS);
                }
            } else {
                console.log("✅ El nuevo contrato YA está agregado como consumer");
            }
            
            // Verificar balance LINK
            if (balance === 0n) {
                console.log("\n❌ PROBLEMA: Sin fondos LINK");
                console.log("🔧 SOLUCIÓN: Fondear con LINK tokens en https://vrf.chain.link/");
                console.log("🪙 Obtener LINK gratis: https://faucets.chain.link/fuji");
            } else {
                console.log("✅ Suscripción tiene fondos LINK");
            }
            
        } catch (error) {
            console.log("❌ Error accediendo a suscripción:", error.message);
            console.log("💡 Verificar en https://vrf.chain.link/ manualmente");
        }
        
        // PROBAR SORTEO CON EL NUEVO CONTRATO
        console.log("\n🚀 PROBANDO SORTEO CON NUEVO CONTRATO:");
        console.log("-".repeat(45));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep Needed:", upkeepNeeded ? "✅ SÍ" : "❌ NO");
        
        if (upkeepNeeded) {
            console.log("✅ ¡EL NUEVO CONTRATO ESTÁ LISTO PARA SORTEO!");
            console.log("");
            console.log("🚀 ¿Quieres ejecutar el sorteo ahora? (Y/n)");
            console.log("Si quieres ejecutarlo, usa:");
            console.log(`npx hardhat run scripts/ejecutar-sorteo-nuevo-contrato.js --network avalanche-fuji`);
        } else {
            console.log("❌ Upkeep no está listo todavía");
            console.log("💡 Puede ser que falte tiempo o hay problemas de configuración");
        }
        
        // INFORMACIÓN DE ACTUALIZACIÓN PARA EL FRONTEND
        console.log("\n📱 ACTUALIZAR FRONTEND CON NUEVO CONTRATO:");
        console.log("-".repeat(50));
        console.log("CONTRACT_ADDRESS =", `"${CONTRACT_ADDRESS}"`);
        console.log("NETWORK = Avalanche Fuji");
        console.log("CHAIN_ID = 43113");
        console.log("RPC_URL = https://api.avax-test.network/ext/bc/C/rpc");
        console.log("USDC_ADDRESS = 0x5425890298aed601595a70AB815c96711a31Bc65");
        
        console.log("\n🔗 ENLACES ÚTILES:");
        console.log("• Nuevo contrato: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
        console.log("• VRF Dashboard: https://vrf.chain.link/");
        console.log("• LINK Faucet: https://faucets.chain.link/fuji");
        
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