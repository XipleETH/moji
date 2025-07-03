const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Fondeando suscripción VRF existente...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Wallet:", deployer.address);
  
  // Direcciones para Avalanche Fuji
  const LINK_TOKEN = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";
  const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
  const VRF_SUB_ID = "115219711696345395920320818068130094129726319678991844124002335643645462793035";
  const CONTRACT_ADDRESS = "0x19d6c7dc1301860C4E14c72E4338B62113059471";
  
  // ABI para LINK token
  const LINK_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function transferAndCall(address to, uint256 amount, bytes calldata data) returns (bool)"
  ];
  
  // ABI para VRF Coordinator
  const VRF_ABI = [
    "function addConsumer(uint256 subId, address consumer) external"
  ];
  
  try {
    const linkToken = new ethers.Contract(LINK_TOKEN, LINK_ABI, deployer);
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, VRF_ABI, deployer);
    
    // Verificar balance de LINK
    const linkBalance = await linkToken.balanceOf(deployer.address);
    console.log("💰 Balance de LINK:", ethers.formatEther(linkBalance), "LINK");
    
    if (linkBalance < ethers.parseEther("2")) {
      console.log("❌ No tienes suficiente LINK");
      return;
    }
    
    // Intentar agregar el contrato como consumer primero
    console.log("\n👥 Agregando contrato como consumer...");
    try {
      const addConsumerTx = await vrfCoordinator.addConsumer(VRF_SUB_ID, CONTRACT_ADDRESS);
      console.log("📝 Transaction hash:", addConsumerTx.hash);
      await addConsumerTx.wait();
      console.log("✅ Consumer agregado exitosamente");
    } catch (error) {
      console.log("⚠️  Error agregando consumer (puede que ya esté agregado):", error.message);
    }
    
    // Fondear la suscripción
    console.log("\n💰 Fondeando suscripción con 5 LINK...");
    
    // Encode the subscription ID for transferAndCall
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [VRF_SUB_ID]);
    
    const fundTx = await linkToken.transferAndCall(
      VRF_COORDINATOR,
      ethers.parseEther("5"),
      encoded
    );
    console.log("📝 Transaction hash:", fundTx.hash);
    await fundTx.wait();
    console.log("✅ Suscripción fondeada exitosamente");
    
    console.log("\n🎉 Configuración completada!");
    console.log("🔄 Ahora intenta ejecutar el sorteo nuevamente");
    
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