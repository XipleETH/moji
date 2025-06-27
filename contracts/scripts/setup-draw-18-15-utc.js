const { ethers } = require("hardhat");

async function main() {
    console.log("🕐 CONFIGURANDO SORTEO PARA 18:15 UTC");
    console.log("=".repeat(50));
    
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
    
    // PASO 1: Cambiar drawTimeUTC a 18:00 (si no está ya)
    console.log("\n🔧 PASO 1: Configurando drawTimeUTC a 18:00...");
    
    if (Number(currentDrawTime) !== 64800) { // 18 * 3600
        try {
            const tx1 = await contract.setDrawTimeUTC(18);
            console.log("⏳ Transacción enviada:", tx1.hash);
            await tx1.wait();
            console.log("✅ drawTimeUTC cambiado a 18:00 UTC");
        } catch (error) {
            console.error("❌ Error cambiando drawTimeUTC:", error.message);
            return;
        }
    } else {
        console.log("✅ drawTimeUTC ya está en 18:00 UTC");
    }
    
    // PASO 2: Calcular timestamp para sorteo a las 18:15 UTC
    console.log("\n🔧 PASO 2: Configurando lastDrawTime para sorteo a las 18:15...");
    
    // Timestamp actual
    const now = Math.floor(Date.now() / 1000);
    console.log("🕐 Timestamp actual:", now, "(" + new Date(now * 1000).toISOString() + ")");
    
    // Para que el sorteo sea en 10 minutos (18:15 UTC):
    // lastDrawTime = ahora - 24 horas + 10 minutos
    const tenMinutesFromNow = now - 86400 + 600; // 600 segundos = 10 minutos
    
    console.log("🎯 Timestamp objetivo:", tenMinutesFromNow, "(" + new Date(tenMinutesFromNow * 1000).toISOString() + ")");
    console.log("⏰ Próximo sorteo será a las:", new Date((tenMinutesFromNow + 86400) * 1000).toISOString());
    
    try {
        const tx2 = await contract.setLastDrawTime(tenMinutesFromNow);
        console.log("⏳ Transacción enviada:", tx2.hash);
        await tx2.wait();
        console.log("✅ lastDrawTime configurado para sorteo en ~10 minutos");
    } catch (error) {
        console.error("❌ Error cambiando lastDrawTime:", error.message);
        return;
    }
    
    // VERIFICACIÓN FINAL
    console.log("\n🔍 VERIFICACIÓN FINAL:");
    
    const newDrawTime = await contract.drawTimeUTC();
    const newGameDay = await contract.getCurrentDay();
    const newLastDrawTime = await contract.lastDrawTime();
    
    console.log("⏰ Nueva Draw Time:", (Number(newDrawTime) / 3600) + ":00 UTC");
    console.log("📅 Nuevo Game Day:", newGameDay.toString());
    console.log("🕐 Nuevo Last Draw Time:", new Date(Number(newLastDrawTime) * 1000).toISOString());
    
    // Calcular próximo sorteo
    const nextDrawTime = Number(newLastDrawTime) + 86400;
    const nextDrawDate = new Date(nextDrawTime * 1000);
    const minutesUntilDraw = Math.round((nextDrawTime - now) / 60);
    
    console.log("\n🎯 PRÓXIMO SORTEO:");
    console.log("📅 Fecha y hora:", nextDrawDate.toISOString());
    console.log("⏰ En aproximadamente:", minutesUntilDraw, "minutos");
    
    if (minutesUntilDraw <= 12 && minutesUntilDraw >= 8) {
        console.log("✅ ¡Configuración correcta! Sorteo en ~10 minutos");
    } else {
        console.log("⚠️  Verificar: El sorteo debería ser en ~10 minutos");
    }
    
    console.log("\n📋 QUÉ ESPERAR:");
    console.log("1. En ~10 minutos: Chainlink Automation ejecutará el sorteo");
    console.log("2. Se sortearán los 71 tickets del gameDay actual");
    console.log("3. Se distribuirán las pools (~14.2 USDC)");
    console.log("4. Los ganadores podrán reclamar inmediatamente");
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 CONFIGURACIÓN COMPLETADA - SORTEO A LAS 18:15 UTC");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error en el script:", error);
        process.exit(1);
    }); 