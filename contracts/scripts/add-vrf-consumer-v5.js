const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 AGREGANDO CONTRATO COMO VRF CONSUMER - V5");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"; // Base Sepolia
    const SUBSCRIPTION_ID = "70846359092368923949796315994230469102226608583606291730577230133525692264419";
    
    console.log("📍 Contract Address:", CONTRACT_ADDRESS);
    console.log("🎲 VRF Coordinator:", VRF_COORDINATOR);
    console.log("📋 Subscription ID:", SUBSCRIPTION_ID);
    
    try {
        // Conectar al coordinador VRF
        const vrfCoordinatorABI = [
            "function addConsumer(uint256 subId, address consumer) external",
            "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)"
        ];
        
        const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, vrfCoordinatorABI, (await ethers.getSigners())[0]);
        
        console.log("\n🔍 VERIFICANDO SUBSCRIPTION ACTUAL...");
        
        // Obtener información de la subscription
        const subscriptionInfo = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
        
        console.log("- Balance LINK:", ethers.formatEther(subscriptionInfo[0]), "LINK");
        console.log("- Native Balance:", ethers.formatEther(subscriptionInfo[1]), "ETH");
        console.log("- Request Count:", subscriptionInfo[2].toString());
        console.log("- Owner:", subscriptionInfo[3]);
        console.log("- Consumers:", subscriptionInfo[4]);
        
        // Verificar si el contrato ya está como consumer
        const isConsumer = subscriptionInfo[4].includes(CONTRACT_ADDRESS);
        console.log("- Contract is Consumer:", isConsumer ? "✅ YES" : "❌ NO");
        
        if (!isConsumer) {
            console.log("\n➕ AGREGANDO COMO CONSUMER...");
            
            const addConsumerTx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, CONTRACT_ADDRESS);
            console.log("📡 Transaction sent:", addConsumerTx.hash);
            
            console.log("⏳ Waiting for confirmation...");
            const receipt = await addConsumerTx.wait();
            console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
            
            // Verificar nuevamente
            console.log("\n🔍 VERIFICANDO NUEVAMENTE...");
            const newSubscriptionInfo = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
            const isNowConsumer = newSubscriptionInfo[4].includes(CONTRACT_ADDRESS);
            
            console.log("- Contract is Consumer:", isNowConsumer ? "✅ YES" : "❌ NO");
            console.log("- Total Consumers:", newSubscriptionInfo[4].length);
            
            if (isNowConsumer) {
                console.log("\n🎉 ÉXITO!");
                console.log("✅ Contrato agregado como VRF consumer correctamente");
            } else {
                console.log("\n❌ ERROR: No se pudo agregar como consumer");
            }
        } else {
            console.log("\n✅ El contrato ya está registrado como consumer");
        }
        
        console.log("\n📋 PRÓXIMOS PASOS:");
        console.log("1. ✅ Contrato agregado como VRF consumer");
        console.log("2. 💰 Verificar que la subscription tenga suficiente LINK");
        console.log("3. 🎲 Ahora puedes probar el sorteo forzado");
        console.log("4. 🤖 Configurar Chainlink Automation upkeep");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        if (error.message.includes("OnlySubOwner")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- Solo el dueño de la subscription puede agregar consumers");
            console.log("- Verifica que estés usando la wallet correcta");
            console.log("- O agrega el consumer manualmente en:");
            console.log(`  https://vrf.chain.link/base-sepolia/${SUBSCRIPTION_ID}`);
        }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🔗 CONFIGURACIÓN VRF COMPLETADA");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 