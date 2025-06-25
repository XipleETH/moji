const { ethers } = require("hardhat");

async function main() {
  console.log("🕐 VERIFICANDO TIEMPO DEL CONTRATO V4");
  console.log("====================================");
  
  const CONTRACT_ADDRESS = "0x6d05B87dCD1d601770E4c04Db2D91F1cAc288C3D"; // V4
  
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
      block
    ] = await Promise.all([
      contract.getCurrentDay(),
      contract.lastDrawTime(),
      contract.drawTimeUTC(),
      contract.DRAW_INTERVAL(),
      ethers.provider.getBlock('latest')
    ]);
    
    const gameDay = Number(currentGameDay);
    const lastDraw = Number(lastDrawTime);
    const drawTime = Number(drawTimeUTC);
    const interval = Number(drawInterval);
    const blockTime = Number(block.timestamp);
    
    console.log("🏁 Game Day:", gameDay);
    console.log("⏰ Last Draw Time:", lastDraw, "(" + new Date(lastDraw * 1000).toISOString() + ")");
    console.log("🕐 Draw Time UTC:", drawTime, "seconds (" + (drawTime / 3600) + " hours)");
    console.log("⏳ Draw Interval:", interval, "seconds (" + (interval / 3600) + " hours)");
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
    
    // Verificar en timezone São Paulo
    const nextDrawDate = new Date(nextDrawTime * 1000);
    const saoPauloTime = nextDrawDate.toLocaleString('pt-BR', { 
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
    
    console.log("🇧🇷 São Paulo Time:", saoPauloTime);
    
    // Verificar si es medianoche
    const saoPauloHour = nextDrawDate.toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    console.log("🕛 Is Midnight SP?:", saoPauloHour === '00:00' ? '✅ YES' : '❌ NO (' + saoPauloHour + ')');
    
    // Estado del sistema
    console.log("\n🔍 ESTADO DEL SISTEMA:");
    console.log("-".repeat(30));
    
    if (timeUntilDraw <= 0) {
      console.log("🚨 ¡SORTEO RETRASADO! El tiempo ya pasó por", Math.abs(timeUntilDraw), "segundos");
    } else if (timeUntilDraw > 24 * 3600) {
      console.log("⚠️ Tiempo hasta sorteo es mayor a 24 horas:", timeUntilDraw / 3600, "horas");
    } else {
      console.log("✅ Tiempo hasta sorteo normal:", hours, "horas", minutes, "minutos");
    }
    
    // Verificar configuración
    if (drawTime !== 3 * 3600) {
      console.log("⚠️ drawTimeUTC no es 3 horas (03:00 UTC)");
    } else {
      console.log("✅ drawTimeUTC correcto: 03:00 UTC (medianoche São Paulo)");
    }
    
    if (interval !== 24 * 3600) {
      console.log("⚠️ drawInterval no es 24 horas");
    } else {
      console.log("✅ drawInterval correcto: 24 horas");
    }
    
    console.log("\n🎯 RESUMEN:");
    console.log("-".repeat(30));
    console.log("Próximo sorteo en:", hours + "h " + minutes + "m " + seconds + "s");
    console.log("Fecha y hora (São Paulo):", saoPauloTime);
    console.log("¿Es medianoche São Paulo?:", saoPauloHour === '00:00' ? 'SÍ ✅' : 'NO ❌');
    
    return {
      nextDrawTime,
      timeUntilDraw,
      hours,
      minutes,
      seconds,
      saoPauloTime,
      isMidnight: saoPauloHour === '00:00'
    };
    
  } catch (error) {
    console.error("❌ Error verificando tiempo del contrato:", error);
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