const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verificando balance de LINK y estado de suscripción VRF...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Wallet:", deployer.address);
  
  // Direcciones para Avalanche Fuji
  const LINK_TOKEN = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";
  const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
  const VRF_SUB_ID = "115219711696345395920320818068130094129726319678991844124002335643645462793035";
  
  // ABI mínima para LINK token
  const LINK_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function transferAndCall(address to, uint256 amount, bytes calldata data) returns (bool)"
  ];
  
  // ABI mínima para VRF Coordinator
  const VRF_ABI = [
    "function addConsumer(uint256 subId, address consumer) external",
    "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
  ];
  
  try {
    // Verificar balance de LINK
    const linkToken = new ethers.Contract(LINK_TOKEN, LINK_ABI, deployer);
    const linkBalance = await linkToken.balanceOf(deployer.address);
    console.log("💰 Balance de LINK:", ethers.formatEther(linkBalance), "LINK");
    
    // Verificar VRF Coordinator
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, VRF_ABI, deployer);
    
    // Intentar obtener información de la suscripción
    try {
      const subInfo = await vrfCoordinator.getSubscription(VRF_SUB_ID);
      console.log("📊 Información de suscripción VRF:");
      console.log("   Balance:", ethers.formatEther(subInfo[0]), "LINK");
      console.log("   Requests:", subInfo[1].toString());
      console.log("   Owner:", subInfo[2]);
      console.log("   Consumers:", subInfo[3].length);
      
      const CONTRACT_ADDRESS = "0x19d6c7dc1301860C4E14c72E4338B62113059471";
      const isConsumer = subInfo[3].some(consumer => 
        consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
      );
      
      if (!isConsumer) {
        console.log("\n❌ El contrato NO está registrado como consumer");
        
        if (subInfo[2].toLowerCase() === deployer.address.toLowerCase()) {
          console.log("✅ Eres el owner de la suscripción. Agregando consumer...");
          const tx = await vrfCoordinator.addConsumer(VRF_SUB_ID, CONTRACT_ADDRESS);
          console.log("📝 Transaction hash:", tx.hash);
          await tx.wait();
          console.log("✅ Consumer agregado exitosamente");
        } else {
          console.log("❌ No eres el owner de la suscripción");
        }
      } else {
        console.log("✅ El contrato ya está registrado como consumer");
      }
      
      // Si no hay balance suficiente, agregar LINK
      if (subInfo[0] < ethers.parseEther("1")) {
        console.log("\n💰 Balance insuficiente en la suscripción");
        
        if (linkBalance >= ethers.parseEther("2")) {
          console.log("💸 Agregando 2 LINK a la suscripción...");
          
          // Encode the subscription ID for transferAndCall
          const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [VRF_SUB_ID]);
          
          const tx = await linkToken.transferAndCall(
            VRF_COORDINATOR,
            ethers.parseEther("2"),
            encoded
          );
          console.log("📝 Transaction hash:", tx.hash);
          await tx.wait();
          console.log("✅ LINK agregado exitosamente");
        } else {
          console.log("❌ No tienes suficiente LINK en tu wallet");
          console.log("💡 Necesitas obtener LINK desde el faucet: https://faucets.chain.link/fuji");
        }
      } else {
        console.log("✅ La suscripción tiene balance suficiente");
      }
      
    } catch (error) {
      console.error("❌ Error con la suscripción:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error general:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 