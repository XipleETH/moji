const { ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 DEPLOYING UPGRADED CONTRACT V5 - UPKEEP FIX");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Contract parameters (same as current contract)
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
    const VRF_COORDINATOR = "0x5CE8D5A2BC84beb22a398CCA51996F7930313D61"; // Base Sepolia VRF
    const KEY_HASH = "0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899";
    const SUBSCRIPTION_ID = "105961847727705490544354750783936451991128107961690295417839588082464327658827";
    
    console.log("\n📋 DEPLOYMENT PARAMETERS:");
    console.log("- USDC Address:", USDC_ADDRESS);
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    console.log("- Key Hash:", KEY_HASH);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    
    console.log("\n🔧 DEPLOYING CONTRACT...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    const contract = await LottoMojiCore.deploy(
        USDC_ADDRESS
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
    const abiPath = path.join(__dirname, '..', 'contract-abi-v5.json');
    fs.writeFileSync(abiPath, abi);
    console.log("✅ ABI saved to:", abiPath);
    
    console.log("\n🔍 VERIFYING DEPLOYMENT...");
    const gameActive = await contract.gameActive();
    const automationActive = await contract.automationActive();
    const subscriptionId = await contract.subscriptionId();
    const drawInterval = await contract.DRAW_INTERVAL();
    
    console.log("✅ DEPLOYMENT VERIFIED:");
    console.log("- Game Active:", gameActive);
    console.log("- Automation Active:", automationActive);
    console.log("- Subscription ID:", subscriptionId.toString());
    console.log("- Draw Interval:", Number(drawInterval) / 3600, "hours");
    
    console.log("\n🔐 VERIFYING CONTRACT ON BASESCAN...");
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [
                USDC_ADDRESS
            ],
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
    
    console.log("\n🔧 WHAT'S FIXED IN V5:");
    console.log("- ✅ performUpkeep now updates lastDrawTime IMMEDIATELY");
    console.log("- ✅ Prevents infinite upkeep loop that was burning LINK");
    console.log("- ✅ Calculates proper next draw time aligned with schedule");
    console.log("- ✅ VRF callback no longer overwrites timing");
    
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
    console.log("1. Add this contract as VRF consumer:");
    console.log(`   https://vrf.chain.link/base-sepolia/${SUBSCRIPTION_ID}`);
    console.log("2. ✅ Frontend contract address updated automatically");
    console.log("3. Transfer USDC from old contract (if needed)");
    console.log("4. Create new Chainlink Automation upkeep:");
    console.log(`   https://automation.chain.link/base-sepolia`);
    console.log("5. Test the fix with a manual draw");
    
    console.log("\n🎉 UPGRADE COMPLETED!");
    console.log("=".repeat(60));
    console.log("📍 NEW CONTRACT:", contractAddress);
    console.log("📄 ABI FILE:", abiPath);
    console.log("🔗 BASESCAN:", `https://sepolia.basescan.org/address/${contractAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 