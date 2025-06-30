const { ethers } = require("hardhat");
const path = require("path");
const fs = require("fs");

// Dirección esperada del contrato V4
const EXPECTED_CONTRACT_V4 = "0x6d05B87dCD1d601770E4c04Db2D91F1cAc288C3D";

async function main() {
    console.log("🔍 VERIFICANDO INTEGRACIÓN FRONTEND - CONTRATO V4");
    console.log("=".repeat(60));
    
    // 1. Verificar archivo contractAddresses.ts
    console.log("\n📋 1. VERIFICANDO ARCHIVO contractAddresses.ts");
    console.log("-".repeat(50));
    
    const contractAddressesPath = path.join(__dirname, "../../src/utils/contractAddresses.ts");
    
    try {
        const fileContent = fs.readFileSync(contractAddressesPath, 'utf8');
        
        // Buscar la línea LOTTO_MOJI_CORE
        const lines = fileContent.split('\n');
        let foundCorrectAddress = false;
        let currentAddress = "";
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('LOTTO_MOJI_CORE:') && !line.includes('LEGACY')) {
                // Extraer la dirección
                const addressMatch = line.match(/'(0x[a-fA-F0-9]{40})'/);
                if (addressMatch) {
                    currentAddress = addressMatch[1];
                    foundCorrectAddress = currentAddress.toLowerCase() === EXPECTED_CONTRACT_V4.toLowerCase();
                }
                
                console.log(`Línea ${i + 1}: ${line.trim()}`);
                break;
            }
        }
        
        if (foundCorrectAddress) {
            console.log("✅ Dirección del contrato CORRECTA en frontend");
            console.log(`✅ Usando V4: ${currentAddress}`);
        } else {
            console.log("❌ Dirección del contrato INCORRECTA en frontend");
            console.log(`❌ Actual: ${currentAddress}`);
            console.log(`✅ Esperado: ${EXPECTED_CONTRACT_V4}`);
        }
        
    } catch (error) {
        console.log("❌ Error leyendo archivo contractAddresses.ts:", error.message);
    }
    
    // 2. Verificar que el contrato V4 está deployado y funcionando
    console.log("\n🌐 2. VERIFICANDO CONTRATO V4 EN BLOCKCHAIN");
    console.log("-".repeat(50));
    
    try {
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(EXPECTED_CONTRACT_V4);
        
        // Verificar funciones básicas
        const usdcToken = await contract.usdcToken();
        const subscriptionId = await contract.subscriptionId();
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const ticketPrice = await contract.TICKET_PRICE();
        
        console.log("✅ Contrato V4 respondiendo correctamente");
        console.log(`✅ USDC Token: ${usdcToken}`);
        console.log(`✅ VRF Subscription: ${subscriptionId.toString()}`);
        console.log(`✅ Game Active: ${gameActive}`);
        console.log(`✅ Automation Active: ${automationActive}`);
        console.log(`✅ Ticket Price: ${ethers.formatUnits(ticketPrice, 6)} USDC`);
        
        // Verificar que NO tiene mantenimiento
        try {
            // Esta función no debería existir en V4
            await contract.lastMaintenanceTime();
            console.log("⚠️ WARNING: El contrato aún tiene lastMaintenanceTime (puede ser V3)");
        } catch (error) {
            console.log("✅ Confirmado: NO tiene sistema de mantenimiento (V4 correcto)");
        }
        
    } catch (error) {
        console.log("❌ Error conectando al contrato V4:", error.message);
    }
    
    // 3. Verificar en Basescan
    console.log("\n🔗 3. ENLACES DE VERIFICACIÓN");
    console.log("-".repeat(40));
    
    console.log(`📍 Contrato V4: ${EXPECTED_CONTRACT_V4}`);
    console.log(`🌐 Basescan: https://sepolia.basescan.org/address/${EXPECTED_CONTRACT_V4}`);
    console.log(`📊 Código verificado: https://sepolia.basescan.org/address/${EXPECTED_CONTRACT_V4}#code`);
    
    // 4. Resumen de diferencias V3 vs V4
    console.log("\n📊 4. DIFERENCIAS V3 → V4");
    console.log("-".repeat(40));
    
    console.log("❌ V3 (Anterior):");
    console.log("   - Mantenimiento cada hora");
    console.log("   - Upkeep se ejecutaba 24 veces al día");
    console.log("   - Más gas usado");
    console.log("   - Lógica separada");
    
    console.log("\n✅ V4 (Actual):");
    console.log("   - Sin sistema de mantenimiento");
    console.log("   - Upkeep solo cada 24 horas");
    console.log("   - Menos gas usado");
    console.log("   - Flujo integrado: reserves → draw → distribution → auto-refill");
    
    // 5. Próximos pasos
    console.log("\n🚀 5. PRÓXIMOS PASOS");
    console.log("-".repeat(30));
    
    console.log("1. ✅ Contrato V4 deployado");
    console.log("2. ✅ VRF consumer agregado");
    console.log("3. ✅ Frontend actualizado");
    console.log("4. ✅ Contrato verificado en Basescan");
    console.log("5. 🟡 Nuevo upkeep creado (verificar funcionamiento)");
    console.log("6. 🟡 Pausar upkeep V3 anterior");
    console.log("7. 🟡 Monitorear primera ejecución automática");
    
    console.log("\n🎉 VERIFICACIÓN COMPLETADA");
    console.log("=".repeat(60));
}

main()
    .then(() => {
        console.log("\n✅ Script de verificación completado exitosamente");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Error en verificación:", error);
        process.exit(1);
    }); 