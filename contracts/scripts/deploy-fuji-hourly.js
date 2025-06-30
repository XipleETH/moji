const { ethers } = require("hardhat");

async function main() {
    console.log("⚡ DEPLOYING LOTTO MOJI - SORTEOS CADA HORA - AVALANCHE FUJI");
    console.log("=".repeat(70));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying con cuenta:", deployer.address);
    
    // Verificar balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "AVAX");
    
    if (balance < ethers.parseEther("0.1")) {
        throw new Error("❌ Balance insuficiente para deployment (necesitas al menos 0.1 AVAX)");
    }
    
    // Configuración para Avalanche Fuji
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const LINK_TOKEN = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";
    const KEY_HASH = "0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887";
    
    // Subscription ID específico
    const SUBSCRIPTION_ID = "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    const DRAW_TIME_UTC = 17; // 17:00 UTC para testing horario
    
    // Configurar para que el primer sorteo sea en la próxima hora
    const now = new Date();
    const currentHour = now.getUTCHours();
    const nextHour = (currentHour + 1) % 24;
    
    // Último sorteo: hora actual a las 17 minutos (para que el próximo sea en ~43 minutos)
    const lastDrawDate = new Date();
    lastDrawDate.setUTCHours(currentHour, 17, 0, 0); // Hace 43 minutos que pasó el sorteo
    const lastDrawTimestamp = Math.floor(lastDrawDate.getTime() / 1000);
    
    // Próximo sorteo será en la hora que viene
    const nextDrawDate = new Date();
    nextDrawDate.setUTCHours(nextHour, 17, 0, 0);
    
    console.log("\n📋 CONFIGURACIÓN SORTEOS HORARIOS:");
    console.log("- Network: Avalanche Fuji Testnet (Chain ID: 43113)");
    console.log("- USDC Address:", USDC_ADDRESS);
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Draw Time Base UTC:", DRAW_TIME_UTC + ":17 (minuto 17 de cada hora)");
    console.log("- ⚡ FRECUENCIA: CADA HORA (1 hour interval)");
    console.log("- Last Draw Time:", lastDrawDate.toISOString());
    console.log("- Próximo sorteo:", nextDrawDate.toISOString());
    console.log("- Tiempo hasta próximo:", Math.round((nextDrawDate - now) / 60000), "minutos");
    
    // Deploy del contrato
    console.log("\n🚀 Deployando contrato con DRAW_INTERVAL = 1 hours...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    // Usamos minuto 17 de cada hora para los sorteos
    const drawTimeUTCInSeconds = (DRAW_TIME_UTC * 3600) + (17 * 60); // XX:17:00 UTC
    
    const contract = await LottoMojiCore.deploy(
        USDC_ADDRESS,
        SUBSCRIPTION_ID,
        drawTimeUTCInSeconds
    );
    
    console.log("⏳ Esperando confirmación del deployment...");
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log("✅ Contrato deployado en:", contractAddress);
    console.log("🔗 Ver en explorador: https://testnet.snowtrace.io/address/" + contractAddress);
    
    // Verificar deployment
    console.log("\n🔍 VERIFICANDO DEPLOYMENT:");
    console.log("=".repeat(40));
    
    try {
        const gameActive = await contract.gameActive();
        const ticketPrice = await contract.ticketPrice();
        const drawTimeUTC = await contract.drawTimeUTC();
        const currentGameDay = await contract.getCurrentDay();
        const subscriptionId = await contract.subscriptionId();
        
        console.log("✅ gameActive:", gameActive);
        console.log("✅ ticketPrice:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("✅ drawTimeUTC:", Number(drawTimeUTC) / 3600, "horas");
        console.log("✅ getCurrentDay:", currentGameDay.toString());
        console.log("✅ subscriptionId:", subscriptionId.toString());
        
        // Configurar el lastDrawTime para timing horario
        console.log("\n⚙️ CONFIGURANDO TIMING HORARIO...");
        const setDrawTimeTx = await contract.setLastDrawTime(lastDrawTimestamp);
        await setDrawTimeTx.wait();
        console.log("✅ LastDrawTime configurado a:", lastDrawDate.toISOString());
        
        // Verificar la nueva configuración
        const newCurrentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        const nextDrawTimestamp = Number(lastDrawTime) + 3600; // +1 hora
        
        console.log("✅ Nuevo getCurrentDay:", newCurrentGameDay.toString());
        console.log("✅ LastDrawTime confirmado:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("🎯 Próximo sorteo será:", new Date(nextDrawTimestamp * 1000).toISOString());
        
        // Calcular tiempo hasta próximo sorteo
        const timeToNext = nextDrawTimestamp - Math.floor(Date.now() / 1000);
        const minutesToNext = Math.floor(timeToNext / 60);
        console.log("⏰ Tiempo hasta próximo sorteo:", minutesToNext, "minutos");
        
    } catch (error) {
        console.error("❌ Error en verificación:", error.message);
    }
    
    console.log("\n⚠️ PRÓXIMOS PASOS:");
    console.log("=".repeat(30));
    console.log("1. ✅ Contrato desplegado con sorteos horarios");
    console.log("2. ✅ DRAW_INTERVAL configurado a 1 hour");
    console.log("3. 🔄 Agregar contrato como consumer en VRF subscription");
    console.log("4. 🔄 Comprar tickets para testing");
    console.log("5. 🔄 Esperar ~" + Math.round((nextDrawDate - now) / 60000) + " minutos para primer sorteo");
    
    console.log("\n📱 INFORMACIÓN PARA EL FRONTEND:");
    console.log("CONTRACT_ADDRESS =", `"${contractAddress}"`);
    console.log("NETWORK = Avalanche Fuji");
    console.log("CHAIN_ID = 43113");
    console.log("USDC_ADDRESS =", `"${USDC_ADDRESS}"`);
    console.log("DRAW_FREQUENCY = 'EVERY_HOUR'");
    
    console.log("\n🧪 CONFIGURACIÓN DE TESTING:");
    console.log("=".repeat(35));
    console.log("⚡ Sorteos: CADA HORA a los :17 minutos");
    console.log("🎯 Próximo sorteo:", nextDrawDate.toLocaleTimeString('es-ES'));
    console.log("🕐 24 sorteos por día para testing completo");
    console.log("💰 Más consumo de LINK pero testing rápido");
    console.log("🔄 Puedes probar el sistema cada hora");
    
    console.log("\n" + "=".repeat(70));
    console.log("⚡ DEPLOYMENT COMPLETADO - SORTEOS HORARIOS");
    console.log("📍 Dirección del contrato:", contractAddress);
    console.log("🕐 Frecuencia: Cada hora (1 hour interval)");
    console.log("🧪 Perfecto para testing rápido del sistema");
    console.log("=".repeat(70));
    
    return {
        contractAddress,
        network: "avalanche-fuji",
        chainId: 43113,
        subscriptionId: SUBSCRIPTION_ID,
        drawFrequency: "HOURLY",
        nextDrawTime: nextDrawDate.toISOString(),
        minutesToNextDraw: Math.round((nextDrawDate - now) / 60000),
        explorerUrl: `https://testnet.snowtrace.io/address/${contractAddress}`,
        lastDrawTime: lastDrawTimestamp
    };
}

main()
    .then((result) => {
        console.log("✅ Deployment exitoso:", result);
        process.exit(0);
    })
    .catch((error) => {
        console.error("💥 Error en deployment:", error);
        process.exit(1);
    }); 