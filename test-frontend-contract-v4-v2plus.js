const { ethers } = require('ethers');

async function main() {
  console.log("🧪 Testing Frontend Connection to V4 V2Plus Contract...\n");
  
  // Configuración para Avalanche Fuji
  const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
  const CONTRACT_ADDRESS = "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008";
  const USER_ADDRESS = "0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0";
  
  // ABI mínima para pruebas del frontend
  const CONTRACT_ABI = [
    "function ticketPrice() view returns (uint256)",
    "function nextDrawTs() view returns (uint256)",
    "function currentGameDay() view returns (uint24)",
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)",
    "function tickets(uint256) view returns (uint40 purchaseTime, uint24 gameDay, bool claimed)"
  ];
  
  const USDC_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)"
  ];
  
  try {
    // Crear provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log("📍 Contract Address:", CONTRACT_ADDRESS);
    console.log("👤 User Address:", USER_ADDRESS);
    console.log("🌐 Network: Avalanche Fuji");
    
    // Conectar al contrato
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const usdcContract = new ethers.Contract("0x5425890298aed601595a70AB815c96711a31Bc65", USDC_ABI, provider);
    
    // Probar funciones básicas
    console.log("\n📊 Contract State:");
    const [ticketPrice, nextDrawTs, currentGameDay, totalSupply] = await Promise.all([
      contract.ticketPrice(),
      contract.nextDrawTs(),
      contract.currentGameDay(),
      contract.totalSupply()
    ]);
    
    console.log("💰 Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
    console.log("⏰ Next Draw:", new Date(Number(nextDrawTs) * 1000).toLocaleString());
    console.log("📅 Current Game Day:", currentGameDay.toString());
    console.log("🎫 Total Supply:", totalSupply.toString());
    
    // Probar funciones de usuario
    console.log("\n👤 User Data:");
    const [userBalance, usdcBalance, usdcAllowance] = await Promise.all([
      contract.balanceOf(USER_ADDRESS),
      usdcContract.balanceOf(USER_ADDRESS),
      usdcContract.allowance(USER_ADDRESS, CONTRACT_ADDRESS)
    ]);
    
    console.log("🎫 User Tickets:", userBalance.toString());
    console.log("💰 USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("✅ USDC Allowance:", ethers.formatUnits(usdcAllowance, 6), "USDC");
    
    // Probar ERC721Enumerable si hay tickets
    if (userBalance > 0) {
      console.log("\n🎫 User Tickets Details:");
      for (let i = 0; i < Math.min(Number(userBalance), 5); i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(USER_ADDRESS, i);
          const ticketInfo = await contract.tickets(tokenId);
          
          console.log(`   Ticket ${tokenId}:`);
          console.log(`     Purchase Time: ${new Date(Number(ticketInfo[0]) * 1000).toLocaleString()}`);
          console.log(`     Game Day: ${ticketInfo[1]}`);
          console.log(`     Claimed: ${ticketInfo[2]}`);
        } catch (error) {
          console.log(`   Error loading ticket ${i}:`, error.message);
        }
      }
    }
    
    // Verificar VRF V2Plus
    console.log("\n🔗 VRF V2Plus Status:");
    const vrfSubId = await contract.vrfSubId();
    const vrfKeyHash = await contract.vrfKeyHash();
    console.log("🔑 VRF Subscription ID:", vrfSubId.toString());
    console.log("🔑 VRF Key Hash:", vrfKeyHash);
    
    console.log("\n✅ Frontend connection test completed successfully!");
    console.log("🎯 The new V4 V2Plus contract is ready for frontend use");
    
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