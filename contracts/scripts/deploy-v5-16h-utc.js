const { ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 DEPLOYING LOTTO MOJI CORE V5 - 16H UTC");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Contract parameters
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
    const SUBSCRIPTION_ID = "70846359092368923949796315994230469102226608583606291730577230133525692264419";
    const DRAW_TIME_UTC = 16; // 16:00 UTC (4 PM UTC)
    
    console.log("\n📋 DEPLOYMENT PARAMETERS:");
    console.log("- USDC Address:", USDC_ADDRESS);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Draw Time UTC:", DRAW_TIME_UTC + ":00 UTC");
    
    console.log("\n🔧 DEPLOYING CONTRACT...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    const contract = await LottoMojiCore.deploy(
        USDC_ADDRESS,
        SUBSCRIPTION_ID,
        DRAW_TIME_UTC * 3600 // Convert hours to seconds
    );
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log("✅ CONTRACT DEPLOYED!");
    console.log("📍 Contract Address:", contractAddress);
    console.log("📡 Transaction Hash:", contract.deploymentTransaction().hash);
    
    console.log("\n⏳ WAITING FOR CONFIRMATIONS...");
    await contract.deploymentTransaction().wait(5); // Wait more confirmations for verification
    
    console.log("\n📄 EXTRACTING CONTRACT ABI...");
    const contractArtifact = await ethers.getContractFactory("LottoMojiCore");
    const abi = contractArtifact.interface.formatJson();
    
    // Save ABI to file
    const abiPath = path.join(__dirname, '..', 'contract-abi-v5-16h-utc.json');
    fs.writeFileSync(abiPath, abi);
    console.log("✅ ABI saved to:", abiPath);
    
    console.log("\n🔍 VERIFYING DEPLOYMENT...");
    const gameActive = await contract.gameActive();
    const automationActive = await contract.automationActive();
    const subscriptionId = await contract.subscriptionId();
    const drawInterval = await contract.DRAW_INTERVAL();
    const drawTimeUTC = await contract.drawTimeUTC();
    const currentGameDay = await contract.currentGameDay();
    
    console.log("✅ DEPLOYMENT VERIFIED:");
    console.log("- Game Active:", gameActive);
    console.log("- Automation Active:", automationActive);
    console.log("- Subscription ID:", subscriptionId.toString());
    console.log("- Draw Interval:", Number(drawInterval) / 3600, "hours");
    console.log("- Draw Time UTC:", Number(drawTimeUTC) / 3600, ":00 UTC");
    console.log("- Current Game Day:", currentGameDay.toString());
    
    console.log("\n🔐 VERIFYING CONTRACT ON BASESCAN...");
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [
                USDC_ADDRESS,
                SUBSCRIPTION_ID,
                DRAW_TIME_UTC * 3600
            ],
        });
        console.log("✅ Contract verified on Basescan!");
    } catch (error) {
        if (error.message.includes("already verified")) {
            console.log("ℹ️ Contract already verified on Basescan");
        } else {
            console.log("❌ Verification failed:", error.message);
            console.log("💡 You can verify manually later with:");
            console.log(`npx hardhat verify --network base-sepolia ${contractAddress} "${USDC_ADDRESS}" "${SUBSCRIPTION_ID}" "${DRAW_TIME_UTC * 3600}"`);
        }
    }
    
    console.log("\n✨ CONTRACT FEATURES:");
    console.log("- ✅ Fixed upkeep timing loop");
    console.log("- ✅ Integrated reserve system");
    console.log("- ✅ NFT ticket functionality");
    console.log("- ✅ Auto-refill from reserves");
    console.log("- ✅ Daily draw at 16:00 UTC");
    
    console.log("\n🔄 UPDATING FRONTEND CONTRACT ADDRESS...");
    try {
        const frontendAddressesPath = path.join(__dirname, '..', '..', 'src', 'utils', 'contractAddresses.ts');
        if (fs.existsSync(frontendAddressesPath)) {
            let addressesContent = fs.readFileSync(frontendAddressesPath, 'utf8');
            
            // Replace the contract address
            const oldAddressRegex = /LOTTO_MOJI_CORE: ['"](0x[a-fA-F0-9]{40})['"],?/;
            const newAddressLine = `LOTTO_MOJI_CORE: "${contractAddress}",`;
            
            if (oldAddressRegex.test(addressesContent)) {
                addressesContent = addressesContent.replace(oldAddressRegex, newAddressLine);
                fs.writeFileSync(frontendAddressesPath, addressesContent);
                console.log("✅ Frontend contract address updated!");
            } else {
                console.log("⚠️ Could not auto-update frontend address. Please update manually.");
            }
        } else {
            console.log("⚠️ Frontend contractAddresses.ts not found. Please update manually.");
        }
    } catch (error) {
        console.log("⚠️ Error updating frontend address:", error.message);
    }
    
    console.log("\n📋 NEXT STEPS:");
    console.log("1. 🔗 Add this contract as VRF consumer:");
    console.log(`   https://vrf.chain.link/base-sepolia/${SUBSCRIPTION_ID}`);
    console.log("2. 💰 Ensure VRF subscription has sufficient LINK balance");
    console.log("3. 🤖 Create Chainlink Automation upkeep:");
    console.log(`   https://automation.chain.link/base-sepolia`);
    console.log("   - Target: ${contractAddress}");
    console.log("   - Use custom logic upkeep");
    console.log("4. 🎫 Test ticket purchase and draw functionality");
    console.log("5. ✅ Frontend automatically updated with new address");
    
    console.log("\n🎉 DEPLOYMENT COMPLETED!");
    console.log("=".repeat(60));
    console.log("📍 CONTRACT ADDRESS:", contractAddress);
    console.log("📄 ABI FILE:", abiPath);
    console.log("🔗 BASESCAN:", `https://sepolia.basescan.org/address/${contractAddress}`);
    console.log("⏰ DRAW TIME: 16:00 UTC (Daily)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });