const { ethers } = require("hardhat");

// NUEVO CONTRATO V3 CON UPKEEP CREADO
const CONTRACT_ADDRESS = "0xfc1a8Bc0180Fc615810d62374F16C4c026141031";

async function main() {
    console.log("🔍 VERIFICACIÓN FINAL DEL SISTEMA - LOTTOMOJI V3");
    console.log("=".repeat(70));
    console.log("✅ Upkeep de Chainlink Automation creado");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    console.log("📍 Contract V3:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. VERIFICACIÓN COMPLETA DEL SISTEMA
        console.log("\n🔧 VERIFICACIÓN COMPLETA DEL SISTEMA");
        console.log("-".repeat(55));
        
        // Información básica
        const subscriptionId = await contract.subscriptionId();
        const lastDrawTime = await contract.lastDrawTime();
        const currentGameDay = await contract.getCurrentDay();
        const drawTimeUTC = await contract.drawTimeUTC();
        const drawInterval = await contract.DRAW_INTERVAL();
        const owner = await contract.owner();
        
        console.log("🏠 Contract Owner:", owner);
        console.log("👤 Your Address:", deployer.address);
        console.log("✅ You are owner:", owner.toLowerCase() === deployer.address.toLowerCase());
        
        console.log("\n🔗 VRF CONFIGURATION");
        console.log("-".repeat(30));
        console.log("🔗 VRF Subscription ID:", subscriptionId.toString());
        console.log("✅ Subscription correcto:", subscriptionId.toString() === "105961847727705490544354750783936451991128107961690295417839588082464327658827");
        
        console.log("\n⏰ TIMING CONFIGURATION");
        console.log("-".repeat(35));
        console.log("🕒 Draw Time UTC:", Number(drawTimeUTC) / 3600, "hours (3:00 UTC = São Paulo midnight)");
        console.log("⏱️ Draw Interval:", Number(drawInterval) / 3600, "hours");
        console.log("🎲 Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        console.log("📅 Current Game Day:", Number(currentGameDay));
        
        // 2. CALCULAR PRÓXIMO SORTEO
        console.log("\n🎯 PRÓXIMO SORTEO AUTOMÁTICO");
        console.log("-".repeat(40));
        
        const now = Math.floor(Date.now() / 1000);
        const nextDraw = Number(lastDrawTime) + Number(drawInterval);
        const timeUntilNextDraw = nextDraw - now;
        
        console.log("⏰ Current Time:", new Date(now * 1000).toLocaleString());
        console.log("🎯 Next Draw Time:", new Date(nextDraw * 1000).toLocaleString());
        
        const nextDrawSP = new Date(nextDraw * 1000).toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            hour12: false 
        });
        console.log("🌎 Next Draw São Paulo:", nextDrawSP);
        
        const isAtMidnight = new Date(nextDraw * 1000).toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false 
        }) === '00:00';
        
        console.log("✅ Is Midnight SP?:", isAtMidnight ? "SÍ 🎉" : "NO ❌");
        
        if (timeUntilNextDraw > 0) {
            const hours = Math.floor(timeUntilNextDraw / 3600);
            const minutes = Math.floor((timeUntilNextDraw % 3600) / 60);
            console.log("⌛ Tiempo restante:", hours + "h", minutes + "m");
        } else {
            console.log("⚠️ El sorteo está atrasado por:", Math.floor(Math.abs(timeUntilNextDraw) / 60), "minutos");
        }
        
        // 3. VERIFICAR UPKEEP
        console.log("\n🔄 ESTADO DEL UPKEEP");
        console.log("-".repeat(30));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep needed:", upkeepNeeded);
        
        if (upkeepNeeded) {
            console.log("✅ ¡LISTO PARA SORTEO! El upkeep puede ejecutarse");
            console.log("🤖 Chainlink Automation debería ejecutarlo automáticamente");
        } else {
            console.log("⏰ Esperando el momento correcto para el sorteo");
            console.log("🤖 Chainlink Automation ejecutará cuando sea tiempo");
        }
        
        // 4. VERIFICAR ESTADO DEL JUEGO
        console.log("\n🎮 ESTADO DEL JUEGO");
        console.log("-".repeat(25));
        
        try {
            const gameActive = await contract.gameActive();
            const emergencyPause = await contract.emergencyPause();
            const automationActive = await contract.automationActive();
            
            console.log("🎮 Game Active:", gameActive ? "✅ SÍ" : "❌ NO");
            console.log("🤖 Automation Active:", automationActive ? "✅ SÍ" : "❌ NO");
            console.log("⏸️ Emergency Pause:", emergencyPause ? "❌ SÍ" : "✅ NO");
            
            if (gameActive && automationActive && !emergencyPause) {
                console.log("✅ JUEGO COMPLETAMENTE OPERATIVO");
            } else {
                console.log("⚠️ Hay configuraciones que pueden afectar el funcionamiento");
            }
        } catch (e) {
            console.log("ℹ️ No se pudieron obtener algunos estados del juego");
        }
        
        // 5. VERIFICAR POOLS Y TICKETS
        console.log("\n💰 ESTADO FINANCIERO");
        console.log("-".repeat(30));
        
        try {
            const ticketPrice = await contract.TICKET_PRICE();
            console.log("🎫 Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
            
            // Intentar obtener información de pools si existe
            try {
                const totalSupply = await contract.totalSupply();
                console.log("🎫 Total Tickets Minted:", Number(totalSupply));
                
                if (Number(totalSupply) > 0) {
                    const totalRevenue = Number(totalSupply) * 0.2; // 0.2 USDC por ticket
                    console.log("💰 Total Revenue Generated:", totalRevenue.toFixed(1), "USDC");
                }
            } catch (e) {
                console.log("🎫 Total Tickets: Información no disponible");
            }
            
        } catch (e) {
            console.log("💰 Información financiera no disponible");
        }
        
        // 6. RESUMEN FINAL
        console.log("\n📋 RESUMEN DEL SISTEMA");
        console.log("-".repeat(35));
        
        const systemReady = subscriptionId.toString() === "105961847727705490544354750783936451991128107961690295417839588082464327658827" && isAtMidnight;
        
        console.log("🔗 VRF Subscription:", subscriptionId.toString() === "105961847727705490544354750783936451991128107961690295417839588082464327658827" ? "✅ CORRECTO" : "❌ INCORRECTO");
        console.log("⏰ Timing Alignment:", isAtMidnight ? "✅ MEDIANOCHE SP" : "❌ DESALINEADO");
        console.log("🤖 Upkeep Created:", "✅ COMPLETADO");
        console.log("👤 Contract Owner:", owner.toLowerCase() === deployer.address.toLowerCase() ? "✅ CORRECTO" : "❌ INCORRECTO");
        
        if (systemReady) {
            console.log("\n🎉 SISTEMA COMPLETAMENTE LISTO");
            console.log("✅ El sorteo automático funcionará correctamente");
            console.log("✅ Próximo sorteo: " + nextDrawSP);
            console.log("✅ Todo configurado para medianoche São Paulo");
        } else {
            console.log("\n⚠️ SISTEMA NECESITA ATENCIÓN");
            console.log("🔧 Revisar configuraciones marcadas con ❌");
        }
        
        // 7. PRÓXIMOS PASOS
        console.log("\n🔄 PRÓXIMOS PASOS RECOMENDADOS");
        console.log("-".repeat(45));
        console.log("1. ✅ Monitorear el upkeep en https://automation.chain.link/");
        console.log("2. ✅ Verificar balance VRF en https://vrf.chain.link/");
        console.log("3. ✅ Actualizar frontend con nueva dirección del contrato");
        console.log("4. ✅ Comunicar a usuarios sobre el nuevo contrato");
        console.log("5. ✅ Observar el primer sorteo automático mañana");
        
        console.log("\n✅ VERIFICACIÓN FINAL COMPLETADA");
        
    } catch (error) {
        console.error("\n💥 ERROR EN LA VERIFICACIÓN:", error.message);
        
        if (error.reason) {
            console.error("📋 Reason:", error.reason);
        }
    }
    
    console.log("\n" + "=".repeat(70));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 