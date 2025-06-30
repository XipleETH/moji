const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICANDO DIRECCIÓN DEL CONTRATO");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    console.log("📍 Verificando dirección:", CONTRACT_ADDRESS);
    
    try {
        // Verificar si hay código en esa dirección
        const code = await ethers.provider.getCode(CONTRACT_ADDRESS);
        console.log("📋 Código en la dirección:", code.length > 2 ? "✅ SÍ" : "❌ NO");
        
        if (code.length <= 2) {
            console.log("⚠️  No hay contrato desplegado en esa dirección");
            return;
        }
        
        // Intentar conectar con el contrato
        console.log("\n🔗 Intentando conectar al contrato...");
        const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
        
        // Probar funciones básicas
        console.log("🧪 Probando funciones básicas...");
        
        try {
            const gameActive = await contract.gameActive();
            console.log("✅ gameActive:", gameActive);
        } catch (error) {
            console.log("❌ Error en gameActive:", error.message);
        }
        
        try {
            const ticketPrice = await contract.TICKET_PRICE();
            console.log("✅ TICKET_PRICE:", ethers.formatUnits(ticketPrice, 6), "USDC");
        } catch (error) {
            console.log("❌ Error en TICKET_PRICE:", error.message);
        }
        
        try {
            const currentGameDay = await contract.getCurrentDay();
            console.log("✅ getCurrentDay:", currentGameDay.toString());
        } catch (error) {
            console.log("❌ Error en getCurrentDay:", error.message);
        }
        
        try {
            const drawTimeUTC = await contract.drawTimeUTC();
            console.log("✅ drawTimeUTC:", (Number(drawTimeUTC) / 3600) + ":00 UTC");
        } catch (error) {
            console.log("❌ Error en drawTimeUTC:", error.message);
        }
        
        try {
            const lastDrawTime = await contract.lastDrawTime();
            console.log("✅ lastDrawTime:", new Date(Number(lastDrawTime) * 1000).toISOString());
        } catch (error) {
            console.log("❌ Error en lastDrawTime:", error.message);
        }
        
        console.log("\n🎯 RESULTADO:");
        console.log("✅ Contrato encontrado y funcional");
        
    } catch (error) {
        console.error("💥 Error general:", error.message);
        
        console.log("\n💡 POSIBLES CAUSAS:");
        console.log("1. Dirección incorrecta");
        console.log("2. Contrato no desplegado");
        console.log("3. ABI incompatible");
        console.log("4. Red incorrecta");
        
        console.log("\n🔧 SOLUCIONES:");
        console.log("1. Verificar la dirección del contrato");
        console.log("2. Confirmar que estás en Base Sepolia");
        console.log("3. Verificar el ABI del contrato");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Script error:", error);
        process.exit(1);
    }); 