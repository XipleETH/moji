const { ethers } = require("hardhat");

async function main() {
    console.log("🏔️ DEPLOYING LOTTO MOJI EN AVALANCHE FUJI TESTNET");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying con cuenta:", deployer.address);
    
    // Verificar balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "AVAX");
    
    if (balance < ethers.parseEther("0.1")) {
        throw new Error("❌ Balance insuficiente para deployment (necesitas al menos 0.1 AVAX)");
    }
    
    // Configuración para Avalanche Fuji
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65"; // Avalanche Fuji USDC
    const VRF_COORDINATOR = "0x2eD832Ba664535e5886b75D64C46EB9a228C2610"; // Avalanche Fuji VRF Coordinator
    const LINK_TOKEN = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846"; // Avalanche Fuji LINK
    const KEY_HASH = "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61"; // 300 gwei key hash
    
    // Nota: Necesitarás crear una suscripción VRF en Avalanche Fuji
    // Puedes usar https://vrf.chain.link/ y cambiar a Avalanche Fuji
    const SUBSCRIPTION_ID = process.env.AVALANCHE_FUJI_SUBSCRIPTION_ID || "1"; // Cambiar después de crear
    const DRAW_TIME_UTC = 20; // 20:00 UTC
    
    console.log("\n📋 CONFIGURACIÓN AVALANCHE FUJI:");
    console.log("- Network: Avalanche Fuji Testnet (Chain ID: 43113)");
    console.log("- USDC Address:", USDC_ADDRESS);
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    console.log("- LINK Token:", LINK_TOKEN);
    console.log("- Key Hash:", KEY_HASH);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Draw Time UTC:", DRAW_TIME_UTC + ":00");
    console.log("- Explorer: https://testnet.snowtrace.io");
    
    console.log("\n🔧 CARACTERÍSTICAS DEL CONTRATO:");
    console.log("✅ Lógica de ganadores:");
    console.log("   🥇 Primer Premio: 4 emojis posición exacta");
    console.log("   🥈 Segundo Premio: 4 emojis cualquier orden");
    console.log("   🥉 Tercer Premio: 3 emojis posición exacta");
    console.log("   🎫 Tickets Gratis: 3 emojis cualquier orden");
    console.log("✅ Precio del ticket: 0.2 USDC");
    console.log("✅ Sorteos cada 24 horas");
    console.log("✅ Sistema de reservas y pools acumulados");
    
    // Verificar que el contrato está configurado correctamente para Avalanche
    console.log("\n🔍 VERIFICANDO CONFIGURACIÓN DEL CONTRATO...");
    
    // Deploy del contrato
    console.log("\n🚀 Deployando contrato...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    const drawTimeUTCInSeconds = DRAW_TIME_UTC * 3600; // Convertir a segundos
    
    console.log("📝 Parámetros del constructor:");
    console.log("  - usdcToken:", USDC_ADDRESS);
    console.log("  - subscriptionId:", SUBSCRIPTION_ID);
    console.log("  - drawTimeUTC:", drawTimeUTCInSeconds, "(", DRAW_TIME_UTC, "horas)");
    
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
        const ticketPrice = await contract.TICKET_PRICE();
        const drawTimeUTC = await contract.drawTimeUTC();
        const currentGameDay = await contract.getCurrentDay();
        const subscriptionId = await contract.subscriptionId();
        const usdcToken = await contract.usdcToken();
        
        console.log("✅ gameActive:", gameActive);
        console.log("✅ TICKET_PRICE:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("✅ drawTimeUTC:", Number(drawTimeUTC) / 3600, "horas");
        console.log("✅ getCurrentDay:", currentGameDay.toString());
        console.log("✅ subscriptionId:", subscriptionId.toString());
        console.log("✅ usdcToken:", usdcToken);
        
        // Verificar pools iniciales
        const mainPools = await contract.getMainPoolBalances();
        const reserves = await contract.getReserveBalances();
        
        console.log("\n💰 POOLS INICIALES:");
        console.log("Main Pools:");
        console.log("  - First:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
        console.log("  - Second:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
        console.log("  - Third:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
        console.log("  - Development:", ethers.formatUnits(mainPools.developmentAccumulated, 6), "USDC");
        
        console.log("Reserve Pools:");
        console.log("  - First Reserve:", ethers.formatUnits(reserves.firstPrizeReserve, 6), "USDC");
        console.log("  - Second Reserve:", ethers.formatUnits(reserves.secondPrizeReserve, 6), "USDC");
        console.log("  - Third Reserve:", ethers.formatUnits(reserves.thirdPrizeReserve, 6), "USDC");
        
        // Verificar constantes importantes
        const vrfCoordinator = await contract.i_vrfCoordinator();
        console.log("\n🔗 CHAINLINK CONFIGURACIÓN:");
        console.log("✅ VRF Coordinator (hardcoded):", vrfCoordinator);
        console.log("✅ Key Hash (hardcoded): Avalanche Fuji 300 gwei");
        
    } catch (error) {
        console.error("❌ Error en verificación:", error.message);
        throw error;
    }
    
    console.log("\n⚠️ IMPORTANTE - ANTES DE USAR:");
    console.log("=".repeat(50));
    console.log("1. 🔄 Crear suscripción VRF en https://vrf.chain.link/");
    console.log("   - Seleccionar Avalanche Fuji");
    console.log("   - Fondear con LINK tokens de Fuji");
    console.log("   - Agregar el contrato como consumer");
    console.log("2. 🔄 Actualizar SUBSCRIPTION_ID en .env");
    console.log("3. 🔄 Obtener USDC de Fuji para pruebas:");
    console.log("   - Usar Circle's faucet o intercambio");
    console.log("4. 🔄 Configurar Chainlink Automation (opcional)");
    
    // Información para el frontend
    console.log("\n📱 INFORMACIÓN PARA EL FRONTEND:");
    console.log("=".repeat(50));
    console.log("CONTRACT_ADDRESS =", `"${contractAddress}"`);
    console.log("NETWORK = Avalanche Fuji");
    console.log("CHAIN_ID = 43113");
    console.log("RPC_URL = https://api.avax-test.network/ext/bc/C/rpc");
    console.log("EXPLORER = https://testnet.snowtrace.io");
    console.log("USDC_ADDRESS =", `"${USDC_ADDRESS}"`);
    console.log("SUBSCRIPTION_ID =", `"${SUBSCRIPTION_ID}"`);
    
    // Comandos útiles
    console.log("\n📋 COMANDOS ÚTILES:");
    console.log("=".repeat(30));
    console.log("# Verificar contrato:");
    console.log(`npx hardhat verify --network avalanche-fuji ${contractAddress} "${USDC_ADDRESS}" "${SUBSCRIPTION_ID}" "${drawTimeUTCInSeconds}"`);
    console.log("");
    console.log("# Obtener AVAX de faucet:");
    console.log("https://faucets.chain.link/fuji");
    console.log("");
    console.log("# Obtener LINK tokens:");
    console.log("https://faucets.chain.link/fuji");
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT EN AVALANCHE FUJI COMPLETADO");
    console.log("📍 Dirección del contrato:", contractAddress);
    console.log("🔗 Explorador: https://testnet.snowtrace.io/address/" + contractAddress);
    console.log("=".repeat(60));
    
    return {
        contractAddress,
        network: "avalanche-fuji",
        chainId: 43113,
        subscriptionId: SUBSCRIPTION_ID,
        drawTimeUTC: DRAW_TIME_UTC,
        explorerUrl: `https://testnet.snowtrace.io/address/${contractAddress}`
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