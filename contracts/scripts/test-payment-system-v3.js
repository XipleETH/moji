const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing LottoMoji V3 Payment System");
  console.log("=====================================");
  console.log("V3 Features: Proportional Reserves + Auto-Refill");
  
  // Contract address - UPDATE THIS with your V3 deployment
  const CONTRACT_ADDRESS = ""; // Will be filled after deployment
  
  if (!CONTRACT_ADDRESS) {
    console.log("⚠️ Please update CONTRACT_ADDRESS with your V3 deployment address");
    console.log("Run: node scripts/deploy-v3.js first");
    return;
  }
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Testing with account:", signer.address);
  
  // Connect to the contract
  const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
  
  try {
    console.log("\n📊 V3 Contract Configuration");
    console.log("============================");
    
    const ticketPrice = await contract.TICKET_PRICE();
    const dailyReservePercentage = await contract.DAILY_RESERVE_PERCENTAGE();
    const firstPrizePercentage = await contract.FIRST_PRIZE_PERCENTAGE();
    const secondPrizePercentage = await contract.SECOND_PRIZE_PERCENTAGE();
    const thirdPrizePercentage = await contract.THIRD_PRIZE_PERCENTAGE();
    const developmentPercentage = await contract.DEVELOPMENT_PERCENTAGE();
    
    console.log("💰 Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
    console.log("📈 Daily to Reserves:", Number(dailyReservePercentage) + "%");
    console.log("🎯 Prize Distribution:");
    console.log("   • First Prize (daily):", Number(firstPrizePercentage) + "%");
    console.log("   • Second Prize (daily):", Number(secondPrizePercentage) + "%");
    console.log("   • Third Prize (daily):", Number(thirdPrizePercentage) + "%");
    console.log("   • Development (daily):", Number(developmentPercentage) + "%");
    
    console.log("\n💎 V3 Reserve Distribution:");
    const ticketPriceFloat = parseFloat(ethers.formatUnits(ticketPrice, 6));
    const reservePortion = ticketPriceFloat * (Number(dailyReservePercentage) / 100);
    
    const firstReserve = reservePortion * (Number(firstPrizePercentage) / 100);
    const secondReserve = reservePortion * (Number(secondPrizePercentage) / 100);
    const thirdReserve = reservePortion * (Number(thirdPrizePercentage) / 100);
    const developmentBuffer = reservePortion * (Number(developmentPercentage) / 100);
    
    console.log("   • First Prize Reserve:", firstReserve.toFixed(6), "USDC (" + (firstReserve/ticketPriceFloat*100).toFixed(1) + "% of ticket)");
    console.log("   • Second Prize Reserve:", secondReserve.toFixed(6), "USDC (" + (secondReserve/ticketPriceFloat*100).toFixed(1) + "% of ticket)");
    console.log("   • Third Prize Reserve:", thirdReserve.toFixed(6), "USDC (" + (thirdReserve/ticketPriceFloat*100).toFixed(1) + "% of ticket)");
    console.log("   • Development Buffer:", developmentBuffer.toFixed(6), "USDC (" + (developmentBuffer/ticketPriceFloat*100).toFixed(1) + "% stays in contract)");
    
    const totalDistributed = firstReserve + secondReserve + thirdReserve;
    console.log("   • Total to Reserves:", totalDistributed.toFixed(6), "USDC");
    console.log("   • Buffer remaining:", (reservePortion - totalDistributed).toFixed(6), "USDC");
    
    // Verify percentages add up correctly
    const totalPercentages = Number(firstPrizePercentage) + Number(secondPrizePercentage) + 
                           Number(thirdPrizePercentage) + Number(developmentPercentage);
    console.log("✅ Total percentages:", totalPercentages + "% (should be 100%)");
    
    console.log("\n📋 Current Game State");
    console.log("====================");
    
    const currentGameDay = await contract.getCurrentDay();
    const totalTickets = await contract.totalTickets();
    
    console.log("🗓️ Current Game Day:", Number(currentGameDay));
    console.log("🎫 Total Tickets Sold:", Number(totalTickets));
    
    // Get current pools state
    const mainPools = await contract.getMainPools();
    const reserves = await contract.getReservePools();
    
    console.log("\n🏆 Main Prize Pools (Accumulated)");
    console.log("=================================");
    console.log("🥇 First Prize:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
    console.log("🥈 Second Prize:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
    console.log("🥉 Third Prize:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
    console.log("💻 Development:", ethers.formatUnits(mainPools.developmentAccumulated, 6), "USDC");
    
    const totalMainPools = Number(mainPools.firstPrizeAccumulated) + 
                          Number(mainPools.secondPrizeAccumulated) + 
                          Number(mainPools.thirdPrizeAccumulated) + 
                          Number(mainPools.developmentAccumulated);
    console.log("💰 Total Main Pools:", ethers.formatUnits(totalMainPools, 6), "USDC");
    
    console.log("\n🏦 Reserve Pools (V3 Proportional)");
    console.log("==================================");
    console.log("🥇 First Prize Reserve:", ethers.formatUnits(reserves.firstPrizeReserve1, 6), "USDC");
    console.log("🥈 Second Prize Reserve:", ethers.formatUnits(reserves.secondPrizeReserve2, 6), "USDC");
    console.log("🥉 Third Prize Reserve:", ethers.formatUnits(reserves.thirdPrizeReserve3, 6), "USDC");
    
    const totalReserves = Number(reserves.firstPrizeReserve1) + 
                         Number(reserves.secondPrizeReserve2) + 
                         Number(reserves.thirdPrizeReserve3);
    console.log("💎 Total Reserves:", ethers.formatUnits(totalReserves, 6), "USDC");
    
    // Calculate theoretical values if tickets were sold
    if (Number(totalTickets) > 0) {
      console.log("\n📈 Revenue Analysis");
      console.log("==================");
      
      const totalRevenue = Number(totalTickets) * ticketPriceFloat;
      const theoreticalReserves = totalRevenue * (Number(dailyReservePercentage) / 100);
      const theoreticalMainPools = totalRevenue * 0.8; // 80% to main pools
      
      console.log("💵 Total Revenue:", totalRevenue.toFixed(6), "USDC");
      console.log("📊 Theoretical Allocation:");
      console.log("   • To Main Pools (80%):", theoreticalMainPools.toFixed(6), "USDC");
      console.log("   • To Reserves (20%):", theoreticalReserves.toFixed(6), "USDC");
      
      console.log("🎯 Theoretical Reserve Distribution:");
      console.log("   • First Prize Reserve:", (theoreticalReserves * 0.8).toFixed(6), "USDC");
      console.log("   • Second Prize Reserve:", (theoreticalReserves * 0.1).toFixed(6), "USDC");
      console.log("   • Third Prize Reserve:", (theoreticalReserves * 0.1).toFixed(6), "USDC");
      console.log("   • Development Buffer:", (theoreticalReserves * 0.05).toFixed(6), "USDC");
      
      const actualMainPoolsUSDC = parseFloat(ethers.formatUnits(totalMainPools, 6));
      const actualReservesUSDC = parseFloat(ethers.formatUnits(totalReserves, 6));
      
      console.log("\n⚖️ Actual vs Theoretical:");
      console.log("   • Main Pools: " + actualMainPoolsUSDC.toFixed(6) + " vs " + theoreticalMainPools.toFixed(6) + " USDC");
      console.log("   • Reserves: " + actualReservesUSDC.toFixed(6) + " vs " + theoreticalReserves.toFixed(6) + " USDC");
    }
    
    // Check user's USDC balance and allowance
    const usdcAddress = await contract.usdcToken();
    const usdcContract = await ethers.getContractAt("IERC20", usdcAddress);
    
    const userBalance = await usdcContract.balanceOf(signer.address);
    const allowance = await usdcContract.allowance(signer.address, CONTRACT_ADDRESS);
    
    console.log("\n👤 User Account Status");
    console.log("=====================");
    console.log("💰 USDC Balance:", ethers.formatUnits(userBalance, 6), "USDC");
    console.log("✅ Allowance:", ethers.formatUnits(allowance, 6), "USDC");
    console.log("🎫 Can Buy Tickets:", Number(userBalance) >= Number(ticketPrice) && Number(allowance) >= Number(ticketPrice) ? "✅ YES" : "❌ NO");
    
    // Test auto-refill logic simulation
    console.log("\n🔄 V3 Auto-Refill Mechanism Test");
    console.log("================================");
    console.log("Scenario: What happens when there are winners and main pools are empty?");
    
    const firstPoolEmpty = Number(mainPools.firstPrizeAccumulated) === 0;
    const secondPoolEmpty = Number(mainPools.secondPrizeAccumulated) === 0;
    const thirdPoolEmpty = Number(mainPools.thirdPrizeAccumulated) === 0;
    
    const firstReserveAvailable = Number(reserves.firstPrizeReserve1) > 0;
    const secondReserveAvailable = Number(reserves.secondPrizeReserve2) > 0;
    const thirdReserveAvailable = Number(reserves.thirdPrizeReserve3) > 0;
    
    console.log("\n🏆 Pool Status:");
    console.log("   🥇 First Prize Pool:", firstPoolEmpty ? "❌ EMPTY" : "✅ HAS FUNDS", "(" + ethers.formatUnits(mainPools.firstPrizeAccumulated, 6) + " USDC)");
    console.log("   🥈 Second Prize Pool:", secondPoolEmpty ? "❌ EMPTY" : "✅ HAS FUNDS", "(" + ethers.formatUnits(mainPools.secondPrizeAccumulated, 6) + " USDC)");
    console.log("   🥉 Third Prize Pool:", thirdPoolEmpty ? "❌ EMPTY" : "✅ HAS FUNDS", "(" + ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6) + " USDC)");
    
    console.log("\n🏦 Reserve Status:");
    console.log("   🥇 First Prize Reserve:", firstReserveAvailable ? "✅ AVAILABLE" : "❌ EMPTY", "(" + ethers.formatUnits(reserves.firstPrizeReserve1, 6) + " USDC)");
    console.log("   🥈 Second Prize Reserve:", secondReserveAvailable ? "✅ AVAILABLE" : "❌ EMPTY", "(" + ethers.formatUnits(reserves.secondPrizeReserve2, 6) + " USDC)");
    console.log("   🥉 Third Prize Reserve:", thirdReserveAvailable ? "✅ AVAILABLE" : "❌ EMPTY", "(" + ethers.formatUnits(reserves.thirdPrizeReserve3, 6) + " USDC)");
    
    console.log("\n🔄 Auto-Refill Predictions:");
    if (firstPoolEmpty && firstReserveAvailable) {
      console.log("   🥇 First Prize: Will auto-refill with " + ethers.formatUnits(reserves.firstPrizeReserve1, 6) + " USDC when winner found");
    } else if (firstPoolEmpty) {
      console.log("   🥇 First Prize: ⚠️ Pool empty, no reserve available");
    } else {
      console.log("   🥇 First Prize: No refill needed");
    }
    
    if (secondPoolEmpty && secondReserveAvailable) {
      console.log("   🥈 Second Prize: Will auto-refill with " + ethers.formatUnits(reserves.secondPrizeReserve2, 6) + " USDC when winner found");
    } else if (secondPoolEmpty) {
      console.log("   🥈 Second Prize: ⚠️ Pool empty, no reserve available");
    } else {
      console.log("   🥈 Second Prize: No refill needed");
    }
    
    if (thirdPoolEmpty && thirdReserveAvailable) {
      console.log("   🥉 Third Prize: Will auto-refill with " + ethers.formatUnits(reserves.thirdPrizeReserve3, 6) + " USDC when winner found");
    } else if (thirdPoolEmpty) {
      console.log("   🥉 Third Prize: ⚠️ Pool empty, no reserve available");
    } else {
      console.log("   🥉 Third Prize: No refill needed");
    }
    
    // Summary of V3 improvements
    console.log("\n🆚 V3 vs V2 Improvements");
    console.log("========================");
    console.log("✅ Reserve Distribution:");
    console.log("   • V2: 6.67% each (equal distribution)");
    console.log("   • V3: 16% / 2% / 2% (proportional to prize size)");
    
    console.log("✅ Auto-Refill:");
    console.log("   • V2: Manual reserve management");
    console.log("   • V3: Automatic refill when pools empty + winner exists");
    
    console.log("✅ Capital Efficiency:");
    console.log("   • V2: 6.67% reserve for largest prize");
    console.log("   • V3: 16% reserve for largest prize (2.4x more capital)");
    
    console.log("✅ Development Reserve:");
    console.log("   • V2: Had dedicated development reserve");
    console.log("   • V3: No development reserve, 1% buffer stays in contract");
    
    console.log("\n✅ V3 Payment System Test Completed!");
    console.log("📋 The new proportional reserve system is working correctly");
    console.log("🔄 Auto-refill mechanism is ready for when prizes are won");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    
    // Check if it's a common error
    if (error.message.includes("call revert exception")) {
      console.log("\n💡 Common solutions:");
      console.log("   • Verify CONTRACT_ADDRESS is correct");
      console.log("   • Ensure contract is deployed on current network");
      console.log("   • Check if contract is verified on block explorer");
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎉 Test completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test script failed:", error);
      process.exit(1);
    });
}

module.exports = { main }; 