const { ethers } = require("hardhat");

// CONTRATO V6 ACTUAL
const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
const DIA_SORTEADO = 20267;
const NUMEROS_GANADORES = [18, 20, 23, 17]; // Del sorteo anterior

async function main() {
    console.log("🏆 VERIFICACIÓN DE GANADORES DÍA 20267");
    console.log("=".repeat(60));
    console.log("📍 Contrato V6:", CONTRACT_ADDRESS);
    console.log("📅 Día verificado:", DIA_SORTEADO);
    console.log("🎲 Números ganadores:", NUMEROS_GANADORES);
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Verificando tickets de:", deployer.address);
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // ==========================================
        // 1. VERIFICAR ESTADO DEL SORTEO
        // ==========================================
        console.log("\n📊 1. ESTADO DEL SORTEO");
        console.log("-".repeat(40));
        
        const dailyPoolInfo = await contract.getDailyPoolInfo(DIA_SORTEADO);
        console.log("🎯 Ya sorteado:", dailyPoolInfo.drawn);
        console.log("📦 Ya distribuido:", dailyPoolInfo.distributed);
        console.log("🔢 Números confirmados:", dailyPoolInfo.winningNumbers.map(n => Number(n)));
        console.log("💰 Total recolectado:", ethers.formatUnits(dailyPoolInfo.totalCollected, 6), "USDC");
        
        // Verificar que los números coinciden
        const numerosContrato = dailyPoolInfo.winningNumbers.map(n => Number(n));
        const coinciden = JSON.stringify(numerosContrato) === JSON.stringify(NUMEROS_GANADORES);
        console.log("✅ Números coinciden:", coinciden);
        
        if (!coinciden) {
            console.log("⚠️ Los números del contrato no coinciden con los esperados");
            console.log("📋 Usando números del contrato:", numerosContrato);
        }
        
        // Usar los números del contrato para mayor precisión
        const numerosParaVerificar = numerosContrato;
        
        // ==========================================
        // 2. OBTENER MIS TICKETS DEL DÍA
        // ==========================================
        console.log("\n🎫 2. OBTENIENDO MIS TICKETS");
        console.log("-".repeat(40));
        
        const ticketsDelDia = await contract.getGameDayTickets(DIA_SORTEADO);
        console.log("📊 Total tickets del día:", ticketsDelDia.length);
        
        // Verificar cuáles son míos
        console.log("🔍 Verificando propietarios...");
        let misTickets = [];
        
        for (let i = 0; i < ticketsDelDia.length; i++) {
            const ticketId = ticketsDelDia[i];
            
            try {
                const ticketInfo = await contract.getFullTicketInfo(ticketId);
                if (ticketInfo.ticketOwner.toLowerCase() === deployer.address.toLowerCase()) {
                    misTickets.push({
                        id: Number(ticketId),
                        numbers: ticketInfo.numbers.map(n => Number(n)),
                        active: ticketInfo.isActive
                    });
                }
                
                // Mostrar progreso cada 50 tickets
                if ((i + 1) % 50 === 0) {
                    console.log(`   🔄 Verificado ${i + 1}/${ticketsDelDia.length} tickets...`);
                }
            } catch (error) {
                console.log(`   ⚠️ Error verificando ticket ${ticketId}`);
            }
        }
        
        console.log(`✅ Encontrados ${misTickets.length} tickets míos`);
        
        // ==========================================
        // 3. VERIFICAR GANADORES
        // ==========================================
        console.log("\n🏆 3. VERIFICACIÓN DE GANADORES");
        console.log("-".repeat(40));
        console.log("🎯 Aplicando lógica de premios V6:");
        console.log("   🥇 Primer Premio: 4 emojis posición exacta");
        console.log("   🥈 Segundo Premio: 4 emojis cualquier orden");
        console.log("   🥉 Tercer Premio: 3 emojis posición exacta");
        console.log("   🎫 Tickets Gratis: 3 emojis cualquier orden");
        
        let ganadores = {
            primerPremio: [],
            segundoPremio: [],
            tercerPremio: [],
            ticketsGratis: [],
            sinPremio: []
        };
        
        console.log(`\n🔍 Analizando ${misTickets.length} tickets...`);
        
        misTickets.forEach((ticket, index) => {
            const resultado = verificarTicket(ticket.numbers, numerosParaVerificar);
            
            switch (resultado.tipo) {
                case 'PRIMER_PREMIO':
                    ganadores.primerPremio.push({ ...ticket, ...resultado });
                    break;
                case 'SEGUNDO_PREMIO':
                    ganadores.segundoPremio.push({ ...ticket, ...resultado });
                    break;
                case 'TERCER_PREMIO':
                    ganadores.tercerPremio.push({ ...ticket, ...resultado });
                    break;
                case 'TICKETS_GRATIS':
                    ganadores.ticketsGratis.push({ ...ticket, ...resultado });
                    break;
                default:
                    ganadores.sinPremio.push({ ...ticket, ...resultado });
            }
            
            // Mostrar progreso cada 50 tickets
            if ((index + 1) % 50 === 0) {
                console.log(`   🔄 Analizados ${index + 1}/${misTickets.length} tickets...`);
            }
        });
        
        // ==========================================
        // 4. RESULTADOS DETALLADOS
        // ==========================================
        console.log("\n🎉 4. RESULTADOS DETALLADOS");
        console.log("-".repeat(40));
        
        // Primer Premio
        if (ganadores.primerPremio.length > 0) {
            console.log(`\n🥇 PRIMER PREMIO (${ganadores.primerPremio.length} tickets):`);
            ganadores.primerPremio.forEach(ticket => {
                console.log(`   🎫 #${ticket.id}: [${ticket.numbers.join(', ')}] - ${ticket.descripcion}`);
            });
        }
        
        // Segundo Premio
        if (ganadores.segundoPremio.length > 0) {
            console.log(`\n🥈 SEGUNDO PREMIO (${ganadores.segundoPremio.length} tickets):`);
            ganadores.segundoPremio.forEach(ticket => {
                console.log(`   🎫 #${ticket.id}: [${ticket.numbers.join(', ')}] - ${ticket.descripcion}`);
            });
        }
        
        // Tercer Premio
        if (ganadores.tercerPremio.length > 0) {
            console.log(`\n🥉 TERCER PREMIO (${ganadores.tercerPremio.length} tickets):`);
            ganadores.tercerPremio.forEach(ticket => {
                console.log(`   🎫 #${ticket.id}: [${ticket.numbers.join(', ')}] - ${ticket.descripcion}`);
            });
        }
        
        // Tickets Gratis
        if (ganadores.ticketsGratis.length > 0) {
            console.log(`\n🎫 TICKETS GRATIS (${ganadores.ticketsGratis.length} tickets):`);
            ganadores.ticketsGratis.slice(0, 10).forEach(ticket => {
                console.log(`   🎫 #${ticket.id}: [${ticket.numbers.join(', ')}] - ${ticket.descripcion}`);
            });
            if (ganadores.ticketsGratis.length > 10) {
                console.log(`   ... y ${ganadores.ticketsGratis.length - 10} tickets gratis más`);
            }
        }
        
        console.log(`\n❌ SIN PREMIO: ${ganadores.sinPremio.length} tickets`);
        
        // ==========================================
        // 5. CÁLCULO DE PREMIOS
        // ==========================================
        console.log("\n💰 5. CÁLCULO DE PREMIOS");
        console.log("-".repeat(40));
        
        const [mainPools] = await Promise.all([
            contract.getMainPoolBalances()
        ]);
        
        const formatUSDC = (amount) => (Number(amount) / 1e6).toFixed(6);
        
        console.log("🏆 POOLS DISPONIBLES:");
        console.log(`   🥇 Primer Premio: ${formatUSDC(mainPools.firstPrizeAccumulated)} USDC`);
        console.log(`   🥈 Segundo Premio: ${formatUSDC(mainPools.secondPrizeAccumulated)} USDC`);
        console.log(`   🥉 Tercer Premio: ${formatUSDC(mainPools.thirdPrizeAccumulated)} USDC`);
        
        let premiosTotales = 0;
        
        if (ganadores.primerPremio.length > 0) {
            const premioIndividual = Number(mainPools.firstPrizeAccumulated) / ganadores.primerPremio.length;
            console.log(`\n🥇 PRIMER PREMIO:`);
            console.log(`   👥 Ganadores: ${ganadores.primerPremio.length}`);
            console.log(`   💰 Premio individual: ${formatUSDC(premioIndividual)} USDC`);
            console.log(`   💵 Total a recibir: ${formatUSDC(Number(mainPools.firstPrizeAccumulated))} USDC`);
            premiosTotales += Number(mainPools.firstPrizeAccumulated);
        }
        
        if (ganadores.segundoPremio.length > 0) {
            const premioIndividual = Number(mainPools.secondPrizeAccumulated) / ganadores.segundoPremio.length;
            console.log(`\n🥈 SEGUNDO PREMIO:`);
            console.log(`   👥 Ganadores: ${ganadores.segundoPremio.length}`);
            console.log(`   💰 Premio individual: ${formatUSDC(premioIndividual)} USDC`);
            console.log(`   💵 Total a recibir: ${formatUSDC(Number(mainPools.secondPrizeAccumulated))} USDC`);
            premiosTotales += Number(mainPools.secondPrizeAccumulated);
        }
        
        if (ganadores.tercerPremio.length > 0) {
            const premioIndividual = Number(mainPools.thirdPrizeAccumulated) / ganadores.tercerPremio.length;
            console.log(`\n🥉 TERCER PREMIO:`);
            console.log(`   👥 Ganadores: ${ganadores.tercerPremio.length}`);
            console.log(`   💰 Premio individual: ${formatUSDC(premioIndividual)} USDC`);
            console.log(`   💵 Total a recibir: ${formatUSDC(Number(mainPools.thirdPrizeAccumulated))} USDC`);
            premiosTotales += Number(mainPools.thirdPrizeAccumulated);
        }
        
        // ==========================================
        // 6. RESUMEN FINAL
        // ==========================================
        console.log("\n" + "=".repeat(60));
        console.log("📋 RESUMEN DE PREMIOS");
        console.log("=".repeat(60));
        
        const totalGanadores = ganadores.primerPremio.length + ganadores.segundoPremio.length + 
                              ganadores.tercerPremio.length + ganadores.ticketsGratis.length;
        
        console.log(`🎫 Total tickets verificados: ${misTickets.length}`);
        console.log(`🏆 Total ganadores: ${totalGanadores}`);
        console.log(`📊 Porcentaje ganador: ${((totalGanadores / misTickets.length) * 100).toFixed(2)}%`);
        console.log("");
        console.log(`🥇 Primer Premio: ${ganadores.primerPremio.length} tickets`);
        console.log(`🥈 Segundo Premio: ${ganadores.segundoPremio.length} tickets`);
        console.log(`🥉 Tercer Premio: ${ganadores.tercerPremio.length} tickets`);
        console.log(`🎫 Tickets Gratis: ${ganadores.ticketsGratis.length} tickets`);
        console.log(`❌ Sin Premio: ${ganadores.sinPremio.length} tickets`);
        
        if (premiosTotales > 0) {
            console.log(`\n💰 TOTAL PREMIOS EN USDC: ${formatUSDC(premiosTotales)} USDC`);
            console.log("\n🚀 PRÓXIMOS PASOS:");
            console.log("1. Puedes reclamar tus premios llamando claimPrize(ticketId)");
            console.log("2. Usa los IDs de tickets ganadores mostrados arriba");
            console.log("3. Los premios se transferirán automáticamente a tu wallet");
        } else {
            console.log("\n😢 No hay premios en USDC para reclamar esta vez");
            if (ganadores.ticketsGratis.length > 0) {
                console.log(`✨ Pero tienes ${ganadores.ticketsGratis.length} tickets gratis para el próximo sorteo`);
            }
        }
        
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("❌ Error en la verificación:", error.message);
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
        return { 
            tipo: 'PRIMER_PREMIO', 
            descripcion: '4 exactos',
            exactMatches,
            totalMatches
        };
    } else if (totalMatches === 4) {
        return { 
            tipo: 'SEGUNDO_PREMIO', 
            descripcion: '4 cualquier orden',
            exactMatches,
            totalMatches
        };
    } else if (exactMatches === 3) {
        return { 
            tipo: 'TERCER_PREMIO', 
            descripcion: '3 exactos',
            exactMatches,
            totalMatches
        };
    } else if (totalMatches >= 3) {
        return { 
            tipo: 'TICKETS_GRATIS', 
            descripcion: '3+ cualquier orden',
            exactMatches,
            totalMatches
        };
    } else {
        return { 
            tipo: 'SIN_PREMIO', 
            descripcion: `${exactMatches} exactos, ${totalMatches} total`,
            exactMatches,
            totalMatches
        };
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });