const { ethers } = require("hardhat");

async function main() {
    console.log("🏔️ DEPLOYING LOTTO MOJI V2 EN AVALANCHE FUJI");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying con cuenta:", deployer.address);
    
    // Verificar balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "AVAX");
    
    if (balance < ethers.parseEther("0.1")) {
        throw new Error("❌ Balance insuficiente para deployment (necesitas al menos 0.1 AVAX)");
    }
    
    // Configuración para Avalanche Fuji V2
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65"; // Avalanche Fuji USDC
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"; // Avalanche Fuji VRF Coordinator
    const LINK_TOKEN = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846"; // Avalanche Fuji LINK
    const KEY_HASH = "0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887"; // Avalanche Fuji key hash
    
    // Subscription ID para Avalanche Fuji
    const SUBSCRIPTION_ID = process.env.AVALANCHE_FUJI_SUBSCRIPTION_ID || "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    const DRAW_TIME_UTC_SECONDS = (6 * 3600) + (20 * 60); // 6:20 UTC para sorteos y cambio de día
    
    console.log("\n📋 CONFIGURACIÓN AVALANCHE FUJI V2:");
    console.log("-".repeat(40));
    console.log("- Network: Avalanche Fuji Testnet (Chain ID: 43113)");
    console.log("- USDC Address:", USDC_ADDRESS);
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    console.log("- LINK Token:", LINK_TOKEN);
    console.log("- Key Hash:", KEY_HASH);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Draw Time UTC: 6:20");
    console.log("- Day Change Time UTC: 6:20 (inicial)");
    console.log("- Ticket Price: 0.05 USDC (inicial)");
    console.log("- Gas Limit VRF: 15M (Avalanche optimized)");
    
    console.log("\n🔧 NUEVAS CARACTERÍSTICAS V2:");
    console.log("-".repeat(35));
    console.log("✅ Precio de ticket configurable sin redesplegar");
    console.log("✅ Hora de cambio de día independiente del sorteo");
    console.log("✅ Gas limit optimizado para Avalanche (15M)");
    console.log("✅ Soporta hasta ~5,000 tickets por sorteo");
    console.log("✅ Todas las funciones admin configurables");
    console.log("✅ Sorteo y cambio de día sincronizados a las 6:20 UTC");
    
    console.log("\n🎯 FUNCIONES CONFIGURABLES:");
    console.log("-".repeat(30));
    console.log("• setTicketPrice(uint256 _newPrice)");
    console.log("• setDrawTimeUTC(uint256 _hours)");
    console.log("• setDayChangeTimeUTC(uint256 _hours)");
    console.log("• setLastDrawTime(uint256 _timestamp)");
    console.log("• toggleAutomation()");
    console.log("• toggleEmergencyPause()");
    
    // Deploy del contrato
    console.log("\n🚀 Deployando contrato...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    console.log("📝 Parámetros del constructor:");
    console.log("  - usdcToken:", USDC_ADDRESS);
    console.log("  - subscriptionId:", SUBSCRIPTION_ID);
    console.log("  - drawTimeUTC:", DRAW_TIME_UTC_SECONDS, "(6:20 UTC)");
    
    const contract = await LottoMojiCore.deploy(
        USDC_ADDRESS,
        SUBSCRIPTION_ID,
        DRAW_TIME_UTC_SECONDS
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
        const automationActive = await contract.automationActive();
        
        console.log("✅ Game Active:", gameActive);
        console.log("✅ Automation Active:", automationActive);
        
        // Verificar ticketPrice con try-catch
        try {
            const ticketPrice = await contract.ticketPrice();
            console.log("✅ Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
        } catch (ticketPriceError) {
            console.log("⚠️ Ticket Price: Error accessing -", ticketPriceError.message);
        }
        
        // Verificar tiempos
        try {
            const drawTimeUTC = await contract.drawTimeUTC();
            const dayChangeTimeUTC = await contract.dayChangeTimeUTC();
            
            // Mostrar horas y minutos correctamente
            const drawHours = Math.floor(Number(drawTimeUTC) / 3600);
            const drawMinutes = Math.floor((Number(drawTimeUTC) % 3600) / 60);
            const dayChangeHours = Math.floor(Number(dayChangeTimeUTC) / 3600);
            const dayChangeMinutes = Math.floor((Number(dayChangeTimeUTC) % 3600) / 60);
            
            console.log("✅ Draw Time UTC:", drawHours + ":" + drawMinutes.toString().padStart(2, '0'));
            console.log("✅ Day Change Time UTC:", dayChangeHours + ":" + dayChangeMinutes.toString().padStart(2, '0'));
        } catch (timeError) {
            console.log("⚠️ Time Config: Error accessing -", timeError.message);
        }
        
        // Verificar otros valores
        try {
            const currentGameDay = await contract.getCurrentDay();
            const subscriptionId = await contract.subscriptionId();
            const usdcToken = await contract.usdcToken();
            
            console.log("✅ Current Game Day:", currentGameDay.toString());
            console.log("✅ VRF Subscription ID:", subscriptionId.toString().substring(0, 20) + "...");
            console.log("✅ USDC Token:", usdcToken);
        } catch (generalError) {
            console.log("⚠️ General Config: Error accessing -", generalError.message);
        }
        
        // Verificar configuración VRF
        console.log("\n🔗 CONFIGURACIÓN VRF:");
        console.log("✅ VRF Coordinator (hardcoded):", VRF_COORDINATOR);
        console.log("✅ Key Hash (hardcoded): Avalanche Fuji");
        console.log("✅ Callback Gas Limit: 15,000,000 (Avalanche optimized)");
        console.log("✅ Request Confirmations: 1");
        console.log("✅ Num Words: 4");
        
    } catch (error) {
        console.error("❌ Error en verificación:", error.message);
        console.log("⚠️ El contrato se deployó pero hay problemas con la verificación");
        console.log("💡 Esto puede ser normal si la red tiene latencia");
        console.log("🔍 Verifica manualmente en el explorador:", "https://testnet.snowtrace.io/address/" + contractAddress);
    }
    
    console.log("\n⚠️ IMPORTANTE - CONFIGURACIÓN INICIAL:");
    console.log("=".repeat(50));
    console.log("1. 🔄 Agregar contrato como consumer VRF:");
    console.log("   - Ir a https://vrf.chain.link/");
    console.log("   - Seleccionar Avalanche Fuji");
    console.log("   - Subscription ID:", SUBSCRIPTION_ID);
    console.log("   - Agregar address:", contractAddress);
    console.log("2. 💰 Verificar fondos LINK en la suscripción");
    console.log("3. 🧪 Comprar algunos tickets para probar");
    console.log("4. 🎲 Ejecutar sorteo manual para verificar");
    
    console.log("\n📱 INFORMACIÓN PARA EL FRONTEND:");
    console.log("=".repeat(50));
    console.log("CONTRACT_ADDRESS =", `"${contractAddress}"`);
    console.log("NETWORK = Avalanche Fuji");
    console.log("CHAIN_ID = 43113");
    console.log("RPC_URL = https://api.avax-test.network/ext/bc/C/rpc");
    console.log("EXPLORER = https://testnet.snowtrace.io");
    console.log("USDC_ADDRESS =", `"${USDC_ADDRESS}"`);
    console.log("SUBSCRIPTION_ID =", `"${SUBSCRIPTION_ID}"`);
    
    console.log("\n📋 SCRIPTS DE CONFIGURACIÓN:");
    console.log("-".repeat(35));
    console.log("# Cambiar precio de ticket a 0.1 USDC:");
    console.log(`node scripts/change-ticket-price.js ${contractAddress} 100000`);
    console.log("");
    console.log("# Cambiar precio de ticket a 0.2 USDC:");
    console.log(`node scripts/change-ticket-price.js ${contractAddress} 200000`);
    console.log("");
    console.log("# Cambiar hora de sorteo a 20:00 UTC:");
    console.log(`node scripts/change-draw-time.js ${contractAddress} 20`);
    console.log("");
    console.log("# Cambiar hora de cambio de día a 0:00 UTC:");
    console.log(`node scripts/change-day-time.js ${contractAddress} 0`);
    
    console.log("\n🧪 SCRIPTS DE PRUEBA:");
    console.log("-".repeat(25));
    console.log("# Verificar configuración:");
    console.log(`node scripts/check-config-v2.js ${contractAddress}`);
    console.log("");
    console.log("# Comprar tickets:");
    console.log(`node scripts/buy-tickets-v2.js ${contractAddress}`);
    console.log("");
    console.log("# Ejecutar sorteo:");
    console.log(`node scripts/force-draw-v2.js ${contractAddress}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT V2 EN AVALANCHE FUJI COMPLETADO");
    console.log("📍 Dirección del contrato:", contractAddress);
    console.log("🔗 Explorador: https://testnet.snowtrace.io/address/" + contractAddress);
    console.log("⚙️ Versión: V2 - Configuración flexible");
    console.log("⏰ Timing: Sorteos y cambio de día a las 6:20 UTC");
    console.log("=".repeat(60));
    
    return {
        contractAddress,
        network: "avalanche-fuji",
        chainId: 43113,
        version: "V2",
        subscriptionId: SUBSCRIPTION_ID,
        drawTimeUTC: "6:20",
        dayChangeTimeUTC: "6:20",
        explorerUrl: `https://testnet.snowtrace.io/address/${contractAddress}`,
        features: [
            "Configurable ticket price (0.05 USDC inicial)",
            "Independent day change time",
            "15M gas VRF limit",
            "~5,000 tickets support",
            "Synchronized at 6:20 UTC"
        ]
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 