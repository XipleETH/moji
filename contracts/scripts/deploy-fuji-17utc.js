const { ethers } = require("hardhat");

async function main() {
    console.log("🏔️ DEPLOYING LOTTO MOJI EN AVALANCHE FUJI TESTNET - 17 UTC CONFIG");
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
    const DRAW_TIME_UTC = 17; // 17:00 UTC para sorteos diarios
    
    // Último sorteo: 28 junio 2024 a las 17:00 UTC
    const lastDrawTimestamp = Math.floor(new Date('2024-06-28T17:00:00.000Z').getTime() / 1000);
    
    console.log("\n📋 CONFIGURACIÓN AVALANCHE FUJI:");
    console.log("- Network: Avalanche Fuji Testnet (Chain ID: 43113)");
    console.log("- USDC Address:", USDC_ADDRESS);
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Draw Time UTC:", DRAW_TIME_UTC + ":00");
    console.log("- Last Draw Time será:", new Date(lastDrawTimestamp * 1000).toISOString());
    console.log("- Próximo sorteo será:", new Date((lastDrawTimestamp + 24*3600) * 1000).toISOString());
    
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
        
        // Configurar el lastDrawTime
        console.log("\n⚙️ CONFIGURANDO ÚLTIMO SORTEO...");
        const setDrawTimeTx = await contract.setLastDrawTime(lastDrawTimestamp);
        await setDrawTimeTx.wait();
        console.log("✅ LastDrawTime configurado a:", new Date(lastDrawTimestamp * 1000).toISOString());
        
        // Verificar la nueva configuración
        const newCurrentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        console.log("✅ Nuevo getCurrentDay:", newCurrentGameDay.toString());
        console.log("✅ LastDrawTime confirmado:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("🎯 Próximo sorteo será:", new Date((Number(lastDrawTime) + 24*3600) * 1000).toISOString());
        
    } catch (error) {
        console.error("❌ Error en verificación:", error.message);
    }
    
    console.log("\n⚠️ PRÓXIMOS PASOS:");
    console.log("=".repeat(30));
    console.log("1. ✅ Contrato desplegado y configurado");
    console.log("2. ✅ Timing configurado para sorteo a las 17:00 UTC");
    console.log("3. ✅ Subscription ID configurado:", SUBSCRIPTION_ID);
    console.log("4. 🔄 Agregar contrato como consumer en VRF subscription");
    console.log("5. 🔄 Verificar que la subscription tenga fondos LINK");
    console.log("6. 🔄 Configurar Chainlink Automation si necesario");
    
    console.log("\n📱 INFORMACIÓN PARA EL FRONTEND:");
    console.log("CONTRACT_ADDRESS =", `"${contractAddress}"`);
    console.log("NETWORK = Avalanche Fuji");
    console.log("CHAIN_ID = 43113");
    console.log("USDC_ADDRESS =", `"${USDC_ADDRESS}"`);
    
    console.log("\n" + "=".repeat(70));
    console.log("🎉 DEPLOYMENT COMPLETADO - 17 UTC CONFIG");
    console.log("📍 Dirección del contrato:", contractAddress);
    console.log("🕐 Sorteos diarios a las 17:00 UTC");
    console.log("=".repeat(70));
    
    return {
        contractAddress,
        network: "avalanche-fuji",
        chainId: 43113,
        subscriptionId: SUBSCRIPTION_ID,
        drawTimeUTC: DRAW_TIME_UTC,
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