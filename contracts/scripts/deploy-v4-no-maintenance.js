const { ethers } = require("hardhat");

// Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
    console.log("🚀 DEPLOYING LOTTOMOJI V4 - NO MAINTENANCE SYSTEM");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("🏠 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    console.log("\n📋 CONTRACT CONFIGURATION");
    console.log("-".repeat(40));
    console.log("🪙 USDC Address:", USDC_ADDRESS);
    console.log("🎲 VRF Subscription ID: 105961847727705490544354750783936451991128107961690295417839588082464327658827");
    console.log("🎯 Ticket Price: 0.2 USDC");
    console.log("⏰ Draw Time: 03:00 UTC (00:00 São Paulo)");
    console.log("🔄 Draw Interval: 24 hours");
    console.log("📊 Main Pool: 80% | Reserves: 20%");
    console.log("🏆 Prize Distribution: 80%/10%/5%/5%");
    
    console.log("\n🔨 DEPLOYING CONTRACT...");
    console.log("-".repeat(40));
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    // Deploy with only USDC address (VRF subscription ID is hardcoded)
    const contract = await LottoMojiCore.deploy(USDC_ADDRESS);
    
    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("✅ CONTRACT DEPLOYED!");
    console.log("📍 Contract Address:", contractAddress);
    
    console.log("\n🔍 VERIFICATION");
    console.log("-".repeat(40));
    
    try {
        // Verify basic contract state
        const subscriptionId = await contract.subscriptionId();
        const usdcToken = await contract.usdcToken();
        const ticketPrice = await contract.TICKET_PRICE();
        const drawInterval = await contract.DRAW_INTERVAL();
        const drawTimeUTC = await contract.drawTimeUTC();
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        
        console.log("✅ VRF Subscription ID:", subscriptionId.toString());
        console.log("✅ USDC Token:", usdcToken);
        console.log("✅ Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("✅ Draw Interval:", Number(drawInterval) / 3600, "hours");
        console.log("✅ Draw Time UTC:", Number(drawTimeUTC) / 3600, ":00");
        console.log("✅ Game Active:", gameActive);
        console.log("✅ Automation Active:", automationActive);
        console.log("✅ Emergency Pause:", emergencyPause);
        
        // Verify timing
        const currentDay = await contract.getCurrentDay();
        console.log("✅ Current Game Day:", Number(currentDay));
        
        // Check upkeep (should be false for new contract)
        const [upkeepNeeded] = await contract.checkUpkeep("0x");
        console.log("✅ Upkeep Needed:", upkeepNeeded);
        
        console.log("\n🎯 NEW FEATURES V4");
        console.log("-".repeat(40));
        console.log("✅ ❌ NO maintenance system (removed completely)");
        console.log("✅ 🔄 Integrated reserve processing into draw flow");
        console.log("✅ 📈 Reserves move to pools BEFORE draw");
        console.log("✅ 🏆 Prize distribution AFTER draw");
        console.log("✅ 🔄 Auto-refill from reserves AFTER distribution");
        console.log("✅ ⚡ Single 24-hour cycle execution");
        console.log("✅ 🎲 Hardcoded VRF subscription ID");
        
        console.log("\n📋 NEXT STEPS");
        console.log("-".repeat(40));
        console.log("1. 🔗 Add contract as VRF consumer:");
        console.log("   node scripts/add-consumer-to-vrf.js");
        console.log("2. 🤖 Create/Update Chainlink Automation upkeep:");
        console.log("   - Target Contract:", contractAddress);
        console.log("   - Trigger: Custom Logic");
        console.log("   - Gas Limit: 2,000,000");
        console.log("   - Check Function: checkUpkeep(bytes)");
        console.log("3. 🧪 Test contract:");
        console.log("   node scripts/test-payment-system-v4.js");
        console.log("4. ⏰ Verify timing:");
        console.log("   node scripts/test-timing-v4.js");
        
        console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
        console.log("=".repeat(60));
        console.log("📍 V4 Contract Address:", contractAddress);
        console.log("🔧 No maintenance = Better performance");
        console.log("🎯 Integrated flow = Better UX");
        console.log("⚡ Single execution = Lower gas costs");
        
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Deployment failed:", error);
        process.exit(1);
    }); 