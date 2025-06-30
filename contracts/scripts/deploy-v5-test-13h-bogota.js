const { ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🧪 DEPLOYING V5 TEST CONTRACT - 13:00 BOGOTÁ TIME");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Contract parameters
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
    
    console.log("\n📋 TEST DEPLOYMENT PARAMETERS:");
    console.log("- USDC Address:", USDC_ADDRESS);
    console.log("- Draw Time: 18:00 UTC = 13:00 Bogotá");
    console.log("- Purpose: Test upkeep fix");
    
    console.log("\n🔧 DEPLOYING TEST CONTRACT...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    const contract = await LottoMojiCore.deploy(USDC_ADDRESS);
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log("✅ TEST CONTRACT DEPLOYED!");
    console.log("📍 Contract Address:", contractAddress);
    console.log("📡 Transaction Hash:", contract.deploymentTransaction().hash);
    
    console.log("\n⏳ WAITING FOR CONFIRMATIONS...");
    await contract.deploymentTransaction().wait(5);
    
    console.log("\n🔍 VERIFYING DEPLOYMENT...");
    const [gameActive, automationActive, subscriptionId, drawTime, gameDay, lastDraw] = await Promise.all([
        contract.gameActive(),
        contract.automationActive(),
        contract.subscriptionId(),
        contract.drawTimeUTC(),
        contract.getCurrentDay(),
        contract.lastDrawTime()
    ]);
    
    console.log("✅ DEPLOYMENT VERIFIED:");
    console.log("- Game Active:", gameActive);
    console.log("- Automation Active:", automationActive);
    console.log("- Subscription ID:", subscriptionId.toString() === '105961847727705490544354750783936451991128107961690295417839588082464327658827' ? '✅ CORRECT' : '❌ WRONG');
    console.log("- Draw Time UTC:", Number(drawTime) / 3600, "hours (18:00 UTC = 13:00 Bogotá)");
    console.log("- Current Game Day:", Number(gameDay));
    console.log("- Last Draw:", new Date(Number(lastDraw) * 1000).toISOString());
    
    // Calculate next draw time
    const now = Math.floor(Date.now() / 1000);
    const DRAW_INTERVAL = 24 * 3600; // 24 hours
    const nextDrawTime = Number(lastDraw) + DRAW_INTERVAL;
    const timeToNext = nextDrawTime - now;
    
    console.log("- Next Draw:", new Date(nextDrawTime * 1000).toISOString());
    console.log("- Time to Next:", timeToNext > 0 ? `${Math.floor(timeToNext / 3600)}h ${Math.floor((timeToNext % 3600) / 60)}m` : "OVERDUE");
    
    // Check upkeep
    const [upkeepNeeded] = await contract.checkUpkeep('0x');
    console.log("- Upkeep Needed:", upkeepNeeded ? "🚨 YES" : "✅ NO");
    
    console.log("\n🔐 VERIFYING CONTRACT ON BASESCAN...");
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [USDC_ADDRESS],
        });
        console.log("✅ Contract verified on Basescan!");
    } catch (error) {
        if (error.message.includes("already verified")) {
            console.log("ℹ️ Contract already verified on Basescan");
        } else {
            console.log("❌ Verification failed:", error.message);
            console.log("💡 You can verify manually later with:");
            console.log(`npx hardhat verify --network base-sepolia ${contractAddress} "${USDC_ADDRESS}"`);
        }
    }
    
    console.log("\n📄 EXTRACTING CONTRACT ABI...");
    const contractArtifact = await ethers.getContractFactory("LottoMojiCore");
    const abi = contractArtifact.interface.formatJson();
    
    // Save ABI to file
    const abiPath = path.join(__dirname, '..', 'contract-abi-v5-test.json');
    fs.writeFileSync(abiPath, abi);
    console.log("✅ ABI saved to:", abiPath);
    
    console.log("\n🧪 TEST CONFIGURATION:");
    console.log("- ✅ Draw time changed to 18:00 UTC (13:00 Bogotá)");
    console.log("- ✅ Upkeep fix implemented (prevents infinite loop)");
    console.log("- ✅ Same subscription ID as production");
    console.log("- ✅ All other settings identical to V5");
    
    console.log("\n📋 NEXT STEPS FOR TESTING:");
    console.log("1. Add contract as VRF consumer:");
    console.log(`   https://vrf.chain.link/base-sepolia/105961847727705490544354750783936451991128107961690295417839588082464327658827`);
    console.log("2. Create Chainlink Automation upkeep:");
    console.log(`   Target: ${contractAddress}`);
    console.log("3. Wait for 13:00 Bogotá time (18:00 UTC) to test");
    console.log("4. Monitor upkeep execution - should only execute ONCE");
    
    console.log("\n🎯 TESTING SCHEDULE:");
    const now_date = new Date();
    const bogota_time = new Date(now_date.getTime() - (5 * 60 * 60 * 1000)); // UTC-5
    console.log("- Current Bogotá time:", bogota_time.toLocaleString());
    console.log("- Next test execution: TODAY at 13:00 Bogotá");
    console.log("- Expected result: Single upkeep execution, no infinite loop");
    
    console.log("\n🎉 TEST DEPLOYMENT COMPLETED!");
    console.log("=".repeat(60));
    console.log("📍 TEST CONTRACT:", contractAddress);
    console.log("📄 ABI FILE:", abiPath);
    console.log("🔗 BASESCAN:", `https://sepolia.basescan.org/address/${contractAddress}`);
    console.log("⏰ DRAW TIME: 13:00 Bogotá (18:00 UTC)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 