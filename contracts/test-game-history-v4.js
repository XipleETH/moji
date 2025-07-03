const { ethers } = require("hardhat");

async function main() {
  console.log("📚 Testing Game History for LottoMoji V4 V2Plus...\n");
  
  const CONTRACT_ADDRESS = "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008";
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Testing from:", deployer.address);
  console.log("📍 Contract V4:", CONTRACT_ADDRESS);
  
  // ABI para obtener historial
  const CONTRACT_ABI = [
    "function currentGameDay() view returns (uint24)",
    "function dayResults(uint24) view returns (uint32 processingIndex, uint32 winnersFirst, uint32 winnersSecond, uint32 winnersThird, bool fullyProcessed)",
    "function nextDrawTs() view returns (uint256)",
    "function automationActive() view returns (bool)",
    "function emergencyPause() view returns (bool)",
    "function totalSupply() view returns (uint256)"
  ];
  
  // ABI para el evento DrawNumbers
  const DRAW_NUMBERS_EVENT_ABI = [
    "event DrawNumbers(uint24 indexed day, uint8[4] numbers)"
  ];
  
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, deployer);
    const contractWithEvents = new ethers.Contract(CONTRACT_ADDRESS, DRAW_NUMBERS_EVENT_ABI, deployer);
    
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
    
    // Buscar eventos DrawNumbers para obtener el historial
    console.log("\n🎯 Searching for DrawNumbers events...");
    
    const provider = deployer.provider;
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 2000); // Buscar en los últimos 2000 bloques
    
    console.log(`   📊 Searching from block ${fromBlock} to ${latestBlock}`);
    
    try {
      const drawEvents = await contractWithEvents.queryFilter(
        contractWithEvents.filters.DrawNumbers(),
        fromBlock,
        'latest'
      );
      
      console.log(`📊 Found ${drawEvents.length} DrawNumbers events`);
      
      if (drawEvents.length > 0) {
        // Procesar todos los eventos encontrados (ordenados por fecha)
        const sortedEvents = drawEvents.sort((a, b) => Number(a.args.day) - Number(b.args.day));
        
        console.log("\n📚 Game History:");
        
        for (const event of sortedEvents) {
          const eventDay = event.args.day;
          const winningNumbers = event.args.numbers.map((num) => Number(num));
          
          // Convertir números a emojis
          const emojiMap = [
            '🎮', '🎲', '🎯', '🎸', '🎨', // 0-4
            '💎', '💰', '💸', '🏆', '🎁', // 5-9
            '🚀', '🌙', '⭐', '✨', '🌟', // 10-14
            '🎭', '🎪', '🎢', '🎡', '🎠', // 15-19
            '🍀', '🌈', '⚡', '🔥', '💫'  // 20-24
          ];
          
          const winningEmojis = winningNumbers.map(num => emojiMap[num] || '❓');
          
          console.log(`\n📅 Game Day ${eventDay}:`);
          console.log(`   🎲 Winning Numbers: [${winningNumbers.join(', ')}]`);
          console.log(`   🎨 Winning Emojis: [${winningEmojis.join(', ')}]`);
          console.log(`   📝 Block Number: ${event.blockNumber}`);
          console.log(`   🔗 Transaction Hash: ${event.transactionHash}`);
          
          // Verificar el estado de procesamiento para este día
          try {
            const dayResult = await contract.dayResults(eventDay);
            console.log(`   ✅ Fully Processed: ${dayResult.fullyProcessed}`);
            console.log(`   🔄 Processing Index: ${dayResult.processingIndex.toString()}`);
            console.log(`   🥇 Winners First Prize: ${dayResult.winnersFirst.toString()}`);
            console.log(`   🥈 Winners Second Prize: ${dayResult.winnersSecond.toString()}`);
            console.log(`   🥉 Winners Third Prize: ${dayResult.winnersThird.toString()}`);
            
            const totalWinners = Number(dayResult.winnersFirst) + Number(dayResult.winnersSecond) + Number(dayResult.winnersThird);
            console.log(`   🏆 Total Winners: ${totalWinners}`);
            
            if (totalWinners > 0) {
              console.log(`   🎉 This draw had winners!`);
            } else {
              console.log(`   😔 No winners in this draw`);
            }
            
          } catch (resultError) {
            console.log(`   ❌ Error fetching processing status: ${resultError.message}`);
          }
          
          // Calcular tiempo estimado del sorteo
          const drawTime = Number(nextDrawTs) - (24 * 60 * 60 * (Number(currentGameDay) - Number(eventDay)));
          const drawDate = new Date(drawTime * 1000);
          console.log(`   ⏰ Estimated Draw Time: ${drawDate.toISOString()}`);
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   📅 Total Draws: ${drawEvents.length}`);
        console.log(`   🎮 Latest Game Day: ${sortedEvents[sortedEvents.length - 1].args.day.toString()}`);
        console.log(`   🎮 Earliest Game Day: ${sortedEvents[0].args.day.toString()}`);
        
      } else {
        console.log("⏳ No DrawNumbers events found - no draws executed yet.");
        console.log("💡 History will appear after the first draw is executed.");
      }
      
    } catch (eventError) {
      console.log("❌ Error searching for DrawNumbers events:", eventError.message);
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