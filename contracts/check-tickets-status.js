const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking tickets status...\n");
  
  const CONTRACT_ADDRESS = "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008";
  const USER_ADDRESS = "0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0";
  
  const CONTRACT_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)",
    "function tickets(uint256) view returns (uint40 purchaseTime, uint24 gameDay, bool claimed)"
  ];
  
  try {
    const [deployer] = await ethers.getSigners();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, deployer);
    
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    console.log("👤 User:", USER_ADDRESS);
    
    const [userBalance, totalSupply] = await Promise.all([
      contract.balanceOf(USER_ADDRESS),
      contract.totalSupply()
    ]);
    
    console.log("\n📊 Current Status:");
    console.log("🎫 User Tickets:", userBalance.toString());
    console.log("📊 Total Supply:", totalSupply.toString());
    
    if (userBalance > 0) {
      console.log("\n🎫 User Tickets Details:");
      for (let i = 0; i < Math.min(Number(userBalance), 10); i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(USER_ADDRESS, i);
          const ticketInfo = await contract.tickets(tokenId);
          
          console.log(`   Ticket ${tokenId}:`);
          console.log(`     Purchase: ${new Date(Number(ticketInfo[0]) * 1000).toLocaleString()}`);
          console.log(`     Game Day: ${ticketInfo[1]}`);
          console.log(`     Claimed: ${ticketInfo[2]}`);
        } catch (error) {
          console.log(`   Error loading ticket ${i}:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 