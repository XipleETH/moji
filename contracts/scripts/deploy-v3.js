const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying LottoMojiCore V3...");
  console.log("==================================");
  
  // Configuration for Base Sepolia
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  const VRF_SUBSCRIPTION_ID = "33088903064086928793253033021668227318"; // Your subscription ID as string
  
  console.log("📋 Deployment Configuration:");
  console.log("- Network: Base Sepolia");
  console.log("- USDC Address:", USDC_ADDRESS);
  console.log("- VRF Subscription ID:", VRF_SUBSCRIPTION_ID);
  console.log("- Ticket Price: 0.2 USDC");
  console.log("- V3 Features:");
  console.log("  • Proportional reserve distribution (80%/10%/10%)");
  console.log("  • Auto-refill from reserves when pools empty");
  console.log("  • No development reserve (5% buffer)");
  
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
    console.log("✅ LottoMojiCore V3 deployed at:", contractAddress);
    
    // Wait for a few confirmations before verification
    console.log("⏳ Waiting for confirmations...");
    await contract.deploymentTransaction().wait(3);
    
    // Verify deployment by calling some view functions
    console.log("\n🔍 Verifying deployment...");
    
    const ticketPrice = await contract.TICKET_PRICE();
    const drawInterval = await contract.DRAW_INTERVAL();
    const drawTimeUTC = await contract.drawTimeUTC();
    const currentGameDay = await contract.getCurrentDay();
    
    // Verify reserve percentages
    const dailyReservePercentage = await contract.DAILY_RESERVE_PERCENTAGE();
    const firstPrizePercentage = await contract.FIRST_PRIZE_PERCENTAGE();
    const secondPrizePercentage = await contract.SECOND_PRIZE_PERCENTAGE();
    const thirdPrizePercentage = await contract.THIRD_PRIZE_PERCENTAGE();
    const developmentPercentage = await contract.DEVELOPMENT_PERCENTAGE();
    
    console.log("📊 Contract Configuration:");
    console.log("- Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
    console.log("- Draw Interval:", Number(drawInterval) / 3600, "hours");
    console.log("- Draw Time UTC:", Number(drawTimeUTC) / 3600, "hours (03:00 UTC = 00:00 São Paulo)");
    console.log("- Current Game Day:", Number(currentGameDay));
    
    console.log("\n💰 Reserve Distribution V3:");
    console.log("- Daily to Reserves:", Number(dailyReservePercentage) + "%");
    console.log("- Prize Pool Percentages:");
    console.log("  • First Prize: " + Number(firstPrizePercentage) + "% (gets " + (Number(dailyReservePercentage) * Number(firstPrizePercentage) / 100) + "% of total revenue in reserves)");
    console.log("  • Second Prize: " + Number(secondPrizePercentage) + "% (gets " + (Number(dailyReservePercentage) * Number(secondPrizePercentage) / 100) + "% of total revenue in reserves)");
    console.log("  • Third Prize: " + Number(thirdPrizePercentage) + "% (gets " + (Number(dailyReservePercentage) * Number(thirdPrizePercentage) / 100) + "% of total revenue in reserves)");
    console.log("  • Development: " + Number(developmentPercentage) + "% (no reserve, 1% buffer remains)");
    
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
    
    // Test reserve distribution calculation
    console.log("\n🧮 V3 Reserve Distribution Example (0.2 USDC ticket):");
    const ticketPriceFloat = 0.2;
    const reservePortion = ticketPriceFloat * (Number(dailyReservePercentage) / 100); // 20% = 0.04
    
    const firstReserve = reservePortion * (Number(firstPrizePercentage) / 100); // 80% of reserves
    const secondReserve = reservePortion * (Number(secondPrizePercentage) / 100); // 10% of reserves
    const thirdReserve = reservePortion * (Number(thirdPrizePercentage) / 100); // 10% of reserves
    const developmentBuffer = reservePortion * (Number(developmentPercentage) / 100); // 5% buffer
    
    console.log("- Total Reserve Portion:", reservePortion.toFixed(6), "USDC (20% of ticket)");
    console.log("- First Prize Reserve:", firstReserve.toFixed(6), "USDC (" + (firstReserve/ticketPriceFloat*100).toFixed(1) + "% of ticket)");
    console.log("- Second Prize Reserve:", secondReserve.toFixed(6), "USDC (" + (secondReserve/ticketPriceFloat*100).toFixed(1) + "% of ticket)");
    console.log("- Third Prize Reserve:", thirdReserve.toFixed(6), "USDC (" + (thirdReserve/ticketPriceFloat*100).toFixed(1) + "% of ticket)");
    console.log("- Development Buffer:", developmentBuffer.toFixed(6), "USDC (" + (developmentBuffer/ticketPriceFloat*100).toFixed(1) + "% of ticket, stays in contract)");
    
    const totalDistributed = firstReserve + secondReserve + thirdReserve;
    console.log("- Total Distributed to Reserves:", totalDistributed.toFixed(6), "USDC");
    console.log("- Buffer remaining:", (reservePortion - totalDistributed).toFixed(6), "USDC");
    
    console.log("\n✅ Deployment completed successfully!");
    console.log("📝 Contract Address:", contractAddress);
    console.log("\n🆚 V3 Changes from V2:");
    console.log("✅ Reserve distribution is now proportional to prize percentages");
    console.log("✅ Auto-refill mechanism when main pools are empty");
    console.log("✅ No development reserve (5% stays as contract buffer)");
    console.log("✅ Better capital efficiency for larger prizes");
    
    console.log("\n🔄 Next Steps:");
    console.log("1. Fix timing if needed: npm run fix-timing");
    console.log("2. Add to VRF subscription: npm run add-consumer");
    console.log("3. Create new Chainlink Automation Upkeep");
    console.log("4. Update frontend contract addresses");
    console.log("5. Test reserve distribution with npm run test-payments");
    
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
      console.log("\n🎉 V3 Deployment script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

module.exports = { main }; 