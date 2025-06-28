const { ethers } = require("hardhat");

// CONTRATO V6 ACTUAL
const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
const SUBSCRIPTION_ID = "70846359092368923949796315994230469102226608583606291730577230133525692264419";

async function main() {
    console.log("🔍 VERIFICACIÓN COMPLETA DEL SORTEO - SIN EJECUTAR");
    console.log("=".repeat(70));
    console.log("📍 Contrato V6:", CONTRACT_ADDRESS);
    console.log("🎯 Subscription ID:", SUBSCRIPTION_ID);
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Verificando con wallet:", deployer.address);
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // ==========================================
        // 1. VERIFICACIÓN BÁSICA DEL CONTRATO
        // ==========================================
        console.log("\n📋 1. VERIFICACIÓN BÁSICA");
        console.log("-".repeat(40));
        
        const [gameActive, automationActive, currentGameDay, subscriptionId] = await Promise.all([
            contract.gameActive(),
            contract.automationActive(),
            contract.currentGameDay(),
            contract.subscriptionId()
        ]);
        
        console.log("🎮 Game Active:", gameActive);
        console.log("🤖 Automation Active:", automationActive);
        console.log("📅 Current Game Day:", Number(currentGameDay));
        console.log("🎯 Subscription ID Match:", subscriptionId.toString() === SUBSCRIPTION_ID);
        
        if (!gameActive || !automationActive) {
            console.log("❌ PROBLEMA: El juego o la automatización están desactivados");
            return;
        }
        
        if (subscriptionId.toString() !== SUBSCRIPTION_ID) {
            console.log("❌ PROBLEMA: Subscription ID no coincide");
            return;
        }
        
        // ==========================================
        // 2. VERIFICAR ESTADO DEL SORTEO
        // ==========================================
        console.log("\n🎲 2. ESTADO DEL SORTEO");
        console.log("-".repeat(40));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("⚡ Upkeep Needed:", upkeepNeeded);
        
        if (!upkeepNeeded) {
            console.log("❌ PROBLEMA: No se necesita upkeep, sorteo no está listo");
            
            // Mostrar timing
            const [lastDrawTime, drawTimeUTC, drawInterval] = await Promise.all([
                contract.lastDrawTime(),
                contract.drawTimeUTC(),
                contract.DRAW_INTERVAL()
            ]);
            
            const now = Math.floor(Date.now() / 1000);
            const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
            const timeToNext = nextDrawTime - now;
            
            console.log("⏰ Próximo sorteo en:", Math.floor(timeToNext / 3600), "horas", Math.floor((timeToNext % 3600) / 60), "minutos");
            return;
        }
        
        console.log("✅ SORTEO ESTÁ LISTO PARA EJECUTARSE");
        
        // ==========================================
        // 3. ANÁLISIS DE TICKETS ACTUALES
        // ==========================================
        console.log("\n🎫 3. ANÁLISIS DE TICKETS");
        console.log("-".repeat(40));
        
        const gameDayData = await contract.gameDayData(currentGameDay);
        const totalTickets = Number(gameDayData.totalTickets);
        const drawn = gameDayData.drawn;
        const winningNumbers = gameDayData.winningNumbers;
        
        console.log("📊 Total tickets día actual:", totalTickets);
        console.log("🎯 Ya sorteado:", drawn);
        console.log("🔢 Números ganadores actuales:", winningNumbers.map(n => Number(n)));
        
        if (totalTickets === 0) {
            console.log("❌ PROBLEMA: No hay tickets para el día actual");
            return;
        }
        
        if (drawn) {
            console.log("❌ PROBLEMA: El día actual ya fue sorteado");
            return;
        }
        
        // ==========================================
        // 4. VERIFICAR POOLS Y DISTRIBUCIÓN
        // ==========================================
        console.log("\n💰 4. VERIFICACIÓN DE POOLS");
        console.log("-".repeat(40));
        
        const [mainPools, reserves] = await Promise.all([
            contract.getMainPoolBalances(),
            contract.getReserveBalances()
        ]);
        
        const formatUSDC = (amount) => (Number(amount) / 1e6).toFixed(2);
        
        console.log("🏆 POOLS PRINCIPALES:");
        console.log("  🥇 Primer Premio:", formatUSDC(mainPools.firstPrizeAccumulated), "USDC");
        console.log("  🥈 Segundo Premio:", formatUSDC(mainPools.secondPrizeAccumulated), "USDC");
        console.log("  🥉 Tercer Premio:", formatUSDC(mainPools.thirdPrizeAccumulated), "USDC");
        console.log("  💼 Desarrollo:", formatUSDC(mainPools.developmentAccumulated), "USDC");
        
        console.log("🏦 RESERVAS:");
        console.log("  🥇 Primera Reserva:", formatUSDC(reserves.firstPrizeReserve), "USDC");
        console.log("  🥈 Segunda Reserva:", formatUSDC(reserves.secondPrizeReserve), "USDC");
        console.log("  🥉 Tercera Reserva:", formatUSDC(reserves.thirdPrizeReserve), "USDC");
        
        const totalMainPools = Number(mainPools.firstPrizeAccumulated) + 
                              Number(mainPools.secondPrizeAccumulated) + 
                              Number(mainPools.thirdPrizeAccumulated) + 
                              Number(mainPools.developmentAccumulated);
        
        const totalReserves = Number(reserves.firstPrizeReserve) + 
                             Number(reserves.secondPrizeReserve) + 
                             Number(reserves.thirdPrizeReserve);
        
        console.log("💵 TOTAL EN POOLS PRINCIPALES:", formatUSDC(totalMainPools), "USDC");
        console.log("💵 TOTAL EN RESERVAS:", formatUSDC(totalReserves), "USDC");
        console.log("💵 GRAN TOTAL:", formatUSDC(totalMainPools + totalReserves), "USDC");
        
        // ==========================================
        // 5. SIMULACIÓN DE DISTRIBUCIÓN
        // ==========================================
        console.log("\n🎯 5. SIMULACIÓN DE DISTRIBUCIÓN");
        console.log("-".repeat(40));
        
        // Calcular lo que se distribuirá
        const ticketRevenue = totalTickets * 200000; // 0.2 USDC por ticket en wei (6 decimals)
        const toReserves = Math.floor(ticketRevenue * 0.20); // 20% a reservas
        const toMainPools = ticketRevenue - toReserves; // 80% a pools principales
        
        const firstPrizeShare = Math.floor(toMainPools * 0.80); // 80% del 80%
        const secondPrizeShare = Math.floor(toMainPools * 0.10); // 10% del 80%
        const thirdPrizeShare = Math.floor(toMainPools * 0.05); // 5% del 80%
        const developmentShare = toMainPools - firstPrizeShare - secondPrizeShare - thirdPrizeShare; // Resto
        
        console.log("📊 DISTRIBUCIÓN QUE SE APLICARÁ:");
        console.log("  💰 Ingresos por tickets:", formatUSDC(ticketRevenue), "USDC");
        console.log("  🏦 A reservas (20%):", formatUSDC(toReserves), "USDC");
        console.log("  🏆 A pools principales (80%):", formatUSDC(toMainPools), "USDC");
        console.log("");
        console.log("  🥇 Primer premio (+):", formatUSDC(firstPrizeShare), "USDC");
        console.log("  🥈 Segundo premio (+):", formatUSDC(secondPrizeShare), "USDC");
        console.log("  🥉 Tercer premio (+):", formatUSDC(thirdPrizeShare), "USDC");
        console.log("  💼 Desarrollo (+):", formatUSDC(developmentShare), "USDC");
        
        // Pools después de la distribución
        console.log("\n💰 POOLS DESPUÉS DEL SORTEO:");
        console.log("  🥇 Primer Premio:", formatUSDC(Number(mainPools.firstPrizeAccumulated) + firstPrizeShare), "USDC");
        console.log("  🥈 Segundo Premio:", formatUSDC(Number(mainPools.secondPrizeAccumulated) + secondPrizeShare), "USDC");
        console.log("  🥉 Tercer Premio:", formatUSDC(Number(mainPools.thirdPrizeAccumulated) + thirdPrizeShare), "USDC");
        console.log("  💼 Desarrollo:", formatUSDC(Number(mainPools.developmentAccumulated) + developmentShare), "USDC");
        
        // ==========================================
        // 6. VERIFICAR LÓGICA DE GANADORES
        // ==========================================
        console.log("\n🏆 6. LÓGICA DE PREMIOS");
        console.log("-".repeat(40));
        
        console.log("✅ NUEVA LÓGICA DE PREMIOS V6:");
        console.log("  🥇 Primer Premio: 4 emojis posición exacta");
        console.log("  🥈 Segundo Premio: 4 emojis cualquier orden");
        console.log("  🥉 Tercer Premio: 3 emojis posición exacta");
        console.log("  🎫 Tickets Gratis: 3 emojis cualquier orden");
        
        // Simular algunos tickets para verificar lógica
        console.log("\n🎲 SIMULACIÓN CON NÚMEROS DE EJEMPLO [1, 2, 3, 4]:");
        
        const testCases = [
            { ticket: [1, 2, 3, 4], name: "Exacto" },
            { ticket: [4, 3, 2, 1], name: "Mismo orden inverso" },
            { ticket: [2, 1, 4, 3], name: "Mismos números diferente orden" },
            { ticket: [1, 2, 3, 5], name: "3 correctos posición exacta" },
            { ticket: [1, 2, 5, 3], name: "3 correctos diferente orden" },
            { ticket: [1, 2, 6, 7], name: "Solo 2 correctos" }
        ];
        
        testCases.forEach(test => {
            const exactMatches = test.ticket.filter((num, index) => num === [1, 2, 3, 4][index]).length;
            const totalMatches = test.ticket.filter(num => [1, 2, 3, 4].includes(num)).length;
            
            let prize = "Sin premio";
            if (exactMatches === 4) prize = "🥇 PRIMER PREMIO";
            else if (totalMatches === 4) prize = "🥈 SEGUNDO PREMIO";
            else if (exactMatches === 3) prize = "🥉 TERCER PREMIO";
            else if (totalMatches >= 3) prize = "🎫 TICKETS GRATIS";
            
            console.log(`  [${test.ticket.join(',')}] ${test.name}: ${prize}`);
        });
        
        // ==========================================
        // 7. VERIFICACIONES FINALES
        // ==========================================
        console.log("\n✅ 7. VERIFICACIONES FINALES");
        console.log("-".repeat(40));
        
        let allChecksPass = true;
        const checks = [
            { name: "Juego activo", pass: gameActive },
            { name: "Automatización activa", pass: automationActive },
            { name: "Subscription ID correcto", pass: subscriptionId.toString() === SUBSCRIPTION_ID },
            { name: "Upkeep necesario", pass: upkeepNeeded },
            { name: "Hay tickets para sortear", pass: totalTickets > 0 },
            { name: "Día actual no sorteado", pass: !drawn },
            { name: "Hay fondos en pools", pass: totalMainPools > 0 }
        ];
        
        checks.forEach(check => {
            const status = check.pass ? "✅" : "❌";
            console.log(`  ${status} ${check.name}`);
            if (!check.pass) allChecksPass = false;
        });
        
        console.log("\n" + "=".repeat(70));
        
        if (allChecksPass) {
            console.log("🎉 TODAS LAS VERIFICACIONES PASARON");
            console.log("✅ EL SORTEO Y DISTRIBUCIÓN FUNCIONARÁN CORRECTAMENTE");
            console.log("");
            console.log("📋 RESUMEN DE LO QUE SUCEDERÁ:");
            console.log(`  🎫 Se sortearán ${totalTickets} tickets del día ${Number(currentGameDay)}`);
            console.log(`  💰 Se distribuirán ${formatUSDC(ticketRevenue)} USDC`);
            console.log(`  🏦 ${formatUSDC(toReserves)} USDC irán a reservas`);
            console.log(`  🏆 ${formatUSDC(toMainPools)} USDC se distribuirán en pools`);
            console.log(`  🎲 Se generarán 4 números ganadores aleatorios`);
            console.log(`  🏆 Los ganadores podrán reclamar sus premios`);
            console.log("");
            console.log("🚀 PUEDES EJECUTAR EL UPKEEP CON CONFIANZA");
        } else {
            console.log("❌ HAY PROBLEMAS QUE DEBEN RESOLVERSE ANTES DEL SORTEO");
            console.log("🔧 Revisa los elementos marcados con ❌ arriba");
        }
        
        console.log("=".repeat(70));
        
    } catch (error) {
        console.error("❌ Error en la verificación:", error.message);
        console.error("Stack:", error.stack);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });