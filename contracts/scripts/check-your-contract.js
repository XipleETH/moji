const { ethers } = require("hardhat");

// CONTRATO V6 - EL QUE USA EL FRONTEND ACTUALMENTE
const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";

// SUBSCRIPTION ID CORRECTO
const YOUR_SUBSCRIPTION_ID = "70846359092368923949796315994230469102226608583606291730577230133525692264419";

async function main() {
    console.log("🔍 CHECKING YOUR ACTUAL CONTRACT");
    console.log("=".repeat(50));
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    console.log("🎯 Expected Subscription ID:", YOUR_SUBSCRIPTION_ID);
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log("👤 Checking with wallet:", deployer.address);
        
        // Connect to YOUR contract
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // 1. Check subscription ID
        console.log("\n📋 1. SUBSCRIPTION ID CHECK");
        console.log("-".repeat(30));
        
        const contractSubId = await contract.subscriptionId();
        console.log("📜 Contract has:", contractSubId.toString());
        console.log("🎯 You expect:", YOUR_SUBSCRIPTION_ID);
        console.log("✅ Match:", contractSubId.toString() === YOUR_SUBSCRIPTION_ID);
        
        // 2. Check contract status
        console.log("\n📊 2. CONTRACT STATUS");
        console.log("-".repeat(30));
        
        const [gameActive, automationActive, currentGameDay] = await Promise.all([
            contract.gameActive(),
            contract.automationActive(),
            contract.currentGameDay()
        ]);
        
        console.log("🎮 Game Active:", gameActive);
        console.log("🤖 Automation Active:", automationActive);
        console.log("📅 Current Game Day:", Number(currentGameDay));
        
        // 3. Check upkeep status
        console.log("\n🔄 3. UPKEEP STATUS");
        console.log("-".repeat(30));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("⚡ Upkeep Needed:", upkeepNeeded);
        console.log("📦 Perform Data:", performData);
        
        if (upkeepNeeded) {
            console.log("\n🚨 UPKEEP IS NEEDED - DRAW IS OVERDUE!");
            
            // Check timing
            const [lastDrawTime, drawTimeUTC, drawInterval] = await Promise.all([
                contract.lastDrawTime(),
                contract.drawTimeUTC(),
                contract.DRAW_INTERVAL()
            ]);
            
            const now = Math.floor(Date.now() / 1000);
            const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
            const overdue = now - nextDrawTime;
            
            console.log("⏰ Last Draw:", new Date(Number(lastDrawTime) * 1000).toISOString());
            console.log("📅 Should Draw At:", new Date(nextDrawTime * 1000).toISOString());
            console.log("🕐 Current Time:", new Date(now * 1000).toISOString());
            console.log("⚠️ Overdue by:", Math.floor(overdue / 3600), "hours", Math.floor((overdue % 3600) / 60), "minutes");
        }
        
        // 4. If subscription IDs don't match, that's the problem!
        if (contractSubId.toString() !== YOUR_SUBSCRIPTION_ID) {
            console.log("\n🚨 PROBLEM IDENTIFIED!");
            console.log("=".repeat(50));
            console.log("❌ The contract has the WRONG subscription ID!");
            console.log("📜 Contract has:", contractSubId.toString());
            console.log("🎯 Should have:", YOUR_SUBSCRIPTION_ID);
            console.log("");
            console.log("💡 This is why VRF requests are failing!");
            console.log("📞 The contract is trying to use subscription:", contractSubId.toString());
            console.log("💰 But your LINK funds are in subscription:", YOUR_SUBSCRIPTION_ID);
            console.log("");
            console.log("🔧 SOLUTIONS:");
            console.log("1. Add the contract as consumer to the subscription it's trying to use");
            console.log("2. Or deploy a new contract with the correct subscription ID");
            console.log("3. Or transfer LINK to the subscription the contract is using");
        } else {
            console.log("\n✅ SUBSCRIPTION ID IS CORRECT!");
            console.log("🔍 The problem must be elsewhere...");
            
            // Check if contract is added as consumer
            console.log("\n📋 NEXT STEPS TO CHECK:");
            console.log("1. Go to https://vrf.chain.link/");
            console.log("2. Connect your wallet");
            console.log("3. Find subscription:", YOUR_SUBSCRIPTION_ID);
            console.log("4. Check if contract", CONTRACT_ADDRESS, "is listed as consumer");
            console.log("5. Check if subscription has enough LINK balance");
        }
        
        console.log("\n✅ CHECK COMPLETED");
        console.log("=".repeat(50));
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 