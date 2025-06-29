const { ethers } = require("hardhat");

async function main() {
    console.log("⛽ CALCULAR GAS LIMIT ÓPTIMO PARA VRF CALLBACK");
    console.log("=".repeat(60));
    
    console.log("🎯 Objetivo: Soportar hasta 10,000+ tickets");
    console.log("🔍 Analizando diferentes escenarios...\n");
    
    // Parámetros base
    const BASE_GAS = 1000000;      // Gas base de la función
    const VRF_GAS = 500000;        // Gas del procesamiento VRF
    const SAFETY_MARGIN = 1.2;    // 20% margen de seguridad
    
    // Diferentes estimaciones de gas por ticket
    const gasPerTicketScenarios = [
        { name: "Optimista", gasPerTicket: 2000 },
        { name: "Conservador", gasPerTicket: 3000 },
        { name: "Pesimista", gasPerTicket: 5000 }
    ];
    
    console.log("📊 ESCENARIOS DE GAS POR TICKET:");
    console.log("-".repeat(40));
    
    function calculateGas(tickets, gasPerTicket) {
        return Math.floor((tickets * gasPerTicket + BASE_GAS + VRF_GAS) * SAFETY_MARGIN);
    }
    
    function formatGas(gas) {
        return (gas / 1000000).toFixed(1) + "M";
    }
    
    // Cantidades de tickets a analizar
    const ticketCounts = [666, 1000, 2500, 5000, 7500, 10000, 15000, 20000];
    
    for (const scenario of gasPerTicketScenarios) {
        console.log(`\n${scenario.name.toUpperCase()} (${scenario.gasPerTicket} gas/ticket):`);
        console.log("🎫 Tickets     ⛽ Gas Necesario    🚫 ¿Factible?");
        console.log("-".repeat(50));
        
        for (const tickets of ticketCounts) {
            const gasNeeded = calculateGas(tickets, scenario.gasPerTicket);
            const feasible = gasNeeded <= 30000000 ? "✅ SÍ" : "❌ NO";
            const gasFormatted = formatGas(gasNeeded);
            
            console.log(`${tickets.toString().padStart(6)}     ${gasFormatted.padStart(8)}           ${feasible}`);
        }
    }
    
    // Límites de gas por red
    console.log("\n🌐 LÍMITES DE GAS POR RED:");
    console.log("-".repeat(35));
    console.log("• Ethereum Mainnet: ~30M gas/bloque");
    console.log("• Base Sepolia: ~30M gas/bloque");
    console.log("• Avalanche Fuji: ~15M gas/bloque");
    console.log("• Polygon: ~30M gas/bloque");
    
    // Recomendaciones específicas
    console.log("\n🎯 RECOMENDACIONES POR OBJETIVO:");
    console.log("-".repeat(45));
    
    const recommendations = [
        {
            target: "1,000 tickets",
            gasLimit: "10M",
            value: 10000000,
            description: "Seguro para todas las redes"
        },
        {
            target: "5,000 tickets", 
            gasLimit: "20M",
            value: 20000000,
            description: "Funciona en Ethereum/Base, límite en Avalanche"
        },
        {
            target: "10,000 tickets",
            gasLimit: "30M", 
            value: 30000000,
            description: "Máximo en Ethereum/Base, NO para Avalanche"
        },
        {
            target: "15,000+ tickets",
            gasLimit: "Requiere optimización",
            value: 0,
            description: "Necesita procesamiento por lotes"
        }
    ];
    
    for (const rec of recommendations) {
        console.log(`\n${rec.target}:`);
        console.log(`   ⛽ Gas Limit: ${rec.gasLimit}`);
        console.log(`   📋 ${rec.description}`);
    }
    
    // Cálculo específico para 10,000 tickets
    console.log("\n🔢 CÁLCULO ESPECÍFICO PARA 10,000 TICKETS:");
    console.log("-".repeat(50));
    
    const target10k = 10000;
    console.log(`🎫 Tickets objetivo: ${target10k.toLocaleString()}`);
    
    for (const scenario of gasPerTicketScenarios) {
        const gasNeeded = calculateGas(target10k, scenario.gasPerTicket);
        console.log(`\n${scenario.name}:`);
        console.log(`   ⛽ Gas por ticket: ${scenario.gasPerTicket.toLocaleString()}`);
        console.log(`   ⛽ Gas total: ${gasNeeded.toLocaleString()}`);
        console.log(`   ⛽ Gas formatted: ${formatGas(gasNeeded)}`);
        
        if (gasNeeded <= 15000000) {
            console.log(`   ✅ Funciona en TODAS las redes`);
        } else if (gasNeeded <= 30000000) {
            console.log(`   ⚠️ Solo Ethereum/Base (NO Avalanche)`);
        } else {
            console.log(`   ❌ Excede límites de todas las redes`);
        }
    }
    
    // Recomendación final
    console.log("\n🏆 RECOMENDACIÓN FINAL:");
    console.log("-".repeat(30));
    
    console.log("Para soportar 10,000+ tickets de forma segura:");
    console.log("");
    console.log("🎯 OPCIÓN 1 - CONSERVADOR:");
    console.log("   uint32 constant CALLBACK_GAS_LIMIT = 25000000;");
    console.log("   ✅ Soporta ~7,500 tickets seguramente");
    console.log("   ✅ Funciona en la mayoría de redes");
    console.log("");
    console.log("🎯 OPCIÓN 2 - AGRESIVO:");
    console.log("   uint32 constant CALLBACK_GAS_LIMIT = 30000000;");
    console.log("   ✅ Soporta ~10,000 tickets");
    console.log("   ⚠️ Solo para Ethereum/Base (NO Avalanche)");
    console.log("");
    console.log("🎯 OPCIÓN 3 - MÁXIMO:");
    console.log("   uint32 constant CALLBACK_GAS_LIMIT = 25000000;");
    console.log("   + Implementar procesamiento por lotes");
    console.log("   ✅ Soporta tickets ilimitados");
    console.log("   ✅ Funciona en todas las redes");
    
    // Código para el contrato
    console.log("\n💻 CÓDIGO PARA EL CONTRATO:");
    console.log("-".repeat(35));
    console.log("// Para 10,000 tickets en Ethereum/Base:");
    console.log("uint32 constant CALLBACK_GAS_LIMIT = 30000000;");
    console.log("");
    console.log("// Para compatibilidad universal (7,500 tickets):");
    console.log("uint32 constant CALLBACK_GAS_LIMIT = 25000000;");
    console.log("");
    console.log("// Para pruebas iniciales (5,000 tickets):");
    console.log("uint32 constant CALLBACK_GAS_LIMIT = 20000000;");
    
    console.log("\n⚠️ CONSIDERACIONES IMPORTANTES:");
    console.log("-".repeat(40));
    console.log("1. 💰 Más gas = mayor costo de VRF subscription");
    console.log("2. 🔗 Verificar límites específicos de cada red");
    console.log("3. 🧪 Probar siempre en testnet primero");
    console.log("4. 📊 Monitorear gas real usado vs estimado");
    console.log("5. 🔄 Considerar upgrade pattern para ajustes futuros");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 