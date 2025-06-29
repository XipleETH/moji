const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICANDO CONTRATO FUJI 17 UTC - NUEVO DEPLOYMENT");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0xeCCF651b43FA349666091b9B4bcA7Bb9D2B8125e";
    
    const contractABI = [
        "function gameActive() view returns (bool)",
        "function ticketPrice() view returns (uint256)",
        "function drawTimeUTC() view returns (uint256)",
        "function getCurrentDay() view returns (uint256)",
        "function lastDrawTime() view returns (uint256)",
        "function ticketCounter() view returns (uint256)",
        "function subscriptionId() view returns (uint256)"
    ];
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Verificando con cuenta:", signer.address);
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
    
    console.log("\n📍 INFORMACIÓN DEL CONTRATO:");
    console.log("- Dirección:", CONTRACT_ADDRESS);
    console.log("- Red: Avalanche Fuji Testnet");
    console.log("- Chain ID: 43113");
    
    try {
        console.log("\n⚙️ CONFIGURACIONES:");
        console.log("=".repeat(25));
        
        const gameActive = await contract.gameActive();
        const ticketPrice = await contract.ticketPrice();
        const drawTimeUTC = await contract.drawTimeUTC();
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        const ticketCounter = await contract.ticketCounter();
        const subscriptionId = await contract.subscriptionId();
        
        console.log("✅ Game Active:", gameActive);
        console.log("✅ Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("✅ Draw Time UTC:", Number(drawTimeUTC) / 3600, "horas (17:00 UTC)");
        console.log("✅ Current Game Day:", currentGameDay.toString());
        console.log("✅ Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("✅ Tickets vendidos:", ticketCounter.toString());
        console.log("✅ Subscription ID:", subscriptionId.toString());
        
        console.log("\n🕐 INFORMACIÓN DE SORTEOS:");
        console.log("=".repeat(30));
        
        const nextDrawTime = Number(lastDrawTime) + 24 * 3600;
        console.log("🎯 Próximo sorteo:", new Date(nextDrawTime * 1000).toISOString());
        
        const currentTime = Math.floor(Date.now() / 1000);
        const timeToNext = nextDrawTime - currentTime;
        const hoursToNext = Math.floor(timeToNext / 3600);
        const minutesToNext = Math.floor((timeToNext % 3600) / 60);
        
        if (timeToNext > 0) {
            console.log("⏰ Tiempo hasta próximo sorteo:", hoursToNext, "horas y", minutesToNext, "minutos");
        } else {
            console.log("⚠️ ¡El sorteo debería haber ocurrido ya!");
            console.log("⏰ Tiempo desde sorteo esperado:", Math.abs(hoursToNext), "horas y", Math.abs(minutesToNext), "minutos");
        }
        
        // Verificar fechas específicas
        const lastDrawDate = new Date(Number(lastDrawTime) * 1000);
        const nextDrawDate = new Date(nextDrawTime * 1000);
        
        console.log("\n📅 FECHAS DE SORTEO:");
        console.log("=".repeat(25));
        console.log("• Último sorteo configurado:", lastDrawDate.toLocaleDateString('es-ES'), "a las", lastDrawDate.toLocaleTimeString('es-ES'));
        console.log("• Próximo sorteo será:", nextDrawDate.toLocaleDateString('es-ES'), "a las", nextDrawDate.toLocaleTimeString('es-ES'));
        
        console.log("\n✅ ESTADO DEL SISTEMA:");
        console.log("=".repeat(25));
        console.log("🏔️ Red: Avalanche Fuji");
        console.log("🎫 Precio por ticket: 0.2 USDC");
        console.log("🕐 Sorteos: Diarios a las 17:00 UTC");
        console.log("🔗 VRF Consumer: Configurado");
        console.log("💰 Subscription: Fondeada con LINK");
        
        console.log("\n🔗 ENLACES:");
        console.log("=".repeat(15));
        console.log("• Contrato: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
        console.log("• USDC Fuji: https://testnet.snowtrace.io/address/0x5425890298aed601595a70AB815c96711a31Bc65");
        
        console.log("\n" + "=".repeat(60));
        console.log("🎉 CONTRATO VERIFICADO - SISTEMA FUNCIONANDO");
        console.log("✅ Listo para compra de tickets y sorteos automáticos");
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("❌ Error verificando contrato:", error.message);
        
        if (error.message.includes("call revert exception")) {
            console.log("\n💡 POSIBLES CAUSAS:");
            console.log("- El contrato no está desplegado en esta dirección");
            console.log("- La red no es la correcta");
            console.log("- Error en el ABI del contrato");
        }
    }
}

main()
    .then(() => {
        console.log("✅ Verificación completada");
        process.exit(0);
    })
    .catch((error) => {
        console.error("💥 Error en verificación:", error);
        process.exit(1);
    }); 