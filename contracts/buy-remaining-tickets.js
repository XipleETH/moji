const { ethers } = require("hardhat");

async function main() {
  console.log("🎫 Buying remaining tickets in LottoMoji V4 V2Plus...\n");
  
  const CONTRACT_ADDRESS = "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008";
  const TICKETS_TO_BUY = 6; // Comprar los 6 restantes para llegar a 10
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Buying from:", deployer.address);
  console.log("📍 Contract V4:", CONTRACT_ADDRESS);
  console.log("🎫 Tickets to buy:", TICKETS_TO_BUY);
  
  // ABI para el contrato
  const CONTRACT_ABI = [
    "function buyTicket(uint8[4] calldata emojiNumbers) external",
    "function ticketPrice() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)"
  ];
  
  // ABI para USDC
  const USDC_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)"
  ];
  
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, deployer);
    const usdcContract = new ethers.Contract("0x5425890298aed601595a70AB815c96711a31Bc65", USDC_ABI, deployer);
    
    // Verificar estado actual
    console.log("\n🔍 Checking current status...");
    const [ticketPrice, userBalance, usdcBalance, usdcAllowance, totalSupply] = await Promise.all([
      contract.ticketPrice(),
      contract.balanceOf(deployer.address),
      usdcContract.balanceOf(deployer.address),
      usdcContract.allowance(deployer.address, CONTRACT_ADDRESS),
      contract.totalSupply()
    ]);
    
    console.log("💰 Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
    console.log("🎫 Current User Tickets:", userBalance.toString());
    console.log("💰 USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("✅ USDC Allowance:", ethers.formatUnits(usdcAllowance, 6), "USDC");
    console.log("📊 Total Supply:", totalSupply.toString());
    
    const totalCost = ticketPrice * BigInt(TICKETS_TO_BUY);
    console.log("💸 Total Cost for 6 tickets:", ethers.formatUnits(totalCost, 6), "USDC");
    
    if (usdcBalance < totalCost) {
      console.log("❌ Insufficient USDC balance!");
      return;
    }
    
    if (usdcAllowance < totalCost) {
      console.log("❌ Insufficient USDC allowance!");
      console.log("💡 Run the approval script first");
      return;
    }
    
    // Comprar tickets
    console.log("\n🎫 Buying remaining tickets...");
    
    // Emojis aleatorios para cada ticket (0-24)
    const emojiMap = [
      '🎮', '🎲', '🎯', '🎸', '🎨', // 0-4
      '💎', '💰', '💸', '🏆', '🎁', // 5-9
      '🚀', '🌙', '⭐', '✨', '🌟', // 10-14
      '🎭', '🎪', '🎢', '🎡', '🎠', // 15-19
      '🍀', '🌈', '⚡', '🔥', '💫'  // 20-24
    ];
    
    for (let i = 0; i < TICKETS_TO_BUY; i++) {
      // Generar números aleatorios para este ticket
      const numbers = [];
      for (let j = 0; j < 4; j++) {
        numbers.push(Math.floor(Math.random() * 25)); // 0-24
      }
      
      console.log(`\n🎫 Buying ticket ${i + 1}/${TICKETS_TO_BUY}:`);
      console.log(`   Numbers: [${numbers.join(', ')}]`);
      console.log(`   Emojis: [${numbers.map(n => emojiMap[n]).join(', ')}]`);
      
      try {
        const tx = await contract.buyTicket(numbers);
        console.log(`   📝 Transaction: ${tx.hash}`);
        
        console.log("   ⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
        
        // Pequeña pausa entre transacciones
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`   ❌ Error buying ticket ${i + 1}:`, error.message);
        if (error.reason) {
          console.log(`   💬 Razón:`, error.reason);
        }
        break;
      }
    }
    
    // Verificar estado final
    console.log("\n📊 Final Status:");
    const [finalUserBalance, finalTotalSupply] = await Promise.all([
      contract.balanceOf(deployer.address),
      contract.totalSupply()
    ]);
    
    console.log("🎫 Final User Tickets:", finalUserBalance.toString());
    console.log("📊 Final Total Supply:", finalTotalSupply.toString());
    
    console.log("\n🎉 Remaining tickets purchase completed!");
    console.log("💡 Check your tickets in the frontend");
    
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