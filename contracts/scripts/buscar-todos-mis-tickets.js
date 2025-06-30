const { ethers } = require("hardhat");

// CONTRATO V6 ACTUAL
const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";

async function main() {
    console.log("🔍 BÚSQUEDA EXHAUSTIVA DE TODOS MIS TICKETS");
    console.log("=".repeat(60));
    console.log("📍 Contrato V6:", CONTRACT_ADDRESS);
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Buscando tickets de:", deployer.address);
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // ==========================================
        // 1. INFORMACIÓN GENERAL DEL CONTRATO
        // ==========================================
        console.log("\n📊 1. INFORMACIÓN GENERAL");
        console.log("-".repeat(40));
        
        const [currentGameDay, totalSupply] = await Promise.all([
            contract.getCurrentDay(),
            contract.totalSupply ? contract.totalSupply() : Promise.resolve("No disponible")
        ]);
        
        console.log("📅 Día actual:", Number(currentGameDay));
        console.log("🎫 Total tickets creados:", totalSupply.toString());
        
        // ==========================================
        // 2. BUSCAR MIS TICKETS EN MÚLTIPLES DÍAS
        // ==========================================
        console.log("\n🎫 2. BÚSQUEDA POR DÍAS");
        console.log("-".repeat(40));
        
        const diasABuscar = [
            Number(currentGameDay) - 2,  // Día anterior al anterior
            Number(currentGameDay) - 1,  // Día anterior
            Number(currentGameDay),      // Día actual
            Number(currentGameDay) + 1,  // Día siguiente
            Number(currentGameDay) + 2   // Día siguiente al siguiente
        ];
        
        let misTicketsTotales = [];
        
        for (const dia of diasABuscar) {
            console.log(`\n📅 Buscando en día ${dia}:`);
            
            try {
                const ticketsDelDia = await contract.getGameDayTickets(dia);
                console.log(`   📊 Total tickets del día: ${ticketsDelDia.length}`);
                
                if (ticketsDelDia.length > 0) {
                    // Verificar cuáles son míos
                    let misTicketsDelDia = [];
                    
                    for (const ticketId of ticketsDelDia) {
                        try {
                            const ticketInfo = await contract.getFullTicketInfo(ticketId);
                            if (ticketInfo.ticketOwner.toLowerCase() === deployer.address.toLowerCase()) {
                                misTicketsDelDia.push({
                                    id: Number(ticketId),
                                    gameDay: dia,
                                    numbers: ticketInfo.numbers.map(n => Number(n)),
                                    purchaseTime: Number(ticketInfo.purchaseTime),
                                    active: ticketInfo.isActive
                                });
                            }
                        } catch (error) {
                            console.log(`   ⚠️ Error verificando ticket ${ticketId}`);
                        }
                    }
                    
                    console.log(`   👤 Mis tickets: ${misTicketsDelDia.length}`);
                    if (misTicketsDelDia.length > 0) {
                        console.log(`   🎫 IDs: ${misTicketsDelDia.map(t => t.id).join(', ')}`);
                        misTicketsTotales = misTicketsTotales.concat(misTicketsDelDia);
                    }
                } else {
                    console.log(`   📊 No hay tickets para el día ${dia}`);
                }
            } catch (error) {
                console.log(`   ❌ Error buscando día ${dia}: ${error.message}`);
            }
        }
        
        // ==========================================
        // 3. BÚSQUEDA DIRECTA POR RANGO DE IDs
        // ==========================================
        console.log("\n🔢 3. BÚSQUEDA DIRECTA POR IDs");
        console.log("-".repeat(40));
        
        console.log("🔍 Buscando tickets recientes por ID...");
        
        // Buscar en los últimos 200 tickets creados
        const totalTicketsNum = Number(totalSupply);
        const startId = Math.max(1, totalTicketsNum - 200);
        const endId = totalTicketsNum;
        
        console.log(`📊 Buscando desde ticket #${startId} hasta #${endId}`);
        
        let misTicketsDirectos = [];
        let ticketsEncontrados = 0;
        
        for (let ticketId = startId; ticketId <= endId; ticketId++) {
            try {
                const ticketInfo = await contract.getFullTicketInfo(ticketId);
                ticketsEncontrados++;
                
                if (ticketInfo.ticketOwner.toLowerCase() === deployer.address.toLowerCase()) {
                    misTicketsDirectos.push({
                        id: ticketId,
                        gameDay: Number(ticketInfo.gameDay),
                        numbers: ticketInfo.numbers.map(n => Number(n)),
                        purchaseTime: Number(ticketInfo.purchaseTime),
                        purchaseDate: new Date(Number(ticketInfo.purchaseTime) * 1000).toISOString(),
                        active: ticketInfo.isActive
                    });
                }
                
                // Mostrar progreso cada 50 tickets
                if (ticketId % 50 === 0) {
                    console.log(`   🔄 Verificado hasta ticket #${ticketId}...`);
                }
            } catch (error) {
                // Ticket no existe o error, continuar
                if (ticketId % 50 === 0) {
                    console.log(`   ⚠️ Error en ticket #${ticketId}, continuando...`);
                }
            }
        }
        
        console.log(`✅ Búsqueda completa: ${ticketsEncontrados} tickets verificados`);
        console.log(`👤 Mis tickets encontrados: ${misTicketsDirectos.length}`);
        
        // ==========================================
        // 4. ANÁLISIS DE MIS TICKETS
        // ==========================================
        console.log("\n📋 4. ANÁLISIS DETALLADO DE MIS TICKETS");
        console.log("-".repeat(40));
        
        // Combinar y deduplicar tickets
        const todosTickets = [...misTicketsTotales, ...misTicketsDirectos];
        const ticketsUnicos = todosTickets.filter((ticket, index, arr) => 
            arr.findIndex(t => t.id === ticket.id) === index
        );
        
        console.log(`🎫 Total de mis tickets únicos: ${ticketsUnicos.length}`);
        
        if (ticketsUnicos.length === 0) {
            console.log("❌ No se encontraron tickets de tu propiedad");
            return;
        }
        
        // Agrupar por día
        const ticketsPorDia = {};
        ticketsUnicos.forEach(ticket => {
            if (!ticketsPorDia[ticket.gameDay]) {
                ticketsPorDia[ticket.gameDay] = [];
            }
            ticketsPorDia[ticket.gameDay].push(ticket);
        });
        
        console.log("\n📅 MIS TICKETS POR DÍA:");
        Object.keys(ticketsPorDia).sort((a, b) => Number(a) - Number(b)).forEach(dia => {
            const tickets = ticketsPorDia[dia];
            console.log(`\n📅 DÍA ${dia}: ${tickets.length} tickets`);
            
            // Mostrar los primeros 5 tickets de cada día
            const ticketsAMostrar = tickets.slice(0, 5);
            ticketsAMostrar.forEach(ticket => {
                const horasAtras = Math.floor((Date.now() / 1000 - ticket.purchaseTime) / 3600);
                console.log(`   🎫 #${ticket.id}: [${ticket.numbers.join(', ')}] - hace ${horasAtras}h`);
            });
            
            if (tickets.length > 5) {
                console.log(`   ... y ${tickets.length - 5} tickets más`);
            }
        });
        
        // ==========================================
        // 5. ANÁLISIS TEMPORAL
        // ==========================================
        console.log("\n⏰ 5. ANÁLISIS TEMPORAL");
        console.log("-".repeat(40));
        
        const ahora = Math.floor(Date.now() / 1000);
        const ticketsUltimas24h = ticketsUnicos.filter(ticket => 
            ahora - ticket.purchaseTime < 24 * 3600
        );
        
        console.log(`🔥 Tickets comprados en últimas 24h: ${ticketsUltimas24h.length}`);
        
        if (ticketsUltimas24h.length > 0) {
            console.log("\n🕐 COMPRAS RECIENTES:");
            ticketsUltimas24h.slice(0, 10).forEach(ticket => {
                const horasAtras = Math.floor((ahora - ticket.purchaseTime) / 3600);
                const minutosAtras = Math.floor(((ahora - ticket.purchaseTime) % 3600) / 60);
                console.log(`   🎫 #${ticket.id}: Día ${ticket.gameDay} - hace ${horasAtras}h ${minutosAtras}m`);
            });
            
            if (ticketsUltimas24h.length > 10) {
                console.log(`   ... y ${ticketsUltimas24h.length - 10} más`);
            }
        }
        
        // ==========================================
        // 6. VERIFICACIÓN DE LOS 100 TICKETS
        // ==========================================
        console.log("\n🎯 6. ANÁLISIS DE LOS 100 TICKETS");
        console.log("-".repeat(40));
        
        console.log(`📊 Tickets encontrados: ${ticketsUnicos.length} de 100 esperados`);
        console.log(`📉 Tickets faltantes: ${100 - ticketsUnicos.length}`);
        
        if (ticketsUnicos.length < 100) {
            console.log("\n🔍 POSIBLES CAUSAS:");
            console.log("1. Los tickets están en días fuera del rango buscado");
            console.log("2. Algunas transacciones fallaron");
            console.log("3. Los tickets se compraron en lotes y hay delay");
            console.log("4. Error en el rango de búsqueda de IDs");
            
            console.log("\n💡 SUGERENCIAS:");
            console.log("- Verificar transacciones en BaseScan");
            console.log("- Ampliar rango de búsqueda de días");
            console.log("- Verificar eventos de compra en el contrato");
        } else {
            console.log("\n✅ TODOS LOS TICKETS ENCONTRADOS");
        }
        
        // ==========================================
        // 7. RESUMEN FINAL
        // ==========================================
        console.log("\n" + "=".repeat(60));
        console.log("📋 RESUMEN FINAL");
        console.log("=".repeat(60));
        
        console.log(`👤 Wallet: ${deployer.address}`);
        console.log(`🎫 Total tickets encontrados: ${ticketsUnicos.length}`);
        console.log(`🎯 Tickets esperados: 100`);
        console.log(`📊 Porcentaje encontrado: ${(ticketsUnicos.length / 100 * 100).toFixed(1)}%`);
        
        Object.keys(ticketsPorDia).forEach(dia => {
            console.log(`📅 Día ${dia}: ${ticketsPorDia[dia].length} tickets`);
        });
        
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("❌ Error en la búsqueda:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });