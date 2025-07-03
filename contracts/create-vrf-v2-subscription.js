const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Creando suscripción VRF V2 Legacy para Avalanche Fuji...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Wallet:", deployer.address);
  
  // Direcciones correctas para VRF V2 Legacy en Avalanche Fuji
  const LINK_TOKEN = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";
  const VRF_COORDINATOR_V2 = "0x2eD832Ba664535e5886b75D64C46EB9a228C2610"; // V2 Legacy
  const CONTRACT_ADDRESS = "0x19d6c7dc1301860C4E14c72E4338B62113059471";
  
  // ABI para VRF Coordinator V2 Legacy
  const VRF_V2_ABI = [
    "function createSubscription() external returns (uint64 subId)",
    "function addConsumer(uint64 subId, address consumer) external",
    "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
  ];
  
  // ABI para LINK token
  const LINK_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function transferAndCall(address to, uint256 amount, bytes calldata data) returns (bool)"
  ];
  
  try {
    const linkToken = new ethers.Contract(LINK_TOKEN, LINK_ABI, deployer);
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR_V2, VRF_V2_ABI, deployer);
    
    // Verificar balance de LINK
    const linkBalance = await linkToken.balanceOf(deployer.address);
    console.log("💰 Balance de LINK:", ethers.formatEther(linkBalance), "LINK");
    
    if (linkBalance < ethers.parseEther("2")) {
      console.log("❌ No tienes suficiente LINK");
      return;
    }
    
    // Crear nueva suscripción V2
    console.log("\n🆕 Creando nueva suscripción VRF V2...");
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
      // Intentar con un subId incremental (común en V2)
      newSubId = 1; // Empezar con 1
      console.log("🔍 Intentando con subId:", newSubId);
    }
    
    console.log("🆔 Nueva Subscription ID:", newSubId.toString());
    
    // Agregar el contrato como consumer
    console.log("\n👥 Agregando contrato como consumer...");
    const addConsumerTx = await vrfCoordinator.addConsumer(newSubId, CONTRACT_ADDRESS);
    console.log("📝 Transaction hash:", addConsumerTx.hash);
    await addConsumerTx.wait();
    console.log("✅ Consumer agregado exitosamente");
    
    // Fondear la suscripción
    console.log("\n💰 Fondeando suscripción con 3 LINK...");
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [newSubId]);
    
    const fundTx = await linkToken.transferAndCall(
      VRF_COORDINATOR_V2,
      ethers.parseEther("3"),
      encoded
    );
    console.log("📝 Transaction hash:", fundTx.hash);
    await fundTx.wait();
    console.log("✅ Suscripción fondeada exitosamente");
    
    // Verificar estado final
    console.log("\n📊 Verificando estado final...");
    try {
      const subInfo = await vrfCoordinator.getSubscription(newSubId);
      console.log("   Balance:", ethers.formatEther(subInfo[0]), "LINK");
      console.log("   Requests:", subInfo[1].toString());
      console.log("   Owner:", subInfo[2]);
      console.log("   Consumers:", subInfo[3].length);
    } catch (error) {
      console.log("⚠️  Error verificando suscripción:", error.message);
    }
    
    console.log("\n🎉 Configuración VRF V2 Legacy completada!");
    console.log("🔧 Información para actualizar el contrato:");
    console.log("   VRF Coordinator V2:", VRF_COORDINATOR_V2);
    console.log("   Subscription ID:", newSubId.toString());
    console.log("   Key Hash (300 gwei):", "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61");
    
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