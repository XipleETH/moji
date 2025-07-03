const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 Adding LottoMojiCoreV4 as VRF Consumer...");

    // Configuración
    const CONTRACT_ADDRESS = "0xb73c3F8a0a9c2F1cd035454da027a0Abd7350C92"; // V4 con subscription ID correcto
    const SUBSCRIPTION_ID = "115069731220471573185954452445782707255793413484503774356200619180219006172805";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"; // Avalanche Fuji

    console.log("📋 Configuration:");
    console.log(`- Contract V4: ${CONTRACT_ADDRESS}`);
    console.log(`- Subscription ID: ${SUBSCRIPTION_ID}`);
    console.log(`- VRF Coordinator: ${VRF_COORDINATOR}`);

    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log(`- Wallet: ${deployer.address}`);

    // VRF Coordinator ABI (solo función addConsumer)
    const VRF_COORDINATOR_ABI = [
        "function addConsumer(uint256 subId, address consumer) external",
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
    ];

    // Crear instancia del coordinador VRF
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, VRF_COORDINATOR_ABI, deployer);

    console.log("\n🔍 Checking current subscription state...");
    
    try {
        const subscription = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
        console.log(`✅ Subscription found:`);
        console.log(`- Balance: ${ethers.formatEther(subscription.balance)} LINK`);
        console.log(`- Request Count: ${subscription.reqCount}`);
        console.log(`- Owner: ${subscription.owner}`);
        console.log(`- Current Consumers: ${subscription.consumers.length}`);
        
        // Verificar si el contrato ya está agregado
        const isAlreadyConsumer = subscription.consumers.includes(CONTRACT_ADDRESS);
        if (isAlreadyConsumer) {
            console.log(`✅ Contract ${CONTRACT_ADDRESS} is already a consumer!`);
            return;
        }
        
        console.log("📝 Current consumers:");
        subscription.consumers.forEach((consumer, index) => {
            console.log(`  ${index + 1}. ${consumer}`);
        });
    } catch (error) {
        console.error("❌ Error checking subscription:", error.message);
        return;
    }

    console.log(`\n🔄 Adding ${CONTRACT_ADDRESS} as consumer...`);

    try {
        const tx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, CONTRACT_ADDRESS);
        console.log(`📝 Transaction submitted: ${tx.hash}`);
        
        console.log("⏳ Waiting for confirmation...");
        await tx.wait();
        
        console.log("✅ Consumer added successfully!");

        // Verificar que se agregó correctamente
        console.log("\n🔍 Verifying consumer was added...");
        const updatedSubscription = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
        
        const isNowConsumer = updatedSubscription.consumers.includes(CONTRACT_ADDRESS);
        if (isNowConsumer) {
            console.log("✅ Verification successful - contract is now a consumer!");
            console.log(`📊 Total consumers: ${updatedSubscription.consumers.length}`);
        } else {
            console.log("❌ Verification failed - contract was not added");
        }

    } catch (error) {
        console.error("❌ Error adding consumer:", error);
        
        if (error.message.includes("OnlyOwner")) {
            console.error("💡 Only the subscription owner can add consumers");
        } else if (error.message.includes("InvalidConsumer")) {
            console.error("💡 The consumer contract address is invalid");
        } else if (error.message.includes("TooManyConsumers")) {
            console.error("💡 The subscription has reached the maximum number of consumers");
        }
        
        return;
    }

    console.log("\n🎯 Next Steps:");
    console.log("1. ✅ Contract added to VRF subscription");
    console.log("2. 🔄 Setup Chainlink Automation upkeep");
    console.log("3. 🎫 Test ticket purchasing");
    console.log("4. 🔍 Monitor draw execution");
    console.log("5. 🏆 Verify prize distribution");
}

main()
    .then(() => {
        console.log("\n🎉 VRF Consumer setup completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ VRF Consumer setup failed:", error);
        process.exit(1);
    }); 