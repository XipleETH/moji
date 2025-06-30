const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 ANALIZAR PROBLEMA VRF CALLBACK - BASE SEPOLIA");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    
    console.log("📍 Contrato Base Sepolia:", CONTRACT_ADDRESS);
    console.log("🔵 Red: Base Sepolia Testnet");
    
    try {
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // 1. Analizar el problema
        console.log("\n🔍 ANÁLISIS DEL PROBLEMA:");
        console.log("-".repeat(35));
        
        const ticketCounter = await contract.ticketCounter();
        const currentGameDay = await contract.getCurrentDay();
        const totalDraws = await contract.totalDrawsExecuted();
        
        console.log("🎫 Tickets vendidos:", ticketCounter.toString());
        console.log("📅 Game Day actual:", currentGameDay.toString());
        console.log("🎯 Sorteos ejecutados:", totalDraws.toString());
        
        // 2. Verificar configuración VRF hardcodeada
        console.log("\n⚙️ CONFIGURACIÓN VRF HARDCODEADA:");
        console.log("-".repeat(45));
        
        console.log("📋 En el contrato LottoMojiCore.sol:");
        console.log("   uint32 constant CALLBACK_GAS_LIMIT = 2500000;");
        console.log("   uint32 constant NUM_WORDS = 4;");
        console.log("   uint16 constant REQUEST_CONFIRMATIONS = 1;");
        
        console.log("\n❌ PROBLEMA IDENTIFICADO:");
        console.log("-".repeat(30));
        console.log("🔥 VRF Callback Gas Limit: 2,500,000");
        console.log("🎫 Tickets a procesar:", ticketCounter.toString());
        console.log("⛽ Gas estimado necesario: ~" + (Number(ticketCounter) * 5000 + 1000000).toLocaleString());
        console.log("💥 Resultado: GAS INSUFICIENTE en fulfillRandomWords");
        
        // 3. Verificar estado del sorteo actual
        console.log("\n🎲 ESTADO DEL SORTEO ACTUAL:");
        console.log("-".repeat(40));
        
        const dailyPools = await contract.getDailyPoolInfo(currentGameDay);
        console.log("💰 Pool del día:", ethers.formatUnits(dailyPools.totalCollected, 6), "USDC");
        console.log("🎲 Sorteo ejecutado:", dailyPools.drawn ? "✅ SÍ" : "❌ NO");
        console.log("💸 Distribución completada:", dailyPools.distributed ? "✅ SÍ" : "❌ NO");
        
        if (!dailyPools.drawn) {
            console.log("❌ El sorteo NO se completó debido al fallo del VRF callback");
        }
        
        // 4. Transacciones recientes
        console.log("\n📝 TRANSACCIONES RECIENTES:");
        console.log("-".repeat(35));
        console.log("✅ performUpkeep exitoso: 0x87bd6869c552d609aaf2a31ffc714e974071083e3a97bd7f882bb312eb4ebffb");
        console.log("❌ VRF callback falla: 'gas limit set too low'");
        
        // 5. Soluciones posibles
        console.log("\n💡 SOLUCIONES POSIBLES:");
        console.log("-".repeat(30));
        
        console.log("OPCIÓN 1: 🔄 REDESPLEGAR CONTRATO");
        console.log("  ✅ Cambiar CALLBACK_GAS_LIMIT a 8000000");
        console.log("  ✅ Mantener toda la funcionalidad actual");
        console.log("  ❌ Requiere migrar tickets y pools");
        console.log("  ❌ Los usuarios pierden sus tickets actuales");
        
        console.log("\nOPCIÓN 2: 🎲 SORTEO MANUAL (WORKAROUND)");
        console.log("  ✅ Generar números aleatorios externamente");
        console.log("  ✅ Llamar fulfillRandomWords directamente");
        console.log("  ❌ Menos seguro que VRF");
        console.log("  ❌ Requiere función admin especial");
        
        console.log("\nOPCIÓN 3: 📦 PROCESAMIENTO POR LOTES");
        console.log("  ✅ Procesar tickets en grupos pequeños");
        console.log("  ❌ Requiere modificar lógica del contrato");
        console.log("  ❌ Más complejo de implementar");
        
        // 6. Recomendación
        console.log("\n🎯 RECOMENDACIÓN:");
        console.log("-".repeat(25));
        console.log("📋 Para Base Sepolia (testnet):");
        console.log("   1. 🔄 Redesplegar contrato con CALLBACK_GAS_LIMIT = 8000000");
        console.log("   2. 🎫 Los tickets actuales se pueden considerar 'perdidos'");
        console.log("   3. 💰 Esto es aceptable en testnet");
        console.log("   4. ✅ Solución definitiva para el futuro");
        
        console.log("\n📋 Para producción futura:");
        console.log("   1. 🧪 Siempre probar con muchos tickets en testnet");
        console.log("   2. ⛽ Configurar gas limit VRF generosamente");
        console.log("   3. 📊 Monitorear consumo de gas por ticket");
        
        // 7. Cálculo de gas necesario
        console.log("\n⛽ CÁLCULO DE GAS PARA VRF CALLBACK:");
        console.log("-".repeat(50));
        
        const ticketsCount = Number(ticketCounter);
        const gasPerTicket = 5000; // Estimación conservadora
        const baseGas = 1000000; // Gas base para la función
        const vrfGas = 500000; // Gas para VRF interno
        const totalGasNeeded = ticketsCount * gasPerTicket + baseGas + vrfGas;
        
        console.log("🎫 Tickets:", ticketsCount.toLocaleString());
        console.log("⛽ Gas por ticket:", gasPerTicket.toLocaleString());
        console.log("⛽ Gas base:", baseGas.toLocaleString());
        console.log("⛽ Gas VRF:", vrfGas.toLocaleString());
        console.log("⛽ TOTAL NECESARIO:", totalGasNeeded.toLocaleString());
        console.log("⛽ ACTUAL (hardcoded):", "2,500,000");
        console.log("💥 DIFERENCIA:", "+" + (totalGasNeeded - 2500000).toLocaleString());
        
        // 8. Próximos pasos
        console.log("\n🚀 PRÓXIMOS PASOS RECOMENDADOS:");
        console.log("-".repeat(40));
        console.log("1. 🛠️ Modificar contrato LottoMojiCore.sol:");
        console.log("   uint32 constant CALLBACK_GAS_LIMIT = 8000000;");
        console.log("2. 🔄 Redesplegar en Base Sepolia");
        console.log("3. 🧪 Probar con muchos tickets");
        console.log("4. ✅ Confirmar que VRF funciona correctamente");
        console.log("5. 🎯 Aplicar mismo cambio en Avalanche Fuji");
        
        console.log("\n🔗 INFORMACIÓN TÉCNICA:");
        console.log("-".repeat(30));
        console.log("📍 Contrato actual:", CONTRACT_ADDRESS);
        console.log("🎫 Tickets problemáticos:", ticketCounter.toString());
        console.log("⛽ Gas VRF actual: 2,500,000");
        console.log("⛽ Gas VRF necesario: ~" + totalGasNeeded.toLocaleString());
        console.log("🔗 VRF Dashboard: https://vrf.chain.link/");
        
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