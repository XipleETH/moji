const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Fixing LottoMojiCore Contract Timing...");
  console.log("========================================");
  
  // Configuration - V2 CONTRACT ADDRESS FROM DEPLOYMENT
  const CONTRACT_ADDRESS = "0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5"; // V3 contract address
  
  // Contract address is already set to V2 deployment
  
  console.log("📋 Configuration:");
  console.log("- Contract Address:", CONTRACT_ADDRESS);
  console.log("- Target: Set draws to exactly midnight São Paulo (03:00 UTC)");
  
  // Get deployer account (must be contract owner)
  const [deployer] = await ethers.getSigners();
  console.log("👤 Using account:", deployer.address);
  
  try {
    // Connect to the contract
    console.log("\n🔗 Connecting to contract...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    // Check current state
    console.log("\n📊 Current Contract State:");
    const currentGameDay = await contract.getCurrentDay();
    const lastDrawTime = await contract.lastDrawTime();
    const drawTimeUTC = await contract.drawTimeUTC();
    const drawInterval = await contract.DRAW_INTERVAL();
    
    const currentNextDraw = Number(lastDrawTime) + Number(drawInterval);
    const now = Math.floor(Date.now() / 1000);
    
    console.log("- Current Game Day:", Number(currentGameDay));
    console.log("- Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
    console.log("- Current Next Draw:", new Date(currentNextDraw * 1000).toISOString());
    console.log("- Draw Time UTC:", Number(drawTimeUTC) / 3600, "hours");
    console.log("- Draw Interval:", Number(drawInterval) / 3600, "hours");
    
    // Check current São Paulo time
    const currentNextDrawSP = new Date(currentNextDraw * 1000).toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour12: false 
    });
    const currentTimeOnly = new Date(currentNextDraw * 1000).toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    console.log("- Current Next Draw (SP):", currentNextDrawSP);
    console.log("- Is Midnight SP?:", currentTimeOnly === '00:00' ? "✅ YES" : `❌ NO (${currentTimeOnly})`);
    
    if (currentTimeOnly === '00:00') {
      console.log("\n✅ Contract timing is already correct! No fix needed.");
      return;
    }
    
    // Calculate correct lastDrawTime for midnight São Paulo
    console.log("\n🧮 Calculating correct timing...");
    
    const currentUTC = new Date(now * 1000);
    const nextMidnightUTC = new Date(currentUTC);
    
    // If it's past 03:00 UTC today, next midnight is tomorrow
    if (currentUTC.getUTCHours() >= 3) {
      nextMidnightUTC.setUTCDate(nextMidnightUTC.getUTCDate() + 1);
    }
    
    nextMidnightUTC.setUTCHours(3, 0, 0, 0); // 03:00 UTC = 00:00 São Paulo
    const correctNextDraw = Math.floor(nextMidnightUTC.getTime() / 1000);
    const correctLastDraw = correctNextDraw - Number(drawInterval);
    
    console.log("- Correct Last Draw Time:", new Date(correctLastDraw * 1000).toISOString());
    console.log("- Correct Next Draw Time:", new Date(correctNextDraw * 1000).toISOString());
    console.log("- Correct Next Draw (SP):", new Date(correctNextDraw * 1000).toLocaleString('es-BR', { timeZone: 'America/Sao_Paulo', hour12: false }));
    
    // Verify this is exactly midnight
    const verifyTimeOnly = new Date(correctNextDraw * 1000).toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    console.log("- Verification: Is Midnight SP?:", verifyTimeOnly === '00:00' ? "✅ YES" : "❌ NO");
    
    if (verifyTimeOnly !== '00:00') {
      console.error("❌ Calculation error: Result is not midnight São Paulo");
      process.exit(1);
    }
    
    // Calculate the difference
    const timeDiff = currentNextDraw - correctNextDraw;
    const diffMinutes = Math.floor(Math.abs(timeDiff) / 60);
    const diffSeconds = Math.abs(timeDiff) % 60;
    
    console.log("\n📊 Correction Details:");
    console.log("- Time difference:", diffMinutes + "m", diffSeconds + "s");
    console.log("- Correction direction:", timeDiff > 0 ? "Moving earlier" : "Moving later");
    
    // Apply the fix
    console.log("\n⚡ Applying timing fix...");
    console.log("Calling contract.setLastDrawTime(" + correctLastDraw + ")");
    
    const tx = await contract.setLastDrawTime(correctLastDraw, {
      gasLimit: 100000
    });
    
    console.log("📝 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
    // Verify the fix
    console.log("\n🔍 Verifying fix...");
    const newLastDrawTime = await contract.lastDrawTime();
    const newCurrentGameDay = await contract.getCurrentDay();
    const newNextDraw = Number(newLastDrawTime) + Number(drawInterval);
    
    console.log("📊 Updated Contract State:");
    console.log("- New Last Draw Time:", new Date(Number(newLastDrawTime) * 1000).toISOString());
    console.log("- New Next Draw Time:", new Date(newNextDraw * 1000).toISOString());
    console.log("- New Game Day:", Number(newCurrentGameDay));
    
    const newNextDrawSP = new Date(newNextDraw * 1000).toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour12: false 
    });
    const newTimeOnly = new Date(newNextDraw * 1000).toLocaleString('es-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    console.log("- New Next Draw (SP):", newNextDrawSP);
    console.log("- Is Midnight SP?:", newTimeOnly === '00:00' ? "✅ YES - FIXED!" : `❌ Still wrong (${newTimeOnly})`);
    
    if (newTimeOnly === '00:00') {
      console.log("\n🎉 Contract timing successfully fixed!");
      console.log("✅ All future draws will happen at exactly midnight São Paulo");
      
      console.log("\n🔄 Next Steps:");
      console.log("1. Update frontend to remove temporary correction in useContractTimer.ts");
      console.log("2. Test that frontend now shows correct countdown");
      console.log("3. Verify with window.verifyContractLogic() function");
    } else {
      console.log("\n❌ Fix failed - timing is still incorrect");
      console.log("💡 You may need to run this script again or check for errors");
    }
    
  } catch (error) {
    console.error("❌ Error fixing contract timing:", error);
    
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    
    if (error.message.includes("onlyOwner")) {
      console.error("💡 Make sure you're using the contract owner account");
    }
    
    process.exit(1);
  }
}

// Execute script
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎉 Timing fix script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

module.exports = { main }; 