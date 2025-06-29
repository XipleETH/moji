const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 AGREGANDO CONTRATO COMO VRF CONSUMER - AVALANCHE FUJI");
    console.log("=".repeat(60));
    
    // Configuración del contrato desplegado
    const CONTRACT_ADDRESS = "0x599D73443e2fE18b03dfD8d28cad40af26C04155";
    const SUBSCRIPTION_ID = "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Cuenta:", deployer.address);
    
    // Verificar balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "AVAX");
    
    console.log("\n📋 CONFIGURACIÓN:");
    console.log("- Contract Address:", CONTRACT_ADDRESS);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    
    try {
        // Conectar al VRF Coordinator
        const vrfCoordinatorABI = [
            "function addConsumer(uint256 subId, address consumer) external",
            "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)"
        ];
        
        const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, vrfCoordinatorABI, deployer);
        
        // Verificar subscription antes
        console.log("\n🔍 VERIFICANDO SUBSCRIPTION ANTES:");
        try {
            const subInfo = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
            console.log("✅ LINK Balance:", ethers.formatEther(subInfo.balance), "LINK");
            console.log("✅ Owner:", subInfo.owner);
            console.log("✅ Current consumers:", subInfo.consumers.length);
            console.log("✅ Consumers:", subInfo.consumers);
        } catch (error) {
            console.log("⚠️ No se pudo verificar subscription:", error.message);
        }
        
        // Agregar consumer
        console.log("\n🔄 AGREGANDO CONSUMER...");
        const addConsumerTx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, CONTRACT_ADDRESS);
        console.log("📝 Transaction hash:", addConsumerTx.hash);
        
        console.log("⏳ Esperando confirmación...");
        const receipt = await addConsumerTx.wait();
        console.log("✅ Consumer agregado exitosamente!");
        console.log("⛽ Gas usado:", receipt.gasUsed.toString());
        
        // Verificar subscription después
        console.log("\n🔍 VERIFICANDO SUBSCRIPTION DESPUÉS:");
        try {
            const subInfoAfter = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
            console.log("✅ LINK Balance:", ethers.formatEther(subInfoAfter.balance), "LINK");
            console.log("✅ Owner:", subInfoAfter.owner);
            console.log("✅ Total consumers:", subInfoAfter.consumers.length);
            console.log("✅ Consumers:", subInfoAfter.consumers);
            
            // Verificar que nuestro contrato está en la lista
            const isConsumer = subInfoAfter.consumers.includes(CONTRACT_ADDRESS);
            console.log("✅ Nuestro contrato es consumer:", isConsumer);
            
        } catch (error) {
            console.log("⚠️ Error verificando subscription después:", error.message);
        }
        
    } catch (error) {
        console.error("❌ ERROR:", error.message);
        
        if (error.message.includes("Only the subscription owner can add/remove consumers")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- Necesitas ser el owner de la subscription para agregar consumers");
            console.log("- Verifica que estás usando la cuenta correcta");
            console.log("- O pide al owner de la subscription que agregue el contrato");
        }
        
        throw error;
    }
    
    console.log("\n✅ PRÓXIMOS PASOS:");
    console.log("=".repeat(30));
    console.log("1. ✅ Contrato agregado como VRF consumer");
    console.log("2. 🔄 Verificar que la subscription tenga fondos LINK suficientes");
    console.log("3. 🔄 El contrato ya está listo para recibir números aleatorios");
    console.log("4. 🔄 Próximo sorteo: 29 junio 2024 17:00 UTC");
    
    console.log("\n🔗 ENLACES ÚTILES:");
    console.log("- Contrato:", `https://testnet.snowtrace.io/address/${CONTRACT_ADDRESS}`);
    console.log("- VRF Subscription:", `https://vrf.chain.link/fuji/${SUBSCRIPTION_ID}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 CONSUMER AGREGADO EXITOSAMENTE");
    console.log("=".repeat(60));
}

main()
    .then(() => {
        console.log("✅ Script completado exitosamente");
        process.exit(0);
    })
    .catch((error) => {
        console.error("💥 Error:", error);
        process.exit(1);
    }); 