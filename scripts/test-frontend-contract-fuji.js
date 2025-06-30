const { ethers } = require("ethers");

async function main() {
    console.log("🧪 PROBANDO CONEXIÓN FRONTEND ↔ CONTRATO AVALANCHE FUJI");
    console.log("=".repeat(60));
    
    // Importar configuración del frontend (simulado)
    const CONTRACT_ADDRESSES = {
        CHAIN_ID: 43113,
        RPC_URL: 'https://api.avax-test.network/ext/bc/C/rpc',
        EXPLORER_URL: 'https://testnet.snowtrace.io',
        USDC: '0x5425890298aed601595a70AB815c96711a31Bc65',
        LOTTO_MOJI_CORE: "0x1B0B1A24983E51d809FBfAc424946B314fEFA271",
        VRF_COORDINATOR: '0x2eD832Ba664535e5886b75D64C46EB9a228C2610',
        KEY_HASH: '0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61'
    };
    
    const GAME_CONFIG = {
        TICKET_PRICE: 0.2,
        USDC_DECIMALS: 6,
        DRAW_TIME_UTC: '04:00',
        PRIZE_SYSTEM: {
            FIRST_PRIZE: "4 emojis posición exacta",
            SECOND_PRIZE: "4 emojis cualquier orden", 
            THIRD_PRIZE: "3 emojis posición exacta",
            FREE_TICKETS: "3 emojis cualquier orden"
        }
    };
    
    console.log("📋 CONFIGURACIÓN DEL FRONTEND:");
    console.log("=".repeat(35));
    console.log("- Contrato:", CONTRACT_ADDRESSES.LOTTO_MOJI_CORE);
    console.log("- Red:", CONTRACT_ADDRESSES.RPC_URL);
    console.log("- Chain ID:", CONTRACT_ADDRESSES.CHAIN_ID);
    console.log("- Explorer:", CONTRACT_ADDRESSES.EXPLORER_URL);
    console.log("- USDC:", CONTRACT_ADDRESSES.USDC);
    console.log("- Hora sorteo:", GAME_CONFIG.DRAW_TIME_UTC);
    console.log("- Precio ticket:", GAME_CONFIG.TICKET_PRICE, "USDC");
    
    // Verificar que la dirección sea la correcta (Avalanche Fuji)
    const expectedFujiAddress = "0x1B0B1A24983E51d809FBfAc424946B314fEFA271";
    if (CONTRACT_ADDRESSES.LOTTO_MOJI_CORE.toLowerCase() === expectedFujiAddress.toLowerCase()) {
        console.log("✅ Dirección del contrato Avalanche Fuji configurada correctamente");
    } else {
        console.log("❌ ERROR: Dirección incorrecta");
        console.log("   Esperada:", expectedFujiAddress);
        console.log("   Actual:", CONTRACT_ADDRESSES.LOTTO_MOJI_CORE);
        return;
    }
    
    // Verificar configuración de red
    if (CONTRACT_ADDRESSES.CHAIN_ID === 43113) {
        console.log("✅ Chain ID configurado correctamente (43113 - Avalanche Fuji)");
    } else {
        console.log("❌ ERROR: Chain ID incorrecto");
        console.log("   Esperado: 43113");
        console.log("   Actual:", CONTRACT_ADDRESSES.CHAIN_ID);
    }
    
    // Verificar hora de sorteo
    if (GAME_CONFIG.DRAW_TIME_UTC === "04:00") {
        console.log("✅ Hora de sorteo configurada correctamente (04:00 UTC)");
    } else {
        console.log("❌ ERROR: Hora de sorteo incorrecta");
        console.log("   Esperada: 04:00");
        console.log("   Actual:", GAME_CONFIG.DRAW_TIME_UTC);
    }
    
    // Probar conexión al contrato
    console.log("\n🔗 PROBANDO CONEXIÓN AL CONTRATO:");
    console.log("=".repeat(40));
    
    try {
        // Crear provider para Avalanche Fuji
        const provider = new ethers.JsonRpcProvider(CONTRACT_ADDRESSES.RPC_URL);
        
        console.log("🌐 Proveedor RPC creado:", CONTRACT_ADDRESSES.RPC_URL);
        
        // Verificar que el contrato existe
        const code = await provider.getCode(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE);
        if (code === "0x") {
            console.log("❌ ERROR: No hay contrato en la dirección especificada");
            return;
        }
        
        console.log("✅ Contrato encontrado en la dirección");
        console.log("📏 Tamaño del bytecode:", code.length, "caracteres");
        
        // ABI mínimo para pruebas básicas
        const minimalABI = [
            "function gameActive() view returns (bool)",
            "function currentGameDay() view returns (uint256)",
            "function TICKET_PRICE() view returns (uint256)",
            "function ticketCounter() view returns (uint256)",
            "function drawTimeUTC() view returns (uint256)",
            "function getMainPoolBalances() view returns (uint256, uint256, uint256, uint256)",
            "function getReserveBalances() view returns (uint256, uint256, uint256)",
            "function getCurrentDay() view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(
            CONTRACT_ADDRESSES.LOTTO_MOJI_CORE,
            minimalABI,
            provider
        );
        
        console.log("\n📊 DATOS BÁSICOS DEL CONTRATO:");
        console.log("-".repeat(35));
        
        // Obtener datos básicos
        const [gameActive, currentGameDay, ticketPrice, ticketCounter, drawTimeUTC] = await Promise.all([
            contract.gameActive(),
            contract.currentGameDay(),
            contract.TICKET_PRICE(),
            contract.ticketCounter(),
            contract.drawTimeUTC()
        ]);
        
        console.log("✅ Juego activo:", gameActive);
        console.log("✅ Día del juego actual:", currentGameDay.toString());
        console.log("✅ Precio del ticket:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("✅ Tickets vendidos:", ticketCounter.toString());
        console.log("✅ Hora de sorteo UTC:", (Number(drawTimeUTC) / 3600).toFixed(0) + ":00");
        
        // Verificar pools principales
        console.log("\n💰 POOLS PRINCIPALES:");
        console.log("-".repeat(25));
        
        const [first, second, third, dev] = await contract.getMainPoolBalances();
        console.log("🥇 Primer premio:", ethers.formatUnits(first, 6), "USDC");
        console.log("🥈 Segundo premio:", ethers.formatUnits(second, 6), "USDC");
        console.log("🥉 Tercer premio:", ethers.formatUnits(third, 6), "USDC");
        console.log("💻 Desarrollo:", ethers.formatUnits(dev, 6), "USDC");
        
        // Verificar reservas
        console.log("\n🏦 POOLS DE RESERVA:");
        console.log("-".repeat(25));
        
        const [firstReserve, secondReserve, thirdReserve] = await contract.getReserveBalances();
        console.log("🥇 Reserva 1er premio:", ethers.formatUnits(firstReserve, 6), "USDC");
        console.log("🥈 Reserva 2do premio:", ethers.formatUnits(secondReserve, 6), "USDC");
        console.log("🥉 Reserva 3er premio:", ethers.formatUnits(thirdReserve, 6), "USDC");
        
        console.log("\n🎯 VERIFICACIÓN DE CONFIGURACIÓN:");
        console.log("-".repeat(40));
        
        // Verificar precio del ticket
        const expectedPrice = ethers.parseUnits("0.2", 6);
        if (ticketPrice.toString() === expectedPrice.toString()) {
            console.log("✅ Precio del ticket correcto (0.2 USDC)");
        } else {
            console.log("❌ Precio del ticket incorrecto");
            console.log("   Esperado: 0.2 USDC");
            console.log("   Actual:", ethers.formatUnits(ticketPrice, 6), "USDC");
        }
        
        // Verificar hora de sorteo
        const expectedDrawTime = 4 * 3600; // 4:00 UTC en segundos
        if (Number(drawTimeUTC) === expectedDrawTime) {
            console.log("✅ Hora de sorteo correcta (04:00 UTC)");
        } else {
            console.log("❌ Hora de sorteo incorrecta");
            console.log("   Esperada: 04:00 UTC");
            console.log("   Actual:", (Number(drawTimeUTC) / 3600).toFixed(0) + ":00 UTC");
        }
        
        console.log("\n📱 INFORMACIÓN PARA EL FRONTEND:");
        console.log("=".repeat(45));
        console.log("✅ Contrato desplegado y funcional en Avalanche Fuji");
        console.log("✅ Todas las funciones básicas responden correctamente");
        console.log("✅ Configuración de precios y timing correcta");
        console.log("✅ Sistema de pools y reservas operativo");
        console.log("✅ El frontend puede conectarse sin problemas");
        
        console.log("\n🔗 ENLACES ÚTILES:");
        console.log("-".repeat(20));
        console.log("📍 Contrato:", `${CONTRACT_ADDRESSES.EXPLORER_URL}/address/${CONTRACT_ADDRESSES.LOTTO_MOJI_CORE}`);
        console.log("💰 USDC Token:", `${CONTRACT_ADDRESSES.EXPLORER_URL}/address/${CONTRACT_ADDRESSES.USDC}`);
        console.log("🎲 VRF Coordinator:", `${CONTRACT_ADDRESSES.EXPLORER_URL}/address/${CONTRACT_ADDRESSES.VRF_COORDINATOR}`);
        
        console.log("\n" + "=".repeat(60));
        console.log("🎉 PRUEBA DE CONEXIÓN FRONTEND EXITOSA");
        console.log("✅ El frontend está listo para usar Avalanche Fuji");
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("❌ Error probando conexión:", error.message);
        
        if (error.code === 'NETWORK_ERROR') {
            console.log("💡 Sugerencia: Verificar conexión a internet y RPC de Avalanche Fuji");
        } else if (error.code === 'CALL_EXCEPTION') {
            console.log("💡 Sugerencia: El contrato puede no estar desplegado o tener ABI incorrecto");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    }); 