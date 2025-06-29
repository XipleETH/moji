const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 ADDING VRF CONSUMER - SIMPLE VERSION");
    console.log("=======================================");
    
    const CONTRACT_ADDRESS = "0x108FabeC110B5B74DaB4953182F78957ef721ECB";
    const SUBSCRIPTION_ID = "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);
    console.log("📍 Contract to add:", CONTRACT_ADDRESS);
    console.log("🎲 VRF Subscription:", SUBSCRIPTION_ID);
    console.log("⚙️ VRF Coordinator:", VRF_COORDINATOR);
    
    // Simple VRF Coordinator interface - only addConsumer
    const vrfCoordinatorABI = [
        "function addConsumer(uint256 subId, address consumer) external"
    ];
    
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, vrfCoordinatorABI, deployer);
    
    console.log("\n🔗 ADDING CONTRACT AS VRF CONSUMER...");
    try {
        const tx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, CONTRACT_ADDRESS, {
            gasLimit: 500000 // Set manual gas limit
        });
        console.log("⏳ Transaction sent:", tx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        console.log("✅ Contract successfully added as VRF consumer!");
        
    } catch (error) {
        console.log("❌ Failed to add consumer:", error.message);
        
        // Check if it's already added
        if (error.message.includes("already exists") || error.message.includes("consumer already added")) {
            console.log("ℹ️ Consumer might already be added");
        }
        return;
    }
    
    console.log("\n=======================================");
    console.log("🎯 VRF CONSUMER SETUP COMPLETED");
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    console.log("🎲 VRF Subscription:", SUBSCRIPTION_ID);
    console.log("✅ Ready for random number generation");
    console.log("⏰ Daily draws at 1:00 UTC");
    console.log("=======================================");
    
    console.log("\n📝 NEXT STEPS:");
    console.log("1. Fix draw timing with setLastDrawTime");
    console.log("2. Update frontend configuration");
    console.log("3. Test ticket purchases");
}

main().catch(console.error); 