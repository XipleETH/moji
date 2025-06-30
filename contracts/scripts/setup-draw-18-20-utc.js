const { ethers } = require("hardhat");

async function main() {
    console.log("🕐 CONFIGURANDO SORTEO PARA LAS 18:20 UTC EXACTAS");
    console.log("=".repeat(60));
    
    // Dirección del contrato V5
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    // Conectar al contrato
    const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
    
    console.log("📍 Contrato:", CONTRACT_ADDRESS);
    
    // Ver configuración actual
    console.log("\n📊 CONFIGURACIÓN ACTUAL:");
    const currentDrawTime = await contract.drawTimeUTC();
    const currentGameDay = await contract.getCurrentDay();
    const lastDrawTime = await contract.lastDrawTime();
    
    console.log("⏰ Draw Time actual:", (Number(currentDrawTime) / 3600) + ":00 UTC");
    console.log("📅 Game Day actual:", currentGameDay.toString());
    console.log("🕐 Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
    
    // Calcular cuando son las 18:20 UTC exactas
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Crear fecha para hoy a las 18:20 UTC
    const target1820UTC = new Date(today);
    target1820UTC.setUTCHours(18, 20, 0, 0);
    
    // Si ya pasaron las 18:20 de hoy, programar para mañana
    if (now > target1820UTC) {
        target1820UTC.setDate(target1820UTC.getDate() + 1);
    }
    
    const target1820Timestamp = Math.floor(target1820UTC.getTime() / 1000);
    const minutesUntil1820 = Math.round((target1820Timestamp - Math.floor(now.getTime() / 1000)) / 60);
    
    console.log("\n🎯 OBJETIVO:");
    console.log("📅 Sorteo programado para:", target1820UTC.toISOString());
    console.log("⏰ En:", minutesUntil1820, "minutos");
    
    // PASO 1: Cambiar drawTimeUTC a 18:20 (18 horas + 20 minutos = 66000 segundos)
    console.log("\n🔧 PASO 1: Configurando drawTimeUTC a 18:20...");
    
    const newDrawTimeSeconds = (18 * 3600) + (20 * 60); // 18:20 en segundos = 66000
    
    try {
        // Nota: setDrawTimeUTC espera horas, pero necesitamos 18.33333 horas para 18:20
        // Mejor usar setLastDrawTime para control exacto
        console.log("⚠️  setDrawTimeUTC solo acepta horas completas, usando lastDrawTime para control exacto");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
    
    // PASO 2: Calcular lastDrawTime para que el próximo sorteo sea exactamente a las 18:20
    console.log("\n🔧 PASO 2: Configurando lastDrawTime para sorteo a las 18:20...");
    
    // Para que el sorteo sea a las 18:20, necesitamos:
    // lastDrawTime = target1820Timestamp - 24 horas
    const newLastDrawTime = target1820Timestamp - (24 * 3600);
    
    console.log("🕐 Timestamp actual:", Math.floor(now.getTime() / 1000), "(" + now.toISOString() + ")");
    console.log("🎯 Timestamp objetivo 18:20:", target1820Timestamp, "(" + target1820UTC.toISOString() + ")");
    console.log("🔧 Nuevo lastDrawTime:", newLastDrawTime, "(" + new Date(newLastDrawTime * 1000).toISOString() + ")");
    
    try {
        const tx = await contract.setLastDrawTime(newLastDrawTime);
        console.log("⏳ Transacción enviada:", tx.hash);
        await tx.wait();
        console.log("✅ lastDrawTime configurado para sorteo a las 18:20 UTC");
    } catch (error) {
        console.error("❌ Error cambiando lastDrawTime:", error.message);
        return;
    }
    
    // VERIFICACIÓN FINAL
    console.log("\n🔍 VERIFICACIÓN FINAL:");
    
    const newDrawTimeCheck = await contract.drawTimeUTC();
    const newGameDay = await contract.getCurrentDay();
    const newLastDrawTimeCheck = await contract.lastDrawTime();
    
    console.log("⏰ Draw Time UTC:", (Number(newDrawTimeCheck) / 3600) + ":00 UTC");
    console.log("📅 Game Day:", newGameDay.toString());
    console.log("🕐 Nuevo Last Draw Time:", new Date(Number(newLastDrawTimeCheck) * 1000).toISOString());
    
    // Calcular próximo sorteo
    const nextDrawTime = Number(newLastDrawTimeCheck) + (24 * 3600);
    const nextDrawDate = new Date(nextDrawTime * 1000);
    const minutesUntilDraw = Math.round((nextDrawTime - Math.floor(now.getTime() / 1000)) / 60);
    
    console.log("\n🎯 PRÓXIMO SORTEO:");
    console.log("📅 Fecha y hora:", nextDrawDate.toISOString());
    console.log("⏰ En aproximadamente:", minutesUntilDraw, "minutos");
    
    // Verificar que sea exactamente a las 18:20
    const nextDrawHour = nextDrawDate.getUTCHours();
    const nextDrawMinute = nextDrawDate.getUTCMinutes();
    
    if (nextDrawHour === 18 && nextDrawMinute === 20) {
        console.log("✅ ¡PERFECTO! Sorteo configurado exactamente a las 18:20 UTC");
    } else {
        console.log(`⚠️  Verificar: El sorteo será a las ${nextDrawHour}:${nextDrawMinute.toString().padStart(2, '0')} UTC`);
    }
    
    console.log("\n📋 QUÉ ESPERAR:");
    console.log("1. En ~" + minutesUntilDraw + " minutos: Chainlink Automation ejecutará el sorteo");
    console.log("2. Se sortearán los tickets del gameDay actual");
    console.log("3. Se distribuirán las pools");
    console.log("4. Los ganadores podrán reclamar inmediatamente");
    console.log("5. Futuros sorteos: Cada 24 horas desde las 18:20 UTC");
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SORTEO CONFIGURADO PARA LAS 18:20 UTC EXACTAS");
    console.log("😊 ¡Perdón por la confusión anterior!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error en el script:", error);
        process.exit(1);
    }); 