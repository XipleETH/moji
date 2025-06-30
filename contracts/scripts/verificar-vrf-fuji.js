const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICACIÓN VRF - AVALANCHE FUJI");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0x1B0B1A24983E51d809FBfAc424946B314fEFA271";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        const [signer] = await ethers.getSigners();
        console.log("👤 Cuenta:", signer.address);
        console.log("📍 Contrato:", CONTRACT_ADDRESS);
        console.log("🔗 VRF Coordinator:", VRF_COORDINATOR);
        
        // Obtener subscription ID
        const subscriptionId = await contract.subscriptionId();
        console.log("🔗 Subscription ID:", subscriptionId.toString());
        
        // ABI mínimo para VRF Coordinator
        const vrfCoordinatorABI = [
            "function getSubscription(uint256 subId) view returns (uint256 balance, uint256 reqCount, address owner, address[] memory consumers)",
            "function pendingRequestExists(uint256 subId) view returns (bool)"
        ];
        
        const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, vrfCoordinatorABI, signer);
        
        console.log("\n📊 INFORMACIÓN DE LA SUSCRIPCIÓN VRF:");
        console.log("-".repeat(45));
        
        try {
            const subscriptionInfo = await vrfCoordinator.getSubscription(subscriptionId);
            const balance = subscriptionInfo[0];
            const reqCount = subscriptionInfo[1];
            const owner = subscriptionInfo[2];
            const consumers = subscriptionInfo[3];
            
            console.log("💰 Balance LINK:", ethers.formatUnits(balance, 18), "LINK");
            console.log("📊 Request Count:", reqCount.toString());
            console.log("👤 Owner:", owner);
            console.log("🏭 Consumers Count:", consumers.length);
            
            // Verificar si nuestro contrato está en la lista de consumers
            const isConsumer = consumers.some(consumer => 
                consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
            );
            
            console.log("✅ Contrato es consumer:", isConsumer ? "SÍ" : "NO");
            
            if (!isConsumer) {
                console.log("❌ PROBLEMA: El contrato NO está agregado como consumer");
                console.log("🔧 SOLUCIÓN: Agregar el contrato como consumer en:");
                console.log("   https://vrf.chain.link/");
                console.log("   - Cambiar a Avalanche Fuji");
                console.log("   - Buscar subscription ID:", subscriptionId.toString());
                console.log("   - Agregar consumer:", CONTRACT_ADDRESS);
                return;
            }
            
            if (balance === 0n) {
                console.log("❌ PROBLEMA: La suscripción no tiene fondos LINK");
                console.log("🔧 SOLUCIÓN: Fondear la suscripción con LINK tokens");
                console.log("   - Ir a https://vrf.chain.link/");
                console.log("   - Cambiar a Avalanche Fuji");
                console.log("   - Buscar subscription ID:", subscriptionId.toString());
                console.log("   - Fondear con LINK tokens");
                return;
            }
            
            console.log("\n🎲 VERIFICANDO REQUESTS PENDIENTES:");
            console.log("-".repeat(40));
            
            const pendingRequest = await vrfCoordinator.pendingRequestExists(subscriptionId);
            console.log("⏳ Pending Request:", pendingRequest ? "SÍ" : "NO");
            
            if (pendingRequest) {
                console.log("⚠️ Hay un request VRF pendiente");
                console.log("💡 Puede que el sorteo ya esté en proceso");
            }
            
        } catch (error) {
            console.log("❌ Error obteniendo información de suscripción:", error.message);
            console.log("💡 Posibles causas:");
            console.log("   - Subscription ID incorrecto");
            console.log("   - Suscripción no existe");
            console.log("   - Problemas de red");
        }
        
        console.log("\n🔧 CONFIGURACIÓN DEL CONTRATO:");
        console.log("-".repeat(35));
        
        // Verificar configuración del contrato
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        
        console.log("🎮 Game Active:", gameActive ? "✅" : "❌");
        console.log("🤖 Automation Active:", automationActive ? "✅" : "❌");
        console.log("⏸️ Emergency Pause:", emergencyPause ? "❌" : "✅");
        
        console.log("\n📋 PRÓXIMOS PASOS:");
        console.log("-".repeat(25));
        console.log("1. ✅ Verificar que el contrato esté agregado como VRF consumer");
        console.log("2. ✅ Verificar que la suscripción tenga fondos LINK");
        console.log("3. 🔗 Configurar Chainlink Automation para sorteos automáticos");
        console.log("4. 🧪 Probar sorteo manual nuevamente");
        
        console.log("\n🔗 ENLACES ÚTILES:");
        console.log("• VRF Dashboard: https://vrf.chain.link/");
        console.log("• Automation Dashboard: https://automation.chain.link/");
        console.log("• LINK Faucet: https://faucets.chain.link/fuji");
        console.log("• Snowtrace: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
        
    } catch (error) {
        console.error("❌ Error en verificación VRF:", error.message);
        console.error("📋 Stack:", error.stack);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 