const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying LottoMojiCore V5 Test Contract - 13:30 Bogotá Time...");
  
  // Contract parameters
  const vrfCoordinator = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B"; // Base VRF Coordinator
  const subscriptionId = "30473226677829420045511411773105725386851108839457906579990475078331637852282"; // NEW SUBSCRIPTION ID
  const keyHash = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae"; // Base 200 gwei key hash
  const usdcToken = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base USDC
  
  // Time configuration - 13:30 Bogotá = 18:30 UTC = 18.5 hours
  const drawTimeUTC = Math.floor(18.5 * 3600); // 18.5 hours in seconds (13:30 Bogotá)
  
  console.log("📋 Contract Parameters:");
  console.log("- VRF Coordinator:", vrfCoordinator);
  console.log("- Subscription ID:", subscriptionId);
  console.log("- Key Hash:", keyHash);
  console.log("- USDC Token:", usdcToken);
  console.log("- Draw Time UTC:", drawTimeUTC, "seconds (18:30 UTC / 13:30 Bogotá)");
  
  // Deploy contract
  const LottoMojiCore = await hre.ethers.getContractFactory("LottoMojiCore");
  const contract = await LottoMojiCore.deploy(
    usdcToken,
    subscriptionId,
    drawTimeUTC
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ Contract deployed to:", contractAddress);
  console.log("🔗 Basescan URL:", `https://basescan.org/address/${contractAddress}`);
  
  // Wait for a few block confirmations
  console.log("⏳ Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Verify contract
  try {
    console.log("🔍 Verifying contract on Basescan...");
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        usdcToken,
        subscriptionId,
        drawTimeUTC
      ],
    });
    console.log("✅ Contract verified on Basescan!");
  } catch (error) {
    console.log("❌ Verification failed:", error.message);
    console.log("📝 Manual verification parameters:");
    console.log("Constructor arguments:", [
      usdcToken,
      subscriptionId,
      drawTimeUTC
    ]);
  }
  
  // Extract and save ABI
  const contractArtifact = await hre.artifacts.readArtifact("LottoMojiCore");
  const fs = require('fs');
  
  const abiData = {
    contractName: "LottoMojiCore",
    version: "V5-TEST-1330-BOGOTA",
    address: contractAddress,
    network: "base",
    deployedAt: new Date().toISOString(),
    subscriptionId: subscriptionId,
    drawTimeUTC: drawTimeUTC,
    drawTimeBogota: "13:30",
    abi: contractArtifact.abi
  };
  
  fs.writeFileSync('contract-abi-v5-test-1330.json', JSON.stringify(abiData, null, 2));
  console.log("💾 ABI saved to contract-abi-v5-test-1330.json");
  
  // Test basic contract functions
  console.log("\n🧪 Testing basic contract functions...");
  
  try {
    const ticketPrice = await contract.ticketPrice();
    console.log("- Ticket Price:", hre.ethers.formatUnits(ticketPrice, 6), "USDC");
    
    const drawTime = await contract.drawTimeUTC();
    console.log("- Draw Time UTC:", drawTime.toString(), "seconds");
    
    const currentDay = await contract.getCurrentDay();
    console.log("- Current Day:", currentDay.toString());
    
    console.log("✅ Contract is working correctly!");
  } catch (error) {
    console.log("❌ Contract test failed:", error.message);
  }
  
  console.log("\n🎯 DEPLOYMENT SUMMARY:");
  console.log("==========================================");
  console.log("Contract Address:", contractAddress);
  console.log("Subscription ID:", subscriptionId);
  console.log("Draw Time: 13:30 Bogotá (18:30 UTC)");
  console.log("Ticket Price: 0.2 USDC");
  console.log("Network: Base");
  console.log("==========================================");
  console.log("\n⏰ Next draw will be at 13:30 Bogotá time!");
  console.log("🔗 Add this contract as consumer to VRF subscription:", subscriptionId);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 