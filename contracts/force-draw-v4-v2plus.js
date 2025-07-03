const { ethers } = require("hardhat");

async function main() {
  console.log("🎲 Forzando sorteo en contrato V4 (VRF V2Plus)...\n");
  
  const CONTRACT_ADDRESS = "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008";
  
  // Obtener el contrato
  const LottoMojiCore = await ethers.getContractFactory("LottoMojiCoreV4");
  const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
  
  console.log("📍 Contrato V4 (V2Plus):", CONTRACT_ADDRESS);
  
  try {
    // Verificar estado actual
    const currentGameDay = await contract.currentGameDay();
    const nextDrawTs = await contract.nextDrawTs();
    const now = Math.floor(Date.now() / 1000);
    
    console.log("📅 Current Game Day:", currentGameDay.toString());
    console.log("⏰ Next Draw Timestamp:", nextDrawTs.toString());
    console.log("⏰ Next Draw Date:", new Date(Number(nextDrawTs) * 1000).toLocaleString());
    console.log("⏰ Current Time:", new Date(now * 1000).toLocaleString());
    console.log("⏰ Time difference:", now - Number(nextDrawTs), "seconds");
    
    // Verificar si necesita upkeep
    const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
    console.log("\n🔍 Upkeep needed:", upkeepNeeded);
    
    if (!upkeepNeeded) {
      console.log("⚠️  Upkeep no es necesario aún. Forzando de todas formas...");
    }
    
    // Verificar automatización
    const automationActive = await contract.automationActive();
    const emergencyPause = await contract.emergencyPause();
    
    console.log("🤖 Automation active:", automationActive);
    console.log("🚨 Emergency pause:", emergencyPause);
    
    if (!automationActive) {
      console.log("⚠️  Automatización desactivada. Activando...");
      const toggleTx = await contract.toggleAutomation();
      await toggleTx.wait();
      console.log("✅ Automatización activada");
    }
    
    if (emergencyPause) {
      console.log("⚠️  Pausa de emergencia activada. Desactivando...");
      const pauseTx = await contract.toggleEmergencyPause();
      await pauseTx.wait();
      console.log("✅ Pausa de emergencia desactivada");
    }
    
    // Forzar el sorteo
    console.log("\n🎲 Ejecutando performUpkeep...");
    const tx = await contract.performUpkeep("0x");
    console.log("📝 Transaction hash:", tx.hash);
    
    console.log("⏳ Esperando confirmación...");
    const receipt = await tx.wait();
    console.log("✅ Transacción confirmada en bloque:", receipt.blockNumber);
    
    // Verificar nuevo estado
    const newGameDay = await contract.currentGameDay();
    const newNextDrawTs = await contract.nextDrawTs();
    
    console.log("\n📊 Estado después del sorteo:");
    console.log("📅 New Game Day:", newGameDay.toString());
    console.log("⏰ New Next Draw:", new Date(Number(newNextDrawTs) * 1000).toLocaleString());
    
    // Buscar eventos
    console.log("\n📋 Eventos emitidos:");
    const events = receipt.logs;
    for (const event of events) {
      try {
        const parsed = contract.interface.parseLog(event);
        console.log(`   ${parsed.name}:`, parsed.args);
      } catch (e) {
        // Evento no reconocido, ignorar
      }
    }
    
    console.log("\n🎉 Sorteo forzado exitosamente!");
    console.log("🔄 Los tickets ahora deberían aparecer en el frontend");
    
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