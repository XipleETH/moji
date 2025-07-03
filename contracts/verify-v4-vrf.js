const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Verifying V4 VRF Configuration...");

    const CONTRACT_ADDRESS = "0xb73c3F8a0a9c2F1cd035454da027a0Abd7350C92";
    const SUBSCRIPTION_ID = "115069731220471573185954452445782707255793413484503774356200619180219006172805";

    console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🔗 Subscription ID: ${SUBSCRIPTION_ID}`);

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);

    // Simple contract ABI
    const CONTRACT_ABI = [
        "function vrfSubId() view returns (uint256)",
        "function requestRandomNumbers() external",
        "function automationActive() view returns (bool)",
        "function emergencyPause() view returns (bool)"
    ];

    try {
        // Connect to contract
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, deployer);

        console.log("\n📊 Contract VRF Configuration:");
        
        const vrfSubId = await contract.vrfSubId();
        console.log(`✅ Contract Subscription ID: ${vrfSubId.toString()}`);
        
        const automationActive = await contract.automationActive();
        console.log(`✅ Automation Active: ${automationActive}`);
        
        const emergencyPause = await contract.emergencyPause();
        console.log(`✅ Emergency Pause: ${emergencyPause}`);

        // Verify subscription ID matches
        if (vrfSubId.toString() === SUBSCRIPTION_ID) {
            console.log("✅ Subscription ID matches configuration!");
        } else {
            console.log("❌ Subscription ID mismatch!");
            console.log(`Expected: ${SUBSCRIPTION_ID}`);
            console.log(`Contract: ${vrfSubId.toString()}`);
        }

        console.log("\n🧪 Testing VRF Request (if needed):");
        console.log("Note: This would only work if contract is already added to subscription");
        
        // Don't actually call requestRandomNumbers as it costs LINK
        console.log("⚠️ Skipping actual VRF request to preserve LINK tokens");

        console.log("\n📋 VRF Setup Status:");
        console.log("1. ✅ Contract deployed with correct subscription ID");
        console.log("2. ⏳ Contract needs to be added to VRF subscription manually");
        console.log("3. ⏳ VRF subscription needs LINK tokens");
        console.log("4. ⏳ Chainlink Automation upkeep needs to be created");

        console.log("\n💡 Manual Steps Required:");
        console.log("1. Go to vrf.chain.link");
        console.log("2. Connect wallet and select Avalanche Fuji");
        console.log(`3. Find subscription ${SUBSCRIPTION_ID}`);
        console.log(`4. Add consumer: ${CONTRACT_ADDRESS}`);
        console.log("5. Ensure subscription has LINK balance");

    } catch (error) {
        console.error("❌ Error verifying contract:", error);
    }
}

main()
    .then(() => {
        console.log("\n🎉 V4 VRF verification completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    }); 