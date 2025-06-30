const { ethers } = require("hardhat");

// CONTRATO V6 ACTUAL
const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
const DIA_A_REDISTRIBUIR = 20267;

async function main() {
    console.log("🔄 REDISTRIBUCIÓN DE PREMIOS DÍA 20267");
    console.log("=".repeat(60));
    console.log("📍 Contrato V6:", CONTRACT_ADDRESS);
    console.log("📅 Día a redistribuir:", DIA_A_REDISTRIBUIR);
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Ejecutando como:", deployer.address);
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // ==========================================
        // 1. VERIFICAR ESTADO ACTUAL
        // ==========================================
        console.log("\n📊 1. ESTADO ACTUAL DEL DÍA", DIA_A_REDISTRIBUIR);
        console.log("-".repeat(40));
        
        const [dailyPoolInfo, mainPools, reservePools] = await Promise.all([
            contract.getDailyPoolInfo(DIA_A_REDISTRIBUIR),
            contract.getMainPoolBalances(),
            contract.getReservePoolBalances()
        ]);
        
        const formatUSDC = (amount) => (Number(amount) / 1e6).toFixed(6);
        
        console.log("🎯 Ya sorteado:", dailyPoolInfo.drawn);
        console.log("📦 Ya distribuido:", dailyPoolInfo.distributed);
        console.log("🔢 Números ganadores:", dailyPoolInfo.winningNumbers.map(n => Number(n)));
        console.log("💰 Total recolectado:", formatUSDC(dailyPoolInfo.totalCollected), "USDC");
        
        console.log("\n🏆 POOLS PRINCIPALES:");
        console.log("🥇 Primer Premio:", formatUSDC(mainPools.firstPrizeAccumulated), "USDC");
        console.log("🥈 Segundo Premio:", formatUSDC(mainPools.secondPrizeAccumulated), "USDC");
        console.log("🥉 Tercer Premio:", formatUSDC(mainPools.thirdPrizeAccumulated), "USDC");
        console.log("💼 Desarrollo:", formatUSDC(mainPools.developmentAccumulated), "USDC");
        
        console.log("\n🏦 POOLS DE RESERVA:");
        console.log("🔒 Reserva Principal:", formatUSDC(reservePools.mainReserve), "USDC");
        console.log("🔒 Reserva Secundaria:", formatUSDC(reservePools.secondaryReserve), "USDC");
        
        // ==========================================
        // 2. VERIFICAR SI SE PUEDE REDISTRIBUIR
        // ==========================================
        console.log("\n🔍 2. VERIFICANDO POSIBILIDAD DE REDISTRIBUCIÓN");
        console.log("-".repeat(40));
        
        if (!dailyPoolInfo.drawn) {
            console.log("❌ ERROR: El día no ha sido sorteado aún");
            console.log("💡 Primero se debe ejecutar el sorteo");
            return;
        }
        
        if (!dailyPoolInfo.distributed) {
            console.log("⚠️ El día está sorteado pero NO distribuido");
            console.log("🚀 Se puede ejecutar la distribución por primera vez");
        } else {
            console.log("✅ El día ya está distribuido");
            console.log("🔄 Se puede intentar redistribución forzada");
        }
        
        // ==========================================
        // 3. OBTENER INFORMACIÓN DE GANADORES
        // ==========================================
        console.log("\n🏆 3. ANÁLISIS DE GANADORES");
        console.log("-".repeat(40));
        
        const totalTickets = Number(dailyPoolInfo.totalTickets);
        console.log("🎫 Total tickets del día:", totalTickets);
        
        if (totalTickets === 0) {
            console.log("❌ No hay tickets para este día");
            return;
        }
        
        // Obtener tickets del día para contar ganadores
        const ticketsDelDia = await contract.getGameDayTickets(DIA_A_REDISTRIBUIR);
        console.log("📊 Tickets obtenidos:", ticketsDelDia.length);
        
        let conteoGanadores = {
            primerPremio: 0,
            segundoPremio: 0,
            tercerPremio: 0,
            ticketsGratis: 0
        };
        
        const numerosGanadores = dailyPoolInfo.winningNumbers.map(n => Number(n));
        console.log("🎲 Verificando contra números:", numerosGanadores);
        
        // Contar ganadores (muestra de primeros 50 tickets para no saturar)
        const muestra = Math.min(50, ticketsDelDia.length);
        console.log(`🔍 Analizando muestra de ${muestra} tickets...`);
        
        for (let i = 0; i < muestra; i++) {
            try {
                const ticketInfo = await contract.getFullTicketInfo(ticketsDelDia[i]);
                const resultado = verificarTicket(
                    ticketInfo.numbers.map(n => Number(n)), 
                    numerosGanadores
                );
                
                switch (resultado.tipo) {
                    case 'PRIMER_PREMIO':
                        conteoGanadores.primerPremio++;
                        console.log(`   🥇 Ticket #${ticketsDelDia[i]}: [${ticketInfo.numbers.map(n => Number(n)).join(', ')}]`);
                        break;
                    case 'SEGUNDO_PREMIO':
                        conteoGanadores.segundoPremio++;
                        console.log(`   🥈 Ticket #${ticketsDelDia[i]}: [${ticketInfo.numbers.map(n => Number(n)).join(', ')}]`);
                        break;
                    case 'TERCER_PREMIO':
                        conteoGanadores.tercerPremio++;
                        break;
                    case 'TICKETS_GRATIS':
                        conteoGanadores.ticketsGratis++;
                        break;
                }
            } catch (error) {
                // Continuar con el siguiente ticket
            }
        }
        
        console.log("\n📊 GANADORES EN MUESTRA:");
        console.log("🥇 Primer Premio:", conteoGanadores.primerPremio);
        console.log("🥈 Segundo Premio:", conteoGanadores.segundoPremio);
        console.log("🥉 Tercer Premio:", conteoGanadores.tercerPremio);
        console.log("🎫 Tickets Gratis:", conteoGanadores.ticketsGratis);
        
        // ==========================================
        // 4. OPCIONES DE REDISTRIBUCIÓN
        // ==========================================
        console.log("\n🔄 4. OPCIONES DE REDISTRIBUCIÓN");
        console.log("-".repeat(40));
        
        console.log("🛠️ FUNCIONES DISPONIBLES:");
        
        // Verificar si hay función de redistribución forzada
        try {
            // Intentar ver si existe la función forceDistribution
            const hasForceDistribution = await contract.interface.getFunction("forceDistribution");
            console.log("✅ forceDistribution() disponible");
        } catch {
            console.log("❌ forceDistribution() no disponible");
        }
        
        try {
            // Intentar ver si existe la función distributePrizes
            const hasDistributePrizes = await contract.interface.getFunction("distributePrizes");
            console.log("✅ distributePrizes() disponible");
        } catch {
            console.log("❌ distributePrizes() no disponible");
        }
        
        try {
            // Intentar ver si existe la función redistributeDay
            const hasRedistributeDay = await contract.interface.getFunction("redistributeDay");
            console.log("✅ redistributeDay() disponible");
        } catch {
            console.log("❌ redistributeDay() no disponible");
        }
        
        // ==========================================
        // 5. EJECUTAR REDISTRIBUCIÓN
        // ==========================================
        console.log("\n🚀 5. EJECUTANDO REDISTRIBUCIÓN");
        console.log("-".repeat(40));
        
        // Estrategia: Intentar diferentes métodos de redistribución
        let redistribucionExitosa = false;
        
        // Método 1: forceDistribution si existe
        if (!redistribucionExitosa) {
            try {
                console.log("🔄 Intentando forceDistribution()...");
                const tx = await contract.forceDistribution(DIA_A_REDISTRIBUIR);
                console.log("📝 Hash de transacción:", tx.hash);
                console.log("⏳ Esperando confirmación...");
                await tx.wait();
                console.log("✅ forceDistribution() ejecutada exitosamente");
                redistribucionExitosa = true;
            } catch (error) {
                console.log("❌ forceDistribution() falló:", error.message);
            }
        }
        
        // Método 2: distributePrizes si existe
        if (!redistribucionExitosa) {
            try {
                console.log("🔄 Intentando distributePrizes()...");
                const tx = await contract.distributePrizes(DIA_A_REDISTRIBUIR);
                console.log("📝 Hash de transacción:", tx.hash);
                console.log("⏳ Esperando confirmación...");
                await tx.wait();
                console.log("✅ distributePrizes() ejecutada exitosamente");
                redistribucionExitosa = true;
            } catch (error) {
                console.log("❌ distributePrizes() falló:", error.message);
            }
        }
        
        // Método 3: redistributeDay si existe
        if (!redistribucionExitosa) {
            try {
                console.log("🔄 Intentando redistributeDay()...");
                const tx = await contract.redistributeDay(DIA_A_REDISTRIBUIR);
                console.log("📝 Hash de transacción:", tx.hash);
                console.log("⏳ Esperando confirmación...");
                await tx.wait();
                console.log("✅ redistributeDay() ejecutada exitosamente");
                redistribucionExitosa = true;
            } catch (error) {
                console.log("❌ redistributeDay() falló:", error.message);
            }
        }
        
        // Método 4: Intentar performUpkeep si nada más funciona
        if (!redistribucionExitosa) {
            try {
                console.log("🔄 Intentando performUpkeep() como último recurso...");
                const upkeepNeeded = await contract.checkUpkeep("0x");
                if (upkeepNeeded[0]) {
                    const tx = await contract.performUpkeep("0x");
                    console.log("📝 Hash de transacción:", tx.hash);
                    console.log("⏳ Esperando confirmación...");
                    await tx.wait();
                    console.log("✅ performUpkeep() ejecutado");
                    redistribucionExitosa = true;
                } else {
                    console.log("❌ No se necesita upkeep en este momento");
                }
            } catch (error) {
                console.log("❌ performUpkeep() falló:", error.message);
            }
        }
        
        // ==========================================
        // 6. VERIFICAR RESULTADO
        // ==========================================
        if (redistribucionExitosa) {
            console.log("\n✅ 6. VERIFICANDO RESULTADO DE REDISTRIBUCIÓN");
            console.log("-".repeat(40));
            
            // Esperar un poco para que se procesen los cambios
            console.log("⏳ Esperando procesamiento...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Verificar nuevo estado
            const [newDailyPoolInfo, newMainPools] = await Promise.all([
                contract.getDailyPoolInfo(DIA_A_REDISTRIBUIR),
                contract.getMainPoolBalances()
            ]);
            
            console.log("📊 NUEVO ESTADO:");
            console.log("🎯 Ya sorteado:", newDailyPoolInfo.drawn);
            console.log("📦 Ya distribuido:", newDailyPoolInfo.distributed);
            console.log("💰 Total recolectado:", formatUSDC(newDailyPoolInfo.totalCollected), "USDC");
            
            console.log("\n🏆 NUEVAS POOLS:");
            console.log("🥇 Primer Premio:", formatUSDC(newMainPools.firstPrizeAccumulated), "USDC");
            console.log("🥈 Segundo Premio:", formatUSDC(newMainPools.secondPrizeAccumulated), "USDC");
            console.log("🥉 Tercer Premio:", formatUSDC(newMainPools.thirdPrizeAccumulated), "USDC");
            
            console.log("\n🎉 ¡REDISTRIBUCIÓN COMPLETADA!");
            console.log("💡 Ahora puedes intentar reclamar tus premios");
        } else {
            console.log("\n❌ No se pudo ejecutar la redistribución");
            console.log("💡 Posibles causas:");
            console.log("   - La distribución ya está correcta");
            console.log("   - No tienes permisos de administrador");
            console.log("   - Las funciones no están disponibles en este contrato");
            console.log("   - El día ya fue correctamente distribuido");
        }
        
        console.log("\n" + "=".repeat(60));
        
    } catch (error) {
        console.error("❌ Error en la redistribución:", error.message);
        console.log("\n💡 SUGERENCIAS:");
        console.log("1. Verifica que tengas permisos de administrador");
        console.log("2. El contrato podría no permitir redistribuciones");
        console.log("3. Intenta reclamar los premios directamente");
    }
}

// Función para verificar un ticket individual
function verificarTicket(ticketNumbers, winningNumbers) {
    // Contar coincidencias exactas (posición)
    let exactMatches = 0;
    for (let i = 0; i < 4; i++) {
        if (ticketNumbers[i] === winningNumbers[i]) {
            exactMatches++;
        }
    }
    
    // Contar coincidencias totales (cualquier posición)
    let totalMatches = 0;
    for (let num of ticketNumbers) {
        if (winningNumbers.includes(num)) {
            totalMatches++;
        }
    }
    
    // Determinar tipo de premio según lógica V6
    if (exactMatches === 4) {
        return { tipo: 'PRIMER_PREMIO' };
    } else if (totalMatches === 4) {
        return { tipo: 'SEGUNDO_PREMIO' };
    } else if (exactMatches === 3) {
        return { tipo: 'TERCER_PREMIO' };
    } else if (totalMatches >= 3) {
        return { tipo: 'TICKETS_GRATIS' };
    } else {
        return { tipo: 'SIN_PREMIO' };
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });