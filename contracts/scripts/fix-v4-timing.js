const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 CORRIGIENDO TIMING DEL CONTRATO V4");
  console.log("====================================");
  
  const CONTRACT_ADDRESS = "0x6d05B87dCD1d601770E4c04Db2D91F1cAc288C3D"; // V4
  
  try {
    // Conectar al contrato
    const [deployer] = await ethers.getSigners();
    console.log("👤 Using account:", deployer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    // Obtener estado actual
    console.log("\n📊 ESTADO ACTUAL:");
    console.log("-".repeat(30));
    
    const [currentGameDay, lastDrawTime, drawInterval, block] = await Promise.all([
      contract.getCurrentDay(),
      contract.lastDrawTime(),
      contract.DRAW_INTERVAL(),
      ethers.provider.getBlock('latest')
    ]);
    
    const gameDay = Number(currentGameDay);
    const lastDraw = Number(lastDrawTime);
    const interval = Number(drawInterval);
    const blockTime = Number(block.timestamp);
    
    const currentNextDraw = lastDraw + interval;
    const currentRemaining = currentNextDraw - blockTime;
    
    console.log("🏁 Game Day:", gameDay);
    console.log("⏰ Current Last Draw:", new Date(lastDraw * 1000).toISOString());
    console.log("🎯 Current Next Draw:", new Date(currentNextDraw * 1000).toISOString());
    console.log("⏱️ Time Remaining:", Math.floor(currentRemaining / 3600) + "h " + Math.floor((currentRemaining % 3600) / 60) + "m");
    
    // Verificar hora en São Paulo
    const currentNextDrawSP = new Date(currentNextDraw * 1000).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    console.log("🇧🇷 Current Next Draw (SP):", currentNextDrawSP);
    console.log("🕛 Is Midnight SP?:", currentNextDrawSP === '00:00' ? '✅ YES' : '❌ NO');
    
    if (currentNextDrawSP === '00:00') {
      console.log("✅ ¡El timing ya está correcto! No se necesita corrección.");
      return;
    }
    
    // Calcular la corrección necesaria
    console.log("\n🧮 CALCULANDO CORRECCIÓN:");
    console.log("-".repeat(30));
    
    // Calcular la próxima medianoche de São Paulo en UTC
    // São Paulo está en UTC-3 (horario estándar), así que medianoche SP = 03:00 UTC
    const now = new Date(blockTime * 1000);
    const nextMidnightUTC = new Date(now);
    
    // Si ya pasaron las 03:00 UTC de hoy, programar para mañana
    if (now.getUTCHours() >= 3) {
      nextMidnightUTC.setUTCDate(nextMidnightUTC.getUTCDate() + 1);
    }
    
    nextMidnightUTC.setUTCHours(3, 0, 0, 0); // 03:00 UTC = 00:00 São Paulo
    
    const correctNextDraw = Math.floor(nextMidnightUTC.getTime() / 1000);
    const correctLastDraw = correctNextDraw - interval; // 24 horas antes
    
    console.log("🎯 Correct Next Draw Time:", new Date(correctNextDraw * 1000).toISOString());
    console.log("⏰ Correct Last Draw Time:", new Date(correctLastDraw * 1000).toISOString());
    
    // Verificar que será medianoche en São Paulo
    const verifyNextDrawSP = new Date(correctNextDraw * 1000).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    console.log("✅ Verified Next Draw (SP):", verifyNextDrawSP);
    
    if (verifyNextDrawSP !== '00:00') {
      console.error("❌ ERROR: El cálculo no resulta en medianoche São Paulo");
      return;
    }
    
    // Calcular diferencia
    const timeDifference = correctNextDraw - currentNextDraw;
    const diffHours = Math.floor(Math.abs(timeDifference) / 3600);
    const diffMinutes = Math.floor((Math.abs(timeDifference) % 3600) / 60);
    
    console.log("📊 Diferencia de tiempo:", diffHours + "h " + diffMinutes + "m");
    console.log("📍 Dirección:", timeDifference > 0 ? "Adelantar" : "Atrasar");
    
    // Aplicar la corrección
    console.log("\n⚡ APLICANDO CORRECCIÓN:");
    console.log("-".repeat(30));
    
    console.log("Llamando contract.setLastDrawTime(" + correctLastDraw + ")");
    
    const tx = await contract.setLastDrawTime(correctLastDraw, {
      gasLimit: 150000
    });
    
    console.log("📝 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    
    // Verificar la corrección
    console.log("\n🔍 VERIFICANDO CORRECCIÓN:");
    console.log("-".repeat(30));
    
    const newLastDrawTime = await contract.lastDrawTime();
    const newCurrentGameDay = await contract.getCurrentDay();
    const newNextDraw = Number(newLastDrawTime) + interval;
    
    console.log("✅ New Last Draw Time:", new Date(Number(newLastDrawTime) * 1000).toISOString());
    console.log("🎯 New Next Draw Time:", new Date(newNextDraw * 1000).toISOString());
    console.log("🏁 New Game Day:", Number(newCurrentGameDay));
    
    const finalNextDrawSP = new Date(newNextDraw * 1000).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const finalFullTimeSP = new Date(newNextDraw * 1000).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    console.log("🇧🇷 New Next Draw (SP):", finalFullTimeSP);
    console.log("🕛 Is Midnight SP?:", finalNextDrawSP === '00:00' ? '✅ YES - FIXED!' : '❌ Still wrong');
    
    if (finalNextDrawSP === '00:00') {
      console.log("\n🎉 ¡CORRECCIÓN EXITOSA!");
      console.log("✅ Todos los sorteos futuros serán exactamente a medianoche São Paulo");
      console.log("🔄 El frontend ahora debería mostrar el tiempo correcto");
      
      // Calcular nuevo tiempo restante
      const finalBlock = await ethers.provider.getBlock('latest');
      const finalRemaining = newNextDraw - Number(finalBlock.timestamp);
      const finalHours = Math.floor(finalRemaining / 3600);
      const finalMinutes = Math.floor((finalRemaining % 3600) / 60);
      
      console.log("⏰ Nuevo tiempo restante:", finalHours + "h " + finalMinutes + "m");
    } else {
      console.log("\n❌ La corrección falló");
      console.log("💡 Es posible que necesites ejecutar el script nuevamente");
    }
    
  } catch (error) {
    console.error("❌ Error corrigiendo timing del contrato:", error);
    
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    
    if (error.message.includes("onlyOwner")) {
      console.error("💡 Asegúrate de estar usando la cuenta owner del contrato");
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main; 