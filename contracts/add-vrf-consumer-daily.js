const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 ADDING NEW DAILY CONTRACT AS VRF CONSUMER");
    console.log("=============================================");
    
    const CONTRACT_ADDRESS = "0x108FabeC110B5B74DaB4953182F78957ef721ECB";
    const SUBSCRIPTION_ID = "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);
    console.log("📍 Contract to add:", CONTRACT_ADDRESS);
    console.log("🎲 VRF Subscription:", SUBSCRIPTION_ID);
    
    // Connect to VRF Coordinator
    const vrfCoordinatorABI = [
        "function addConsumer(uint256 subId, address consumer) external",
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
    ];
    
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, vrfCoordinatorABI, deployer);
    
    // Check current subscription status
    console.log("\n📊 CHECKING CURRENT SUBSCRIPTION...");
    try {
        const subInfo = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
        console.log("✅ Subscription Balance:", ethers.formatEther(subInfo[0]), "LINK");
        console.log("✅ Request Count:", subInfo[1].toString());
        console.log("✅ Owner:", subInfo[2]);
        console.log("✅ Current Consumers:", subInfo[3].length);
        
        // Check if contract is already a consumer
        const isConsumer = subInfo[3].includes(CONTRACT_ADDRESS);
        if (isConsumer) {
            console.log("⚠️ Contract is already a VRF consumer");
            return;
        }
        
    } catch (error) {
        console.log("❌ Error reading subscription:", error.message);
        return;
    }
    
    // Add consumer
    console.log("\n🔗 ADDING CONTRACT AS VRF CONSUMER...");
    try {
        const tx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, CONTRACT_ADDRESS);
        console.log("⏳ Transaction sent:", tx.hash);
        
        await tx.wait();
        console.log("✅ Contract successfully added as VRF consumer!");
        
    } catch (error) {
        console.log("❌ Failed to add consumer:", error.message);
        return;
    }
    
    // Verify addition
    console.log("\n🔍 VERIFYING CONSUMER ADDITION...");
    try {
        const subInfo = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
        console.log("✅ Total Consumers:", subInfo[3].length);
        
        const isConsumer = subInfo[3].includes(CONTRACT_ADDRESS);
        if (isConsumer) {
            console.log("✅ Contract successfully added as consumer!");
        } else {
            console.log("❌ Contract not found in consumer list");
        }
        
    } catch (error) {
        console.log("❌ Error verifying:", error.message);
    }
    
    console.log("\n=============================================");
    console.log("🎯 VRF CONSUMER SETUP COMPLETED");
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    console.log("🎲 Ready for random number generation");
    console.log("⏰ Daily draws at 1:00 UTC");
    console.log("=============================================");
}

main().catch(console.error); 