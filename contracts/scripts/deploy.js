const hre = require("hardhat");

async function main() {
  console.log("Deploying LottoMojiCore contract...");

  // Direcciones para Base Sepolia testnet
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // USDC on Base Sepolia
  const SUBSCRIPTION_ID = "105961847727705490544354750783936451991128107961690295417839588082464327658827"; // Tu subscription ID de VRF

  // Get the contract factory
  const LottoMojiCore = await hre.ethers.getContractFactory("LottoMojiCore");

  // Deploy the contract
  const lottoMojiCore = await LottoMojiCore.deploy(
    USDC_ADDRESS,
    SUBSCRIPTION_ID
  );

  await lottoMojiCore.waitForDeployment();

  const contractAddress = await lottoMojiCore.getAddress();
  
  console.log(`LottoMojiCore deployed to: ${contractAddress}`);
  console.log(`USDC Address: ${USDC_ADDRESS}`);
  console.log(`VRF Subscription ID: ${SUBSCRIPTION_ID}`);
  
  // Verify the contract if on a real network
  if (hre.network.name !== "hardhat") {
    console.log("Waiting for 5 confirmations before verification...");
    await lottoMojiCore.deploymentTransaction().wait(5);
    
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          USDC_ADDRESS,
          SUBSCRIPTION_ID
        ],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }

  // Log deployment details
  console.log("\n=== Deployment Summary ===");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployer: ${(await hre.ethers.getSigners())[0].address}`);
  console.log(`USDC Token: ${USDC_ADDRESS}`);
  console.log(`VRF Subscription: ${SUBSCRIPTION_ID}`);
  console.log("\n=== Next Steps ===");
  console.log("1. Add this contract as a consumer to your VRF subscription");
  console.log("2. Fund your VRF subscription with LINK tokens");
  console.log("3. Register the contract for Chainlink Automation");
  console.log("4. Update frontend contract addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 