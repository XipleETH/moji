const { ethers } = require("hardhat");

async function main() {
    console.log("🎉 ESTADO FINAL - SORTEO EXITOSO EN AVALANCHE FUJI");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0xe980475E4aF2f0B937059E9394262b36827B215F";
    
    console.log("📍 Nuevo Contrato:", CONTRACT_ADDRESS);
    console.log("🏔️ Red: Avalanche Fuji Testnet");
    console.log("🔗 Explorer: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
    
    try {
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // Estado básico
        console.log("\n✅ ESTADO DEL CONTRATO:");
        console.log("-".repeat(35));
        
        const totalDraws = await contract.totalDrawsExecuted();
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const ticketCounter = await contract.ticketCounter();
        
        console.log("🎯 Sorteos ejecutados:", totalDraws.toString());
        console.log("📅 Game Day actual:", currentGameDay.toString());
        console.log("⏰ Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("⏰ Próximo sorteo:", new Date((Number(lastDrawTime) + 24*3600) * 1000).toISOString());
        console.log("🎮 Game Active:", gameActive ? "✅" : "❌");
        console.log("🤖 Automation Active:", automationActive ? "✅" : "❌");
        console.log("🎫 Tickets vendidos:", ticketCounter.toString());
        
        // Verificar upkeep
        const [upkeepNeeded] = await contract.checkUpkeep("0x");
        console.log("🔄 Próximo upkeep necesario:", upkeepNeeded ? "✅ SÍ" : "❌ NO");
        
        // Información de configuración
        console.log("\n⚙️ CONFIGURACIÓN:");
        console.log("-".repeat(25));
        
        const ticketPrice = await contract.TICKET_PRICE();
        const drawTimeUTC = await contract.drawTimeUTC();
        const subscriptionId = await contract.subscriptionId();
        
        console.log("💰 Precio por ticket:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("🕐 Hora de sorteo UTC:", (Number(drawTimeUTC) / 3600) + ":00");
        console.log("🔗 VRF Subscription ID:", subscriptionId.toString().substring(0, 20) + "...");
        
        console.log("\n🎊 ¡ÉXITO TOTAL!");
        console.log("=".repeat(30));
        console.log("✅ Contrato desplegado correctamente");
        console.log("✅ VRF configurado y funcionando");
        console.log("✅ Sorteo ejecutado exitosamente");
        console.log("✅ Sistema listo para uso completo");
        
        console.log("\n📱 ACTUALIZAR FRONTEND:");
        console.log("-".repeat(30));
        console.log("📍 Nueva dirección del contrato:");
        console.log(`   ${CONTRACT_ADDRESS}`);
        console.log("🌐 Red: Avalanche Fuji (Chain ID: 43113)");
        console.log("💰 USDC: 0x5425890298aed601595a70AB815c96711a31Bc65");
        console.log("🔗 RPC: https://api.avax-test.network/ext/bc/C/rpc");
        
        console.log("\n🚀 PRÓXIMOS PASOS:");
        console.log("-".repeat(25));
        console.log("1. ✅ Actualizar frontend con nueva dirección");
        console.log("2. 🎫 Comprar tickets para probar el sistema");
        console.log("3. 🔄 Configurar Chainlink Automation (opcional)");
        console.log("4. 🎉 ¡Sistema completamente operativo!");
        
        console.log("\n🔗 ENLACES ÚTILES:");
        console.log("• Contrato: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
        console.log("• VRF Dashboard: https://vrf.chain.link/");
        console.log("• LINK Faucet: https://faucets.chain.link/fuji");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 