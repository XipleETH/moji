const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 Processing draw batch in LottoMoji V4 V2Plus...\n");
  
  const CONTRACT_ADDRESS = "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008";
  const GAME_DAY = 1; // El día del sorteo que se ejecutó
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Processing from:", deployer.address);
  console.log("📍 Contract V4:", CONTRACT_ADDRESS);
  console.log("🎮 Game Day:", GAME_DAY);
  
  // ABI para procesar el sorteo
  const CONTRACT_ABI = [
    "function processDrawBatch(uint24 day, uint256 batchSize) external",
    "function dayResults(uint24) view returns (uint32 processingIndex, uint32 winnersFirst, uint32 winnersSecond, uint32 winnersThird, bool fullyProcessed)",
    "function totalSupply() view returns (uint256)"
  ];
  
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, deployer);
    
    // Verificar estado actual
    console.log("🔍 Checking current status...");
    const [dayResult, totalSupply] = await Promise.all([
      contract.dayResults(GAME_DAY),
      contract.totalSupply()
    ]);
    
    console.log("📊 Current Status:");
    console.log("   🔄 Processing Index:", dayResult.processingIndex.toString());
    console.log("   🥇 Winners First Prize:", dayResult.winnersFirst.toString());
    console.log("   🥈 Winners Second Prize:", dayResult.winnersSecond.toString());
    console.log("   🥉 Winners Third Prize:", dayResult.winnersThird.toString());
    console.log("   ✅ Fully Processed:", dayResult.fullyProcessed);
    console.log("   🎫 Total Tickets Sold:", totalSupply.toString());
    
    if (dayResult.fullyProcessed) {
      console.log("\n🎉 Draw already fully processed!");
      console.log("   🏆 Total Winners:", (Number(dayResult.winnersFirst) + Number(dayResult.winnersSecond) + Number(dayResult.winnersThird)).toString());
      return;
    }
    
    // Procesar tickets en lotes
    console.log("\n🔄 Processing tickets in batches...");
    
    const BATCH_SIZE = 50; // Procesar 50 tickets por lote
    let currentIndex = Number(dayResult.processingIndex);
    let totalProcessed = 0;
    
    while (!dayResult.fullyProcessed && currentIndex < Number(totalSupply)) {
      const remainingTickets = Number(totalSupply) - currentIndex;
      const batchSize = Math.min(BATCH_SIZE, remainingTickets);
      
      console.log(`\n📦 Processing batch ${Math.floor(currentIndex / BATCH_SIZE) + 1}:`);
      console.log(`   📊 From index: ${currentIndex}`);
      console.log(`   📊 To index: ${currentIndex + batchSize - 1}`);
      console.log(`   📊 Batch size: ${batchSize}`);
      
      try {
        const tx = await contract.processDrawBatch(GAME_DAY, batchSize);
        console.log(`   📝 Transaction: ${tx.hash}`);
        
        console.log("   ⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
        
        // Verificar el nuevo estado
        const newDayResult = await contract.dayResults(GAME_DAY);
        currentIndex = Number(newDayResult.processingIndex);
        totalProcessed += batchSize;
        
        console.log("   📊 Updated Status:");
        console.log(`     🔄 Processing Index: ${newDayResult.processingIndex.toString()}`);
        console.log(`     🥇 Winners First Prize: ${newDayResult.winnersFirst.toString()}`);
        console.log(`     🥈 Winners Second Prize: ${newDayResult.winnersSecond.toString()}`);
        console.log(`     🥉 Winners Third Prize: ${newDayResult.winnersThird.toString()}`);
        console.log(`     ✅ Fully Processed: ${newDayResult.fullyProcessed}`);
        
        if (newDayResult.fullyProcessed) {
          console.log("\n🎉 All tickets processed successfully!");
          console.log("   🏆 Total Winners:", (Number(newDayResult.winnersFirst) + Number(newDayResult.winnersSecond) + Number(newDayResult.winnersThird)).toString());
          break;
        }
        
        // Pequeña pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`   ❌ Error processing batch:`, error.message);
        if (error.reason) {
          console.log(`   💬 Razón:`, error.reason);
        }
        break;
      }
    }
    
    // Verificar estado final
    console.log("\n📊 Final Status:");
    const finalDayResult = await contract.dayResults(GAME_DAY);
    console.log("   🔄 Final Processing Index:", finalDayResult.processingIndex.toString());
    console.log("   🥇 Final Winners First Prize:", finalDayResult.winnersFirst.toString());
    console.log("   🥈 Final Winners Second Prize:", finalDayResult.winnersSecond.toString());
    console.log("   🥉 Final Winners Third Prize:", finalDayResult.winnersThird.toString());
    console.log("   ✅ Fully Processed:", finalDayResult.fullyProcessed);
    
    if (finalDayResult.fullyProcessed) {
      console.log("\n🎉 Draw processing completed successfully!");
      console.log("   💡 Winners can now claim their prizes");
    } else {
      console.log("\n⏳ Draw processing not yet complete");
      console.log("   💡 Run this script again to continue processing");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.reason) {
      console.error("💬 Razón:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 