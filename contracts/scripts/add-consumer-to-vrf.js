const { ethers } = require("hardhat");

async function main() {
  console.log("🔗 Adding LottoMoji V2 as VRF Consumer...");
  console.log("=========================================");
  
  // Configuration
  const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"; // Base Sepolia
  const SUBSCRIPTION_ID = "33088903064086928793253033021668227318";
  const CONTRACT_V2_ADDRESS = "0x8F6A8D8E1408d53D1C06Ed0664CC334Fa533480c";
  
  console.log("📋 Configuration:");
  console.log("- VRF Coordinator:", VRF_COORDINATOR);
  console.log("- Subscription ID:", SUBSCRIPTION_ID);
  console.log("- Contract V2:", CONTRACT_V2_ADDRESS);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Using account:", deployer.address);
  
  try {
    // Connect to VRF Coordinator
    console.log("\n🔗 Connecting to VRF Coordinator...");
    
    const VRF_COORDINATOR_ABI = [
      "function addConsumer(uint256 subId, address consumer) external",
      "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)",
      "function removeConsumer(uint256 subId, address consumer) external"
    ];
    
    const vrfCoordinator = new ethers.Contract(
      VRF_COORDINATOR,
      VRF_COORDINATOR_ABI,
      deployer
    );
    
    // Check current subscription state
    console.log("\n📊 Checking current subscription...");
    try {
      const subscription = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
      
      console.log("Current subscription state:");
      console.log("- Balance:", ethers.formatEther(subscription.balance), "LINK");
      console.log("- Native Balance:", ethers.formatEther(subscription.nativeBalance), "ETH");
      console.log("- Request Count:", Number(subscription.reqCount));
      console.log("- Owner:", subscription.owner);
      console.log("- Current Consumers:", subscription.consumers.length);
      
      for (let i = 0; i < subscription.consumers.length; i++) {
        console.log(`  ${i + 1}. ${subscription.consumers[i]}`);
      }
      
      // Check if V2 contract is already a consumer
      const isAlreadyConsumer = subscription.consumers.includes(CONTRACT_V2_ADDRESS);
      
      if (isAlreadyConsumer) {
        console.log("\n✅ Contract V2 is already a consumer!");
        console.log("No action needed.");
        return;
      }
      
      // Check if owner matches deployer
      if (subscription.owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error(`\n❌ Account mismatch!`);
        console.error(`Subscription owner: ${subscription.owner}`);
        console.error(`Current account: ${deployer.address}`);
        console.error(`You must use the subscription owner account.`);
        process.exit(1);
      }
      
    } catch (error) {
      console.error("❌ Error checking subscription:", error.message);
      process.exit(1);
    }
    
    // Add V2 contract as consumer
    console.log("\n⚡ Adding V2 contract as consumer...");
    console.log(`Calling addConsumer(${SUBSCRIPTION_ID}, ${CONTRACT_V2_ADDRESS})`);
    
    const tx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, CONTRACT_V2_ADDRESS, {
      gasLimit: 100000
    });
    
    console.log("📝 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
    // Verify the addition
    console.log("\n🔍 Verifying addition...");
    const updatedSubscription = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
    
    console.log("Updated subscription state:");
    console.log("- Total Consumers:", updatedSubscription.consumers.length);
    
    const isNowConsumer = updatedSubscription.consumers.includes(CONTRACT_V2_ADDRESS);
    
    if (isNowConsumer) {
      console.log("✅ SUCCESS: V2 contract added as consumer!");
      
      console.log("\nUpdated consumer list:");
      for (let i = 0; i < updatedSubscription.consumers.length; i++) {
        const consumer = updatedSubscription.consumers[i];
        const isV2 = consumer === CONTRACT_V2_ADDRESS;
        console.log(`  ${i + 1}. ${consumer} ${isV2 ? '← V2 Contract' : ''}`);
      }
    } else {
      console.log("❌ FAILED: V2 contract was not added as consumer");
      process.exit(1);
    }
    
    // Check subscription balance
    const balance = Number(ethers.formatEther(updatedSubscription.balance));
    const nativeBalance = Number(ethers.formatEther(updatedSubscription.nativeBalance));
    
    console.log("\n💰 Subscription Funding Check:");
    console.log("- LINK Balance:", balance.toFixed(4), "LINK");
    console.log("- Native Balance:", nativeBalance.toFixed(6), "ETH");
    
    if (balance < 1) {
      console.log("⚠️  WARNING: Low LINK balance!");
      console.log("💡 Consider funding the subscription with more LINK tokens");
      console.log("   Visit: https://vrf.chain.link/ to add funds");
    } else {
      console.log("✅ Subscription has sufficient LINK balance");
    }
    
    console.log("\n🎉 VRF Consumer setup completed!");
    console.log("\n🔄 Next Steps:");
    console.log("1. Create Chainlink Automation Upkeep (see UPKEEP_V2_SETUP_GUIDE.md)");
    console.log("2. Test contract functions:");
    console.log("   await window.checkContractDrawTime()");
    console.log("3. Wait for first automated draw");
    
  } catch (error) {
    console.error("❌ Error adding consumer:", error);
    
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    
    if (error.message.includes("Ownable")) {
      console.error("💡 Make sure you're using the subscription owner account");
    }
    
    process.exit(1);
  }
}

// Execute script
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎉 Consumer addition script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

module.exports = { main }; 