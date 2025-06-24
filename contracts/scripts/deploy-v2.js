const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying LottoMojiCore V2...");
  console.log("==================================");
  
  // Configuration for Base Sepolia
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  const VRF_SUBSCRIPTION_ID = "33088903064086928793253033021668227318"; // Your subscription ID as string
  
  console.log("📋 Deployment Configuration:");
  console.log("- Network: Base Sepolia");
  console.log("- USDC Address:", USDC_ADDRESS);
  console.log("- VRF Subscription ID:", VRF_SUBSCRIPTION_ID);
  console.log("- Ticket Price: 0.2 USDC (changed from 2 USDC)");
  console.log("- New Features: setLastDrawTime() and setDrawTimeUTC() functions");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.001")) {
    console.error("❌ Insufficient ETH balance for deployment");
    process.exit(1);
  }
  
  try {
    // Deploy the contract
    console.log("\n⚡ Deploying contract...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    const contract = await LottoMojiCore.deploy(
      USDC_ADDRESS,
      VRF_SUBSCRIPTION_ID,
      {
        gasLimit: 5000000, // Set explicit gas limit
      }
    );
    
    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("✅ LottoMojiCore V2 deployed at:", contractAddress);
    
    // Wait for a few confirmations before verification
    console.log("⏳ Waiting for confirmations...");
    await contract.deploymentTransaction().wait(3);
    
    // Verify deployment by calling some view functions
    console.log("\n🔍 Verifying deployment...");
    
    const ticketPrice = await contract.TICKET_PRICE();
    const drawInterval = await contract.DRAW_INTERVAL();
    const drawTimeUTC = await contract.drawTimeUTC();
    const currentGameDay = await contract.getCurrentDay();
    
    console.log("📊 Contract Configuration:");
    console.log("- Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
    console.log("- Draw Interval:", Number(drawInterval) / 3600, "hours");
    console.log("- Draw Time UTC:", Number(drawTimeUTC) / 3600, "hours (03:00 UTC = 00:00 São Paulo)");
    console.log("- Current Game Day:", Number(currentGameDay));
    
    // Check new admin functions
    console.log("\n🔧 Checking new admin functions...");
    try {
      // These should exist but will revert due to onlyOwner
      const contractInterface = contract.interface;
      const hasSetLastDrawTime = contractInterface.hasFunction("setLastDrawTime");
      const hasSetDrawTimeUTC = contractInterface.hasFunction("setDrawTimeUTC");
      
      console.log("- setLastDrawTime function:", hasSetLastDrawTime ? "✅ Available" : "❌ Missing");
      console.log("- setDrawTimeUTC function:", hasSetDrawTimeUTC ? "✅ Available" : "❌ Missing");
    } catch (error) {
      console.log("⚠️ Could not check admin functions (this is normal)");
    }
    
    // Calculate time until next draw
    const lastDrawTime = await contract.lastDrawTime();
    const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
    const now = Math.floor(Date.now() / 1000);
    const timeUntilDraw = nextDrawTime - now;
    
    console.log("\n⏰ Draw Timing:");
    console.log("- Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
    console.log("- Next Draw Time:", new Date(nextDrawTime * 1000).toISOString());
    console.log("- Time Until Draw:", Math.floor(timeUntilDraw / 3600) + "h", Math.floor((timeUntilDraw % 3600) / 60) + "m");
    
    // Check if time is aligned with São Paulo midnight
    const nextDrawSP = new Date(nextDrawTime * 1000).toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour12: false 
    });
    const nextDrawTimeOnly = new Date(nextDrawTime * 1000).toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    console.log("- Next Draw (São Paulo):", nextDrawSP);
    console.log("- Is Midnight SP?:", nextDrawTimeOnly === '00:00' ? "✅ YES" : `❌ NO (${nextDrawTimeOnly})`);
    
    if (nextDrawTimeOnly !== '00:00') {
      console.log("\n⚠️ WARNING: Next draw is NOT at midnight São Paulo!");
      console.log("🔧 Use setLastDrawTime() to correct this after deployment.");
      
      // Calculate correct lastDrawTime for midnight
      const currentUTC = new Date(now * 1000);
      const nextMidnightUTC = new Date(currentUTC);
      
      if (currentUTC.getUTCHours() >= 3) {
        nextMidnightUTC.setUTCDate(nextMidnightUTC.getUTCDate() + 1);
      }
      
      nextMidnightUTC.setUTCHours(3, 0, 0, 0);
      const correctNextDraw = Math.floor(nextMidnightUTC.getTime() / 1000);
      const correctLastDraw = correctNextDraw - Number(drawInterval);
      
      console.log("💡 Suggested correction:");
      console.log(`   await contract.setLastDrawTime(${correctLastDraw});`);
      console.log(`   // This will set next draw to: ${new Date(correctNextDraw * 1000).toISOString()}`);
      console.log(`   // Which is midnight São Paulo: ${new Date(correctNextDraw * 1000).toLocaleString('es-BR', { timeZone: 'America/Sao_Paulo', hour12: false })}`);
    }
    
    console.log("\n✅ Deployment completed successfully!");
    console.log("📝 Contract Address:", contractAddress);
    console.log("\n🔄 Next Steps:");
    console.log("1. Update CONTRACT_ADDRESSES with new address");
    console.log("2. Add contract to VRF subscription as consumer");
    console.log("3. If timing is wrong, use setLastDrawTime() to correct");
    console.log("4. Remove temporary correction from frontend useContractTimer.ts");
    
    return contractAddress;
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then((address) => {
      console.log("\n🎉 Deployment script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

module.exports = { main }; 