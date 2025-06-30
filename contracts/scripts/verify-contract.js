const { run } = require("hardhat");

// NUEVO CONTRATO V3 PARA VERIFICAR
const CONTRACT_ADDRESS = "0xfc1a8Bc0180Fc615810d62374F16C4c026141031";

// Parámetros del constructor
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
const VRF_SUBSCRIPTION_ID = "105961847727705490544354750783936451991128107961690295417839588082464327658827";

async function main() {
    console.log("🔍 VERIFICANDO CONTRATO EN BASESCAN");
    console.log("=".repeat(50));
    
    console.log("📍 Contract Address:", CONTRACT_ADDRESS);
    console.log("🔗 USDC Address:", USDC_ADDRESS);
    console.log("🎲 VRF Subscription ID:", VRF_SUBSCRIPTION_ID);
    console.log("🌐 Network: Base Sepolia");
    
    try {
        console.log("\n⚡ Iniciando verificación...");
        
        await run("verify:verify", {
            address: CONTRACT_ADDRESS,
            constructorArguments: [
                USDC_ADDRESS,
                VRF_SUBSCRIPTION_ID
            ],
            network: "base-sepolia"
        });
        
        console.log("\n✅ CONTRATO VERIFICADO EXITOSAMENTE!");
        console.log("🌐 Visible en: https://sepolia.basescan.org/address/" + CONTRACT_ADDRESS);
        console.log("📋 Los usuarios pueden ver el código fuente completo");
        console.log("🔍 Transparencia completa del contrato");
        
    } catch (error) {
        console.error("\n💥 ERROR EN LA VERIFICACIÓN:", error.message);
        
        if (error.message.includes("Already Verified")) {
            console.log("✅ El contrato ya está verificado!");
            console.log("🌐 Visible en: https://sepolia.basescan.org/address/" + CONTRACT_ADDRESS);
        } else if (error.message.includes("API key")) {
            console.error("🔑 Problema con la API key de BaseScan");
            console.error("💡 Verifica que BASESCAN_API_KEY esté configurada en .env");
        } else if (error.message.includes("Constructor arguments")) {
            console.error("🔧 Problema con los argumentos del constructor");
            console.error("💡 Verificando argumentos...");
            console.error("   USDC Address:", USDC_ADDRESS);
            console.error("   VRF Subscription ID:", VRF_SUBSCRIPTION_ID);
        } else {
            console.error("🔍 Error desconocido. Detalles:");
            console.error(error);
        }
    }
    
    console.log("\n" + "=".repeat(50));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 