const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verificando estado VRF del contrato V4...\n");
  
  const CONTRACT_ADDRESS = "0x19d6c7dc1301860C4E14c72E4338B62113059471";
  const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"; // Avalanche Fuji
  
  // ABI mínima para VRF Coordinator
  const VRF_COORDINATOR_ABI = [
    "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
  ];
  
  // Obtener el contrato
  const LottoMojiCore = await ethers.getContractFactory("LottoMojiCoreV4");
  const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
  
  // Obtener VRF Coordinator
  const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, VRF_COORDINATOR_ABI, ethers.provider);
  
  console.log("📍 Contrato V4:", CONTRACT_ADDRESS);
  console.log("📍 VRF Coordinator:", VRF_COORDINATOR);
  
  try {
    // Obtener información del contrato
    const vrfSubId = await contract.vrfSubId();
    const vrfKeyHash = await contract.vrfKeyHash();
    
    console.log("🔑 VRF Subscription ID:", vrfSubId.toString());
    console.log("🔑 VRF Key Hash:", vrfKeyHash);
    
    // Verificar la suscripción
    try {
      const [balance, reqCount, owner, consumers] = await vrfCoordinator.getSubscription(vrfSubId);
      
      console.log("\n📊 Estado de la suscripción VRF:");
      console.log("💰 Balance LINK:", ethers.formatEther(balance), "LINK");
      console.log("📈 Request count:", reqCount.toString());
      console.log("👤 Owner:", owner);
      console.log("🏭 Consumers:", consumers.length);
      
      if (consumers.length > 0) {
        console.log("   Consumers:");
        consumers.forEach((consumer, index) => {
          const isOurContract = consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
          console.log(`   ${index + 1}. ${consumer} ${isOurContract ? '✅ (Nuestro contrato)' : ''}`);
        });
      }
      
      // Verificar si nuestro contrato está en la lista
      const isConsumer = consumers.some(consumer => 
        consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
      );
      
      if (!isConsumer) {
        console.log("\n❌ El contrato NO está registrado como consumer");
        console.log("💡 Necesitas agregar el contrato a la suscripción VRF");
      } else {
        console.log("\n✅ El contrato está registrado como consumer");
      }
      
      if (balance === 0n) {
        console.log("\n❌ La suscripción no tiene balance LINK");
        console.log("💡 Necesitas agregar LINK a la suscripción");
      } else {
        console.log("\n✅ La suscripción tiene balance LINK suficiente");
      }
      
    } catch (error) {
      console.error("❌ Error obteniendo información de suscripción:", error.message);
      console.log("💡 La suscripción puede no existir o tener problemas");
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