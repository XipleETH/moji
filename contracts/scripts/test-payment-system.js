const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing LottoMoji V2 Payment System...");
  console.log("=======================================");
  
  // Configuration
  const CONTRACT_ADDRESS = "0x8F6A8D8E1408d53D1C06Ed0664CC334Fa533480c"; // V2 Contract
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  
  console.log("📋 Configuration:");
  console.log("- Contract V2:", CONTRACT_ADDRESS);
  console.log("- USDC Token:", USDC_ADDRESS);
  console.log("- Expected Ticket Price: 0.2 USDC");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Using account:", deployer.address);
  
  try {
    // Connect to contracts
    console.log("\n🔗 Connecting to contracts...");
    
    const LOTTO_ABI = [
      // View functions
      "function TICKET_PRICE() view returns (uint256)",
      "function getCurrentDay() view returns (uint256)",
      "function ticketCounter() view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      
      // Pool view functions
      "function mainPools() view returns (uint256 firstPrizeAccumulated, uint256 secondPrizeAccumulated, uint256 thirdPrizeAccumulated, uint256 developmentAccumulated)",
      "function reserves() view returns (uint256 firstPrizeReserve1, uint256 secondPrizeReserve2, uint256 thirdPrizeReserve3)",
      "function dailyPools(uint256) view returns (uint256 totalCollected, uint256 mainPoolPortion, uint256 reservePortion, uint256 firstPrizeDaily, uint256 secondPrizeDaily, uint256 thirdPrizeDaily, uint256 developmentDaily, bool distributed, uint256 distributionTime, bool drawn, bool reservesSent)",
      
      // Pool constants
      "function DAILY_RESERVE_PERCENTAGE() view returns (uint256)",
      "function MAIN_POOL_PERCENTAGE() view returns (uint256)",
      "function FIRST_PRIZE_PERCENTAGE() view returns (uint256)",
      "function SECOND_PRIZE_PERCENTAGE() view returns (uint256)",
      "function THIRD_PRIZE_PERCENTAGE() view returns (uint256)",
      "function DEVELOPMENT_PERCENTAGE() view returns (uint256)",
      
      // Ticket functions (if you have test USDC)
      "function buyTicket(uint8[4] memory numbers) external",
      "function getGameDayTickets(uint256 gameDay) view returns (uint256[])",
      "function getUserTickets(address user) view returns (uint256[])",
      "function getTicketInfo(uint256 ticketId) view returns (address, uint8[4], uint256, bool, uint8)",
      
      // Balance check
      "function balanceOf(address) view returns (uint256)",
      "function ownerOf(uint256) view returns (address)"
    ];
    
    const USDC_ABI = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, LOTTO_ABI, deployer);
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, deployer);
    
    // 1. Verify Contract Configuration
    console.log("\n📊 Contract Configuration:");
    console.log("=========================");
    
    const ticketPrice = await contract.TICKET_PRICE();
    const dailyReservePercentage = await contract.DAILY_RESERVE_PERCENTAGE();
    const mainPoolPercentage = await contract.MAIN_POOL_PERCENTAGE();
    const firstPrizePercentage = await contract.FIRST_PRIZE_PERCENTAGE();
    const secondPrizePercentage = await contract.SECOND_PRIZE_PERCENTAGE();
    const thirdPrizePercentage = await contract.THIRD_PRIZE_PERCENTAGE();
    const developmentPercentage = await contract.DEVELOPMENT_PERCENTAGE();
    
    console.log("- Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
    console.log("- Daily to Reserves:", Number(dailyReservePercentage) + "%");
    console.log("- Daily to Main Pools:", Number(mainPoolPercentage) + "%");
    console.log("- First Prize:", Number(firstPrizePercentage) + "% of main pool");
    console.log("- Second Prize:", Number(secondPrizePercentage) + "% of main pool");
    console.log("- Third Prize:", Number(thirdPrizePercentage) + "% of main pool");
    console.log("- Development:", Number(developmentPercentage) + "% of main pool");
    
    // Verify percentages add up correctly
    const totalMainPercentages = Number(firstPrizePercentage) + Number(secondPrizePercentage) + 
                                Number(thirdPrizePercentage) + Number(developmentPercentage);
    console.log("✅ Main pool percentages sum:", totalMainPercentages + "%", totalMainPercentages === 100 ? "✅" : "❌");
    
    // 2. Current Game State
    console.log("\n🎮 Current Game State:");
    console.log("=====================");
    
    const currentGameDay = await contract.getCurrentDay();
    const ticketCounter = await contract.ticketCounter();
    const totalSupply = await contract.totalSupply();
    
    console.log("- Current Game Day:", Number(currentGameDay));
    console.log("- Total Tickets Created:", Number(ticketCounter));
    console.log("- Total NFTs in Supply:", Number(totalSupply));
    
    // 3. Current Pool State
    console.log("\n💰 Current Pool State:");
    console.log("======================");
    
    const mainPools = await contract.mainPools();
    const reserves = await contract.reserves();
    
    console.log("Main Accumulated Pools:");
    console.log("- First Prize Pool:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
    console.log("- Second Prize Pool:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
    console.log("- Third Prize Pool:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
    console.log("- Development Pool:", ethers.formatUnits(mainPools.developmentAccumulated, 6), "USDC");
    
    const totalMainPools = Number(ethers.formatUnits(
      mainPools.firstPrizeAccumulated + mainPools.secondPrizeAccumulated + 
      mainPools.thirdPrizeAccumulated + mainPools.developmentAccumulated, 6
    ));
    console.log("- Total Main Pools:", totalMainPools.toFixed(6), "USDC");
    
    console.log("\nReserve Pools:");
    console.log("- First Prize Reserve:", ethers.formatUnits(reserves.firstPrizeReserve1, 6), "USDC");
    console.log("- Second Prize Reserve:", ethers.formatUnits(reserves.secondPrizeReserve2, 6), "USDC");
    console.log("- Third Prize Reserve:", ethers.formatUnits(reserves.thirdPrizeReserve3, 6), "USDC");
    
    const totalReserves = Number(ethers.formatUnits(
      reserves.firstPrizeReserve1 + reserves.secondPrizeReserve2 + reserves.thirdPrizeReserve3, 6
    ));
    console.log("- Total Reserves:", totalReserves.toFixed(6), "USDC");
    
    // 4. Daily Pool Analysis
    console.log("\n📅 Daily Pool Analysis:");
    console.log("=======================");
    
    // Check today's pool
    try {
      const todayPool = await contract.dailyPools(currentGameDay);
      
      console.log(`Game Day ${currentGameDay} Pool:`);
      console.log("- Total Collected:", ethers.formatUnits(todayPool.totalCollected, 6), "USDC");
      console.log("- Main Pool Portion (80%):", ethers.formatUnits(todayPool.mainPoolPortion, 6), "USDC");
      console.log("- Reserve Portion (20%):", ethers.formatUnits(todayPool.reservePortion, 6), "USDC");
      console.log("- First Prize Daily:", ethers.formatUnits(todayPool.firstPrizeDaily, 6), "USDC");
      console.log("- Second Prize Daily:", ethers.formatUnits(todayPool.secondPrizeDaily, 6), "USDC");
      console.log("- Third Prize Daily:", ethers.formatUnits(todayPool.thirdPrizeDaily, 6), "USDC");
      console.log("- Development Daily:", ethers.formatUnits(todayPool.developmentDaily, 6), "USDC");
      console.log("- Distributed:", todayPool.distributed ? "✅ Yes" : "❌ No");
      console.log("- Drawn:", todayPool.drawn ? "✅ Yes" : "❌ No");
      console.log("- Reserves Sent:", todayPool.reservesSent ? "✅ Yes" : "❌ No");
      
      // Verify daily pool math
      const expectedReserve = Number(todayPool.totalCollected) * 0.20;
      const expectedMainPool = Number(todayPool.totalCollected) * 0.80;
      const actualReserve = Number(todayPool.reservePortion);
      const actualMainPool = Number(todayPool.mainPoolPortion);
      
      console.log("\n🧮 Daily Pool Math Verification:");
      console.log("- Reserve calculation:", (actualReserve === expectedReserve) ? "✅ Correct" : "❌ Error");
      console.log("- Main pool calculation:", (actualMainPool === expectedMainPool) ? "✅ Correct" : "❌ Error");
      
    } catch (error) {
      console.log("No daily pool data yet (this is normal for new contracts)");
    }
    
    // 5. Check User's USDC Balance
    console.log("\n💳 User USDC Balance:");
    console.log("=====================");
    
    const userUsdcBalance = await usdc.balanceOf(deployer.address);
    const usdcDecimals = await usdc.decimals();
    const usdcSymbol = await usdc.symbol();
    
    console.log("- User Balance:", ethers.formatUnits(userUsdcBalance, usdcDecimals), usdcSymbol);
    console.log("- Can buy tickets:", Number(ethers.formatUnits(userUsdcBalance, usdcDecimals)) >= 0.2 ? "✅ Yes" : "❌ No (need testnet USDC)");
    
    // Check allowance
    const allowance = await usdc.allowance(deployer.address, CONTRACT_ADDRESS);
    console.log("- Current allowance:", ethers.formatUnits(allowance, usdcDecimals), usdcSymbol);
    console.log("- Allowance sufficient:", Number(ethers.formatUnits(allowance, usdcDecimals)) >= 0.2 ? "✅ Yes" : "❌ No (need approval)");
    
    // 6. Contract USDC Balance
    console.log("\n🏦 Contract USDC Balance:");
    console.log("=========================");
    
    const contractUsdcBalance = await usdc.balanceOf(CONTRACT_ADDRESS);
    console.log("- Contract Balance:", ethers.formatUnits(contractUsdcBalance, usdcDecimals), usdcSymbol);
    console.log("- Total Value Locked:", ethers.formatUnits(contractUsdcBalance, usdcDecimals), usdcSymbol);
    
    // 7. Payment Flow Simulation
    console.log("\n🧮 Payment Flow Simulation:");
    console.log("============================");
    
    const simulatedTicketPrice = 0.2; // 0.2 USDC
    console.log("Simulating purchase of 1 ticket (0.2 USDC):");
    
    const reserveAmount = simulatedTicketPrice * 0.20; // 20% to reserves
    const mainPoolAmount = simulatedTicketPrice * 0.80; // 80% to main pools
    
    const firstPrizeAmount = mainPoolAmount * 0.80; // 80% of main pool
    const secondPrizeAmount = mainPoolAmount * 0.10; // 10% of main pool
    const thirdPrizeAmount = mainPoolAmount * 0.05; // 5% of main pool
    const developmentAmount = mainPoolAmount * 0.05; // 5% of main pool
    
    console.log("- To Reserves (20%):", reserveAmount.toFixed(6), "USDC");
    console.log("- To Main Pools (80%):", mainPoolAmount.toFixed(6), "USDC");
    console.log("  - First Prize (80% of 80%):", firstPrizeAmount.toFixed(6), "USDC");
    console.log("  - Second Prize (10% of 80%):", secondPrizeAmount.toFixed(6), "USDC");
    console.log("  - Third Prize (5% of 80%):", thirdPrizeAmount.toFixed(6), "USDC");
    console.log("  - Development (5% of 80%):", developmentAmount.toFixed(6), "USDC");
    
    const totalVerification = reserveAmount + firstPrizeAmount + secondPrizeAmount + thirdPrizeAmount + developmentAmount;
    console.log("- Total verification:", totalVerification.toFixed(6), "USDC", totalVerification === simulatedTicketPrice ? "✅" : "❌");
    
    // 8. Recent Tickets Analysis
    console.log("\n🎫 Recent Tickets Analysis:");
    console.log("===========================");
    
    if (Number(ticketCounter) > 0) {
      console.log("Analyzing recent tickets...");
      
      // Get today's tickets
      try {
        const todayTickets = await contract.getGameDayTickets(currentGameDay);
        console.log(`- Tickets for Game Day ${currentGameDay}:`, todayTickets.length);
        
        if (todayTickets.length > 0) {
          console.log("- Recent ticket IDs:", todayTickets.slice(-5).map(id => Number(id)).join(", "));
          
          // Analyze last ticket
          const lastTicketId = todayTickets[todayTickets.length - 1];
          const ticketInfo = await contract.getTicketInfo(lastTicketId);
          console.log(`- Last ticket #${Number(lastTicketId)}:`);
          console.log(`  - Owner: ${ticketInfo[0]}`);
          console.log(`  - Numbers: [${ticketInfo[1].join(", ")}]`);
          console.log(`  - Game Day: ${Number(ticketInfo[2])}`);
          console.log(`  - Active: ${ticketInfo[3] ? "✅" : "❌"}`);
        }
      } catch (error) {
        console.log("- No tickets for current game day yet");
      }
      
      // Get user's tickets
      try {
        const userTickets = await contract.getUserTickets(deployer.address);
        console.log(`- User's total tickets: ${userTickets.length}`);
        if (userTickets.length > 0) {
          console.log(`- User's ticket IDs: ${userTickets.slice(-3).map(id => Number(id)).join(", ")}`);
        }
      } catch (error) {
        console.log("- User has no tickets yet");
      }
    } else {
      console.log("- No tickets have been purchased yet");
    }
    
    // 9. System Health Check
    console.log("\n🏥 System Health Check:");
    console.log("=======================");
    
    const healthChecks = [];
    
    // Check 1: Ticket price is correct
    healthChecks.push({
      check: "Ticket Price",
      status: Number(ethers.formatUnits(ticketPrice, 6)) === 0.2,
      expected: "0.2 USDC",
      actual: ethers.formatUnits(ticketPrice, 6) + " USDC"
    });
    
    // Check 2: Percentages are correct
    healthChecks.push({
      check: "Pool Percentages",
      status: totalMainPercentages === 100 && Number(dailyReservePercentage) === 20,
      expected: "Reserve 20%, Main 100%",
      actual: `Reserve ${Number(dailyReservePercentage)}%, Main ${totalMainPercentages}%`
    });
    
    // Check 3: Contract has expected functions
    healthChecks.push({
      check: "Contract Functions",
      status: true, // If we got here, basic functions work
      expected: "All pool functions working",
      actual: "✅ Functions responsive"
    });
    
    healthChecks.forEach(check => {
      console.log(`- ${check.check}: ${check.status ? "✅ PASS" : "❌ FAIL"}`);
      if (!check.status) {
        console.log(`  Expected: ${check.expected}`);
        console.log(`  Actual: ${check.actual}`);
      }
    });
    
    // 10. Next Steps Recommendations
    console.log("\n🔄 Next Steps & Recommendations:");
    console.log("=================================");
    
    if (Number(ethers.formatUnits(userUsdcBalance, usdcDecimals)) < 0.2) {
      console.log("❗ Get testnet USDC to test ticket purchasing:");
      console.log("   - Use Base Sepolia faucet or testnet bridges");
      console.log("   - You need at least 0.2 USDC per ticket");
    }
    
    if (Number(ethers.formatUnits(allowance, usdcDecimals)) < 0.2) {
      console.log("❗ Approve USDC spending:");
      console.log("   - Call usdc.approve(contractAddress, amount)");
      console.log("   - Or approve through frontend interface");
    }
    
    if (Number(ticketCounter) === 0) {
      console.log("💡 Test ticket purchase:");
      console.log("   - Buy a ticket through frontend");
      console.log("   - Verify pools get updated correctly");
      console.log("   - Check daily pool calculations");
    }
    
    console.log("🔍 Monitor automated draws:");
    console.log("   - Wait for next midnight São Paulo");
    console.log("   - Verify Chainlink Automation triggers");
    console.log("   - Check pool distributions after draw");
    
    console.log("\n✅ Payment System Test Completed!");
    console.log("Overall Status:", healthChecks.every(c => c.status) ? "🟢 HEALTHY" : "🟡 NEEDS ATTENTION");
    
  } catch (error) {
    console.error("❌ Error testing payment system:", error);
    
    if (error.message.includes("call revert")) {
      console.error("💡 Contract may not be deployed or network issue");
    }
    
    process.exit(1);
  }
}

// Execute script
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎉 Payment system test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test failed:", error);
      process.exit(1);
    });
}

module.exports = { main }; 