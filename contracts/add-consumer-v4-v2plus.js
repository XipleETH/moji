const { ethers } = require("hardhat");

async function main() {
  console.log("🔗 Adding LottoMojiCoreV4 (V2Plus) as VRF Consumer...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Wallet:", deployer.address);
  
  // Configuración VRF V2Plus para Avalanche Fuji
  const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
  const VRF_SUB_ID = "115219711696345395920320818068130094129726319678991844124002335643645462793035";
  const CONTRACT_ADDRESS = "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008"; // Nuevo contrato V4 (5 UTC)
  
  // ABI para VRF Coordinator V2Plus
  const VRF_ABI = [
    "function addConsumer(uint256 subId, address consumer) external",
    "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)"
  ];
  
  try {
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, VRF_ABI, deployer);
    
    console.log("📋 Configuration:");
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    console.log("- Subscription ID:", VRF_SUB_ID);
    console.log("- Contract Address:", CONTRACT_ADDRESS);
    console.log("- Wallet:", deployer.address);
    
    // Verificar estado actual de la suscripción
    console.log("\n🔍 Checking current subscription state...");
    try {
      const subInfo = await vrfCoordinator.getSubscription(VRF_SUB_ID);
      console.log("📊 Subscription Info:");
      console.log("   Balance LINK:", ethers.formatEther(subInfo[0]), "LINK");
      console.log("   Balance Native:", ethers.formatEther(subInfo[1]), "AVAX");
      console.log("   Request Count:", subInfo[2].toString());
      console.log("   Owner:", subInfo[3]);
      console.log("   Consumers:", subInfo[4].length);
      
      if (subInfo[4].length > 0) {
        console.log("   Current Consumers:");
        subInfo[4].forEach((consumer, index) => {
          const isOurContract = consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
          console.log(`     ${index + 1}. ${consumer} ${isOurContract ? '✅ (Nuestro contrato)' : ''}`);
        });
      }
      
      // Verificar si nuestro contrato ya está en la lista
      const isConsumer = subInfo[4].some(consumer => 
        consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
      );
      
      if (isConsumer) {
        console.log("\n✅ El contrato ya está registrado como consumer");
      } else {
        console.log("\n❌ El contrato NO está registrado como consumer");
        
        // Verificar si somos el owner
        if (subInfo[3].toLowerCase() === deployer.address.toLowerCase()) {
          console.log("✅ Eres el owner de la suscripción. Agregando consumer...");
          const tx = await vrfCoordinator.addConsumer(VRF_SUB_ID, CONTRACT_ADDRESS);
          console.log("📝 Transaction hash:", tx.hash);
          await tx.wait();
          console.log("✅ Consumer agregado exitosamente");
        } else {
          console.log("❌ No eres el owner de la suscripción");
          console.log("💡 El owner es:", subInfo[3]);
        }
      }
      
    } catch (error) {
      console.error("❌ Error checking subscription:", error.message);
    }
    
    console.log("\n🎉 VRF Consumer setup completed!");
    
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