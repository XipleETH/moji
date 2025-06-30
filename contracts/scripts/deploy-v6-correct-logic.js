const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 DEPLOYING LOTTO MOJI V6 - LÓGICA CORREGIDA");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying con cuenta:", deployer.address);
    
    // Verificar balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
    
    if (balance < ethers.parseEther("0.01")) {
        throw new Error("❌ Balance insuficiente para deployment");
    }
    
    // Configuración para Base Sepolia
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
    const SUBSCRIPTION_ID = "70846359092368923949796315994230469102226608583606291730577230133525692264419";
    const DRAW_TIME_UTC = 20; // 20:00 UTC
    
    console.log("\n📋 CONFIGURACIÓN:");
    console.log("- USDC Address:", USDC_ADDRESS);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Draw Time UTC:", DRAW_TIME_UTC + ":00");
    
    console.log("\n🔧 CAMBIOS EN V6:");
    console.log("✅ Lógica de ganadores corregida:");
    console.log("   🥇 Primer Premio: 4 emojis posición exacta");
    console.log("   🥈 Segundo Premio: 4 emojis cualquier orden");
    console.log("   🥉 Tercer Premio: 3 emojis posición exacta");
    console.log("   🎫 Tickets Gratis: 3 emojis cualquier orden");
    console.log("✅ Sorteo para día ACTUAL (no día anterior)");
    console.log("✅ Distribución de pools corregida");
    
    // Deploy del contrato
    console.log("\n🚀 Deployando contrato...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    const drawTimeUTCInSeconds = DRAW_TIME_UTC * 3600; // Convertir a segundos
    
    const contract = await LottoMojiCore.deploy(
        USDC_ADDRESS,
        SUBSCRIPTION_ID,
        drawTimeUTCInSeconds
    );
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log("✅ Contrato deployado en:", contractAddress);
    
    // Verificar deployment
    console.log("\n🔍 VERIFICANDO DEPLOYMENT:");
    console.log("=".repeat(40));
    
    try {
        const gameActive = await contract.gameActive();
        const ticketPrice = await contract.TICKET_PRICE();
        const drawTimeUTC = await contract.drawTimeUTC();
        const currentGameDay = await contract.getCurrentDay();
        const subscriptionId = await contract.subscriptionId();
        
        console.log("✅ gameActive:", gameActive);
        console.log("✅ TICKET_PRICE:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("✅ drawTimeUTC:", Number(drawTimeUTC) / 3600, "horas");
        console.log("✅ getCurrentDay:", currentGameDay.toString());
        console.log("✅ subscriptionId:", subscriptionId.toString());
        
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
        
    } catch (error) {
        console.error("❌ Error en verificación:", error.message);
    }
    
    // Información para el frontend
    console.log("\n📱 INFORMACIÓN PARA EL FRONTEND:");
    console.log("=".repeat(50));
    console.log("CONTRACT_ADDRESS =", `"${contractAddress}"`);
    console.log("NETWORK = Base Sepolia");
    console.log("SUBSCRIPTION_ID =", `"${SUBSCRIPTION_ID}"`);
    
    // Próximos pasos
    console.log("\n📋 PRÓXIMOS PASOS:");
    console.log("=".repeat(30));
    console.log("1. ✅ Contrato deployado exitosamente");
    console.log("2. 🔄 Agregar contrato como consumer en Chainlink VRF");
    console.log("3. 🔄 Configurar Chainlink Automation para el nuevo contrato");
    console.log("4. 🔄 Actualizar dirección en el frontend");
    console.log("5. 🔄 Probar compra de tickets y sorteo");
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT V6 COMPLETADO EXITOSAMENTE");
    console.log("📍 Dirección del contrato:", contractAddress);
    console.log("=".repeat(60));
    
    return {
        contractAddress,
        subscriptionId: SUBSCRIPTION_ID,
        drawTimeUTC: DRAW_TIME_UTC
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