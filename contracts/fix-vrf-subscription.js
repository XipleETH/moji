const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Configurando suscripción VRF V2Plus...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Wallet:", deployer.address);
  
  // Direcciones para Avalanche Fuji
  const LINK_TOKEN = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";
  const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
  const CONTRACT_ADDRESS = "0x19d6c7dc1301860C4E14c72E4338B62113059471";
  
  // ABI para VRF Coordinator V2Plus
  const VRF_ABI = [
    "function createSubscription() external returns (uint256 subId)",
    "function addConsumer(uint256 subId, address consumer) external",
    "function fundSubscription(uint256 subId, uint256 amount) external",
    "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)"
  ];
  
  // ABI para LINK token
  const LINK_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function transferAndCall(address to, uint256 amount, bytes calldata data) returns (bool)"
  ];
  
  try {
    const linkToken = new ethers.Contract(LINK_TOKEN, LINK_ABI, deployer);
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, VRF_ABI, deployer);
    
    // Verificar balance de LINK
    const linkBalance = await linkToken.balanceOf(deployer.address);
    console.log("💰 Balance de LINK:", ethers.formatEther(linkBalance), "LINK");
    
    // Crear nueva suscripción
    console.log("\n🆕 Creando nueva suscripción VRF...");
    const createTx = await vrfCoordinator.createSubscription();
    console.log("📝 Transaction hash:", createTx.hash);
    
    const receipt = await createTx.wait();
    console.log("✅ Suscripción creada en bloque:", receipt.blockNumber);
    
    // Buscar el evento de creación para obtener el subId
    let newSubId;
    for (const log of receipt.logs) {
      try {
        const parsed = vrfCoordinator.interface.parseLog(log);
        if (parsed.name === "SubscriptionCreated") {
          newSubId = parsed.args.subId;
          break;
        }
      } catch (e) {
        // Log no reconocido, continuar
      }
    }
    
    if (!newSubId) {
      console.log("❌ No se pudo obtener el subId de los eventos");
      return;
    }
    
    console.log("🆔 Nueva Subscription ID:", newSubId.toString());
    
    // Agregar el contrato como consumer
    console.log("\n👥 Agregando contrato como consumer...");
    const addConsumerTx = await vrfCoordinator.addConsumer(newSubId, CONTRACT_ADDRESS);
    console.log("📝 Transaction hash:", addConsumerTx.hash);
    await addConsumerTx.wait();
    console.log("✅ Consumer agregado exitosamente");
    
    // Fondear la suscripción
    console.log("\n💰 Fondeando suscripción con 5 LINK...");
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [newSubId]);
    
    const fundTx = await linkToken.transferAndCall(
      VRF_COORDINATOR,
      ethers.parseEther("5"),
      encoded
    );
    console.log("📝 Transaction hash:", fundTx.hash);
    await fundTx.wait();
    console.log("✅ Suscripción fondeada exitosamente");
    
    // Verificar estado final
    console.log("\n📊 Verificando estado final...");
    const subInfo = await vrfCoordinator.getSubscription(newSubId);
    console.log("   Balance:", ethers.formatEther(subInfo[0]), "LINK");
    console.log("   Requests:", subInfo[2].toString());
    console.log("   Owner:", subInfo[3]);
    console.log("   Consumers:", subInfo[4].length);
    
    console.log("\n🎉 Configuración VRF completada!");
    console.log("🔧 Ahora necesitas actualizar el contrato con el nuevo subId:");
    console.log("   Nueva Subscription ID:", newSubId.toString());
    console.log("   Usa esta ID para actualizar el contrato o redesplegarlo");
    
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