const { ethers } = require("hardhat");

async function main() {
  console.log("⚡ VERIFICANDO CONFIGURACIÓN HORARIA DEL NUEVO CONTRATO");
  console.log("=====================================================");
  
  const CONTRACT_ADDRESS = "0x599D73443e2fE18b03dfD8d28cad40af26C04155"; // NUEVO CONTRATO HORARIO
  
  try {
    // Conectar al contrato
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    // Obtener datos de tiempo del contrato
    console.log("\n📊 DATOS DEL CONTRATO:");
    console.log("-".repeat(30));
    
    const [
      currentGameDay,
      lastDrawTime,
      drawTimeUTC,
      drawInterval,
      gameActive,
      automationActive,
      block
    ] = await Promise.all([
      contract.getCurrentDay(),
      contract.lastDrawTime(),
      contract.drawTimeUTC(),
      contract.DRAW_INTERVAL(),
      contract.gameActive(),
      contract.automationActive(),
      ethers.provider.getBlock('latest')
    ]);
    
    const gameDay = Number(currentGameDay);
    const lastDraw = Number(lastDrawTime);
    const drawTime = Number(drawTimeUTC);
    const interval = Number(drawInterval);
    const blockTime = Number(block.timestamp);
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    console.log("🏁 Game Day:", gameDay);
    console.log("⏰ Last Draw Time:", lastDraw, "(" + new Date(lastDraw * 1000).toISOString() + ")");
    console.log("🕐 Draw Time UTC:", drawTime, "seconds (" + (drawTime / 3600) + " hours)");
    console.log("⏳ Draw Interval:", interval, "seconds (" + (interval / 3600) + " hours)");
    console.log("✅ Game Active:", gameActive);
    console.log("🤖 Automation Active:", automationActive);
    console.log("🌐 Current Block Time:", blockTime, "(" + new Date(blockTime * 1000).toISOString() + ")");
    
    // Calcular próximo sorteo
    const nextDrawTime = lastDraw + interval;
    const timeUntilDraw = nextDrawTime - blockTime;
    
    console.log("\n⏰ CÁLCULO DEL PRÓXIMO SORTEO:");
    console.log("-".repeat(30));
    console.log("🎯 Next Draw Time:", nextDrawTime, "(" + new Date(nextDrawTime * 1000).toISOString() + ")");
    console.log("⏱️ Time Until Draw:", timeUntilDraw, "seconds");
    
    // Formatear tiempo restante
    const hours = Math.floor(timeUntilDraw / 3600);
    const minutes = Math.floor((timeUntilDraw % 3600) / 60);
    const seconds = timeUntilDraw % 60;
    
    console.log("📅 Formatted Time:", hours + "h " + minutes + "m " + seconds + "s");
    
    // Verificar configuración HORARIA
    console.log("\n🔍 VERIFICACIÓN DE CONFIGURACIÓN HORARIA:");
    console.log("-".repeat(45));
    
    if (interval === 3600) {
      console.log("✅ CONFIRMADO: DRAW_INTERVAL = 1 hora (3600 segundos)");
      console.log("⚡ Sorteos cada hora configurados correctamente");
      console.log("🧪 Perfecto para testing rápido");
    } else {
      console.log("❌ ERROR: DRAW_INTERVAL =", interval, "segundos");
      console.log("❌ Esperado: 3600 segundos (1 hora)");
    }
    
    // Estado del sistema
    console.log("\n🔍 ESTADO DEL SISTEMA:");
    console.log("-".repeat(30));
    
    if (!gameActive) {
      console.log("🔴 JUEGO DESACTIVADO");
    } else if (!automationActive) {
      console.log("🟡 AUTOMACIÓN DESACTIVADA");
    } else {
      console.log("🟢 SISTEMA COMPLETAMENTE ACTIVO");
    }
    
    if (timeUntilDraw <= 0) {
      console.log("🚨 ¡SORTEO RETRASADO! El tiempo ya pasó por", Math.abs(timeUntilDraw), "segundos");
    } else if (timeUntilDraw > 3600) {
      console.log("⚠️ Tiempo hasta sorteo mayor a 1 hora:", Math.floor(timeUntilDraw / 3600), "horas", Math.floor((timeUntilDraw % 3600) / 60), "minutos");
    } else {
      console.log("✅ Tiempo hasta próximo sorteo:", minutes, "minutos", seconds, "segundos");
    }
    
    console.log("\n🎯 RESUMEN CONFIGURACIÓN HORARIA:");
    console.log("-".repeat(35));
    console.log("⚡ Frecuencia:", interval === 3600 ? "CADA HORA ✅" : "ERROR ❌");
    console.log("🎮 Estado:", gameActive && automationActive ? "ACTIVO ✅" : "INACTIVO ❌");
    console.log("⏰ Próximo sorteo en:", Math.floor(timeUntilDraw / 60), "minutos");
    console.log("🧪 Testing mode:", interval === 3600 ? "ACTIVADO ✅" : "DESACTIVADO ❌");
    
    if (interval === 3600) {
      console.log("\n🎉 CONFIGURACIÓN HORARIA CONFIRMADA");
      console.log("⚡ 24 oportunidades de testing por día");
      console.log("🔄 Resultados rápidos cada hora");
    }
    
    return {
      nextDrawTime,
      timeUntilDraw,
      hours,
      minutes,
      seconds,
      isHourly: interval === 3600,
      isActive: gameActive && automationActive
    };
    
  } catch (error) {
    console.error("❌ Error verificando configuración del contrato:", error);
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