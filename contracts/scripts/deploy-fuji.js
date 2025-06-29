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
    
    // Subscription ID para Avalanche Fuji
    const SUBSCRIPTION_ID = process.env.AVALANCHE_FUJI_SUBSCRIPTION_ID || "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    const DRAW_TIME_UTC = 4; // 4:00 UTC para sorteos diarios
    
    // Configurar para que el primer sorteo sea hoy 29 junio a las 4:00 UTC
    // Necesitamos que lastDrawTime sea 28 junio 2024 a las 4:00 UTC
    const lastDrawTimestamp = Math.floor(new Date('2024-06-28T04:00:00.000Z').getTime() / 1000);
    
    console.log("\n📋 CONFIGURACIÓN AVALANCHE FUJI:");
    console.log("- Network: Avalanche Fuji Testnet (Chain ID: 43113)");
    console.log("- USDC Address:", USDC_ADDRESS);
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    console.log("- LINK Token:", LINK_TOKEN);
    console.log("- Key Hash:", KEY_HASH);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Draw Time UTC:", DRAW_TIME_UTC + ":00");
    console.log("- Explorer: https://testnet.snowtrace.io");
    console.log("- Last Draw Time será:", new Date(lastDrawTimestamp * 1000).toISOString());
    console.log("- Primer sorteo será:", new Date((lastDrawTimestamp + 24*3600) * 1000).toISOString());
    
    // Deploy del contrato
    console.log("\n🚀 Deployando contrato...");
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    const drawTimeUTCInSeconds = DRAW_TIME_UTC * 3600;
    
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
        
        console.log("✅ gameActive:", gameActive);
        console.log("✅ TICKET_PRICE:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("✅ drawTimeUTC:", Number(drawTimeUTC) / 3600, "horas");
        console.log("✅ getCurrentDay:", currentGameDay.toString());
        console.log("✅ subscriptionId:", subscriptionId.toString());
        
        // Configurar el lastDrawTime para que el primer sorteo sea hoy a las 4 UTC
        console.log("\n⚙️ CONFIGURANDO ÚLTIMO SORTEO...");
        const setDrawTimeTx = await contract.setLastDrawTime(lastDrawTimestamp);
        await setDrawTimeTx.wait();
        console.log("✅ LastDrawTime configurado a:", new Date(lastDrawTimestamp * 1000).toISOString());
        
        // Verificar la nueva configuración
        const newCurrentGameDay = await contract.getCurrentDay();
        console.log("✅ Nuevo getCurrentDay:", newCurrentGameDay.toString());
        console.log("🎯 Próximo sorteo:", new Date((lastDrawTimestamp + 24*3600) * 1000).toISOString());
        
    } catch (error) {
        console.error("❌ Error en verificación:", error.message);
    }
    
    console.log("\n⚠️ PRÓXIMOS PASOS:");
    console.log("=".repeat(30));
    console.log("1. ✅ Contrato desplegado y configurado");
    console.log("2. ✅ Timing configurado para sorteo a las 4:00 UTC");
    console.log("3. 🔄 Agregar contrato como consumer en VRF subscription");
    console.log("4. 🔄 Fondear la subscription con LINK tokens");
    console.log("5. 🔄 Configurar Chainlink Automation (opcional)");
    
    console.log("\n📱 INFORMACIÓN PARA EL FRONTEND:");
    console.log("CONTRACT_ADDRESS =", `"${contractAddress}"`);
    console.log("NETWORK = Avalanche Fuji");
    console.log("CHAIN_ID = 43113");
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT EN AVALANCHE FUJI COMPLETADO");
    console.log("📍 Dirección del contrato:", contractAddress);
    console.log("=".repeat(60));
    
    return {
        contractAddress,
        network: "avalanche-fuji",
        chainId: 43113,
        subscriptionId: SUBSCRIPTION_ID,
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