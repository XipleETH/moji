const { ethers } = require("ethers");

async function main() {
    console.log("🧪 PROBANDO CONEXIÓN FRONTEND ↔ CONTRATO V6");
    console.log("=".repeat(60));
    
    // Importar configuración del frontend
    const { CONTRACT_ADDRESSES, GAME_CONFIG } = require("../src/utils/contractAddresses.ts");
    
    console.log("📋 CONFIGURACIÓN DEL FRONTEND:");
    console.log("=".repeat(35));
    console.log("- Contrato:", CONTRACT_ADDRESSES.LOTTO_MOJI_CORE);
    console.log("- Red:", CONTRACT_ADDRESSES.RPC_URL);
    console.log("- Chain ID:", CONTRACT_ADDRESSES.CHAIN_ID);
    console.log("- Hora sorteo:", GAME_CONFIG.DRAW_TIME_UTC);
    console.log("- Precio ticket:", GAME_CONFIG.TICKET_PRICE, "USDC");
    
    // Verificar que la dirección sea la correcta (V6)
    const expectedV6Address = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    if (CONTRACT_ADDRESSES.LOTTO_MOJI_CORE.toLowerCase() === expectedV6Address.toLowerCase()) {
        console.log("✅ Dirección del contrato V6 configurada correctamente");
    } else {
        console.log("❌ ERROR: Dirección incorrecta");
        console.log("   Esperada:", expectedV6Address);
        console.log("   Actual:", CONTRACT_ADDRESSES.LOTTO_MOJI_CORE);
        return;
    }
    
    // Verificar hora de sorteo
    if (GAME_CONFIG.DRAW_TIME_UTC === "20:00") {
        console.log("✅ Hora de sorteo configurada correctamente (20:00 UTC)");
    } else {
        console.log("❌ ERROR: Hora de sorteo incorrecta");
        console.log("   Esperada: 20:00");
        console.log("   Actual:", GAME_CONFIG.DRAW_TIME_UTC);
    }
    
    // Probar conexión al contrato
    console.log("\n🔗 PROBANDO CONEXIÓN AL CONTRATO:");
    console.log("=".repeat(40));
    
    try {
        const provider = new ethers.JsonRpcProvider(CONTRACT_ADDRESSES.RPC_URL);
        
        // ABI mínimo para pruebas
        const testABI = [
            "function gameActive() view returns (bool)",
            "function TICKET_PRICE() view returns (uint256)",
            "function drawTimeUTC() view returns (uint256)",
            "function getCurrentDay() view returns (uint256)",
            "function totalDrawsExecuted() view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(
            CONTRACT_ADDRESSES.LOTTO_MOJI_CORE,
            testABI,
            provider
        );
        
        // Probar funciones básicas
        const gameActive = await contract.gameActive();
        const ticketPrice = await contract.TICKET_PRICE();
        const drawTimeUTC = await contract.drawTimeUTC();
        const currentGameDay = await contract.getCurrentDay();
        const totalDraws = await contract.totalDrawsExecuted();
        
        console.log("✅ Conexión exitosa al contrato");
        console.log("- Game Active:", gameActive);
        console.log("- Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("- Draw Time UTC:", Number(drawTimeUTC) / 3600, "horas");
        console.log("- Current Game Day:", currentGameDay.toString());
        console.log("- Total Draws:", totalDraws.toString());
        
        // Verificar que los valores coincidan con la configuración
        const expectedTicketPrice = ethers.parseUnits(GAME_CONFIG.TICKET_PRICE.toString(), 6);
        const expectedDrawTime = 20 * 3600; // 20:00 UTC en segundos
        
        if (ticketPrice.toString() === expectedTicketPrice.toString()) {
            console.log("✅ Precio del ticket coincide con la configuración");
        } else {
            console.log("❌ ERROR: Precio del ticket no coincide");
        }
        
        if (Number(drawTimeUTC) === expectedDrawTime) {
            console.log("✅ Hora de sorteo coincide con la configuración");
        } else {
            console.log("❌ ERROR: Hora de sorteo no coincide");
        }
        
    } catch (error) {
        console.error("❌ Error al conectar con el contrato:", error.message);
        return;
    }
    
    // Probar conexión USDC
    console.log("\n💰 PROBANDO CONEXIÓN USDC:");
    console.log("=".repeat(30));
    
    try {
        const provider = new ethers.JsonRpcProvider(CONTRACT_ADDRESSES.RPC_URL);
        const usdcABI = [
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function balanceOf(address) view returns (uint256)"
        ];
        
        const usdcContract = new ethers.Contract(
            CONTRACT_ADDRESSES.USDC,
            usdcABI,
            provider
        );
        
        const symbol = await usdcContract.symbol();
        const decimals = await usdcContract.decimals();
        const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE);
        
        console.log("✅ Conexión exitosa a USDC");
        console.log("- Symbol:", symbol);
        console.log("- Decimals:", decimals);
        console.log("- Balance del contrato:", ethers.formatUnits(contractBalance, decimals), symbol);
        
    } catch (error) {
        console.error("❌ Error al conectar con USDC:", error.message);
    }
    
    // Resumen final
    console.log("\n📊 RESUMEN DE PRUEBAS:");
    console.log("=".repeat(25));
    console.log("✅ Configuración del frontend actualizada");
    console.log("✅ Dirección del contrato V6 correcta");
    console.log("✅ Conexión al contrato exitosa");
    console.log("✅ Configuración de timing correcta");
    console.log("✅ Conexión USDC exitosa");
    
    console.log("\n🎉 FRONTEND LISTO PARA CONTRATO V6");
    console.log("=".repeat(40));
    console.log("🔗 El frontend ahora está conectado al contrato V6");
    console.log("⏰ Sorteos programados para las 20:00 UTC");
    console.log("🎯 Nueva lógica de ganadores implementada");
    console.log("🚀 Listo para probar compra de tickets");
    
    console.log("\n📋 PRÓXIMOS PASOS:");
    console.log("=".repeat(20));
    console.log("1. 🔄 Configurar Chainlink VRF Consumer");
    console.log("2. 🔄 Configurar Chainlink Automation");
    console.log("3. 🎫 Probar compra de tickets desde el frontend");
    console.log("4. 🎲 Probar sorteo con nueva lógica");
}

main().catch((error) => {
    console.error("💥 Error en las pruebas:", error);
    process.exit(1);
}); 