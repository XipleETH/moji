const { ethers } = require("hardhat");

async function main() {
  console.log("🎲 Checking draw results in LottoMoji V4 V2Plus...\n");
  
  const CONTRACT_ADDRESS = "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008";
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Checking from:", deployer.address);
  console.log("📍 Contract V4:", CONTRACT_ADDRESS);
  
  // ABI para obtener resultados del sorteo
  const CONTRACT_ABI = [
    "function currentGameDay() view returns (uint24)",
    "function dayResults(uint24) view returns (uint32 processingIndex, uint32 winnersFirst, uint32 winnersSecond, uint32 winnersThird, bool fullyProcessed)",
    "function nextDrawTs() view returns (uint256)",
    "function automationActive() view returns (bool)",
    "function emergencyPause() view returns (bool)",
    "function totalSupply() view returns (uint256)"
  ];
  
  // ABI para el evento DrawNumbers
  const DRAW_NUMBERS_ABI = [
    "event DrawNumbers(uint24 indexed day, uint8[4] numbers)"
  ];
  
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, deployer);
    const contractWithEvents = new ethers.Contract(CONTRACT_ADDRESS, DRAW_NUMBERS_ABI, deployer);
    
    // Verificar estado actual
    console.log("🔍 Checking current status...");
    const [currentGameDay, nextDrawTs, automationActive, emergencyPause, totalSupply] = await Promise.all([
      contract.currentGameDay(),
      contract.nextDrawTs(),
      contract.automationActive(),
      contract.emergencyPause(),
      contract.totalSupply()
    ]);
    
    console.log("📊 Current Status:");
    console.log("   🎮 Current Game Day:", currentGameDay.toString());
    console.log("   ⏰ Next Draw Timestamp:", nextDrawTs.toString());
    console.log("   🤖 Automation Active:", automationActive);
    console.log("   🚨 Emergency Pause:", emergencyPause);
    console.log("   🎫 Total Tickets Sold:", totalSupply.toString());
    
    // Calcular timestamp del próximo sorteo
    const nextDrawDate = new Date(Number(nextDrawTs) * 1000);
    console.log("   📅 Next Draw Date:", nextDrawDate.toISOString());
    
    // Buscar eventos DrawNumbers para obtener los números ganadores
    console.log("\n🎯 Searching for DrawNumbers events...");
    
    // Buscar eventos en un rango más pequeño (últimos 2000 bloques)
    const provider = deployer.provider;
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 2000);
    const toBlock = "latest";
    
    console.log(`   📊 Searching from block ${fromBlock} to ${latestBlock}`);
    
    try {
      const drawEvents = await contractWithEvents.queryFilter(
        contractWithEvents.filters.DrawNumbers(),
        fromBlock,
        toBlock
      );
      
      console.log(`📊 Found ${drawEvents.length} DrawNumbers events`);
      
      if (drawEvents.length > 0) {
        // Obtener el evento más reciente
        const latestEvent = drawEvents[drawEvents.length - 1];
        const eventDay = latestEvent.args.day;
        const winningNumbers = latestEvent.args.numbers.map(n => Number(n));
        
        console.log("🎉 Latest Draw Results:");
        console.log("   🎮 Game Day:", eventDay.toString());
        console.log("   🎲 Winning Numbers:", winningNumbers);
        
        // Convertir números a emojis
        const emojiMap = [
          '🎮', '🎲', '🎯', '🎸', '🎨', // 0-4
          '💎', '💰', '💸', '🏆', '🎁', // 5-9
          '🚀', '🌙', '⭐', '✨', '🌟', // 10-14
          '🎭', '🎪', '🎢', '🎡', '🎠', // 15-19
          '🍀', '🌈', '⚡', '🔥', '💫'  // 20-24
        ];
        
        const winningEmojis = winningNumbers.map(num => emojiMap[num] || '❓');
        console.log("   🎨 Winning Emojis:", winningEmojis.join(' '));
        console.log("   📝 Block Number:", latestEvent.blockNumber);
        console.log("   🔗 Transaction Hash:", latestEvent.transactionHash);
        
        // Verificar el estado de procesamiento para este día
        try {
          const dayResult = await contract.dayResults(eventDay);
          console.log("\n📊 Processing Status:");
          console.log("   🔄 Processing Index:", dayResult.processingIndex.toString());
          console.log("   🥇 Winners First Prize:", dayResult.winnersFirst.toString());
          console.log("   🥈 Winners Second Prize:", dayResult.winnersSecond.toString());
          console.log("   🥉 Winners Third Prize:", dayResult.winnersThird.toString());
          console.log("   ✅ Fully Processed:", dayResult.fullyProcessed);
          
          if (dayResult.fullyProcessed) {
            console.log("\n🎉 Draw completed and fully processed!");
            console.log("   🏆 Total Winners:", (Number(dayResult.winnersFirst) + Number(dayResult.winnersSecond) + Number(dayResult.winnersThird)).toString());
          } else {
            console.log("\n⏳ Draw executed but processing in progress...");
          }
          
        } catch (resultError) {
          console.log("❌ Error fetching processing status:", resultError.message);
        }
        
      } else {
        console.log("⏳ No DrawNumbers events found in recent blocks - no draws executed yet.");
        console.log("💡 If a draw was executed earlier, we may need to search in a larger block range.");
      }
      
    } catch (eventError) {
      console.log("❌ Error searching for DrawNumbers events:", eventError.message);
    }
    
    // También verificar el estado del día anterior por si acaso
    const targetGameDay = currentGameDay > 0n ? currentGameDay - 1n : 0n;
    console.log("\n🔍 Also checking dayResults for Game Day:", targetGameDay.toString());
    
    try {
      const dayResult = await contract.dayResults(targetGameDay);
      console.log("📊 Day Results (without winning numbers):");
      console.log("   🔄 Processing Index:", dayResult.processingIndex.toString());
      console.log("   🥇 Winners First Prize:", dayResult.winnersFirst.toString());
      console.log("   🥈 Winners Second Prize:", dayResult.winnersSecond.toString());
      console.log("   🥉 Winners Third Prize:", dayResult.winnersThird.toString());
      console.log("   ✅ Fully Processed:", dayResult.fullyProcessed);
    } catch (resultError) {
      console.log("   ℹ️ No results for this day (expected if no draw executed).");
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