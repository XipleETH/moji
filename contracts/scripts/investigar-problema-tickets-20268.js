const { ethers } = require("hardhat");

// CONTRATO V6 ACTUAL
const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";

async function main() {
    console.log("🔍 INVESTIGACIÓN: ¿POR QUÉ SOLO 3 TICKETS EN DÍA 20268?");
    console.log("=".repeat(70));
    console.log("📍 Contrato V6:", CONTRACT_ADDRESS);
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Investigando tickets de:", deployer.address);
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // ==========================================
        // 1. INFORMACIÓN TEMPORAL DEL CONTRATO
        // ==========================================
        console.log("\n⏰ 1. INFORMACIÓN TEMPORAL");
        console.log("-".repeat(40));
        
        const [currentGameDay, drawTimeUTC, lastDrawTime, drawInterval] = await Promise.all([
            contract.getCurrentDay(),
            contract.drawTimeUTC(),
            contract.lastDrawTime(),
            contract.DRAW_INTERVAL()
        ]);
        
        console.log("📅 Día actual:", Number(currentGameDay));
        console.log("🕐 Draw Time UTC:", Number(drawTimeUTC) / 3600, "horas (", Number(drawTimeUTC) / 3600, ":00 UTC)");
        console.log("⏰ Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("📈 Intervalo sorteo:", Number(drawInterval) / 3600, "horas");
        
        // Calcular cuándo cambió de día 20267 a 20268
        const horasUTCParaCambio = Number(drawTimeUTC) / 3600;
        console.log(`🔄 El día cambia a las ${horasUTCParaCambio}:00 UTC cada día`);
        
        // ==========================================
        // 2. ANÁLISIS DE TICKETS POR TIMING
        // ==========================================
        console.log("\n🎫 2. ANÁLISIS TEMPORAL DE MIS TICKETS");
        console.log("-".repeat(40));
        
        // Buscar tickets recientes (últimos 300)
        const totalSupply = await contract.totalSupply();
        const startId = Math.max(1, Number(totalSupply) - 300);
        const endId = Number(totalSupply);
        
        console.log(`🔍 Analizando tickets del #${startId} al #${endId}...`);
        
        let misTicketsConTiming = [];
        
        for (let ticketId = startId; ticketId <= endId; ticketId++) {
            try {
                const ticketInfo = await contract.getFullTicketInfo(ticketId);
                
                if (ticketInfo.ticketOwner.toLowerCase() === deployer.address.toLowerCase()) {
                    const purchaseTime = Number(ticketInfo.purchaseTime);
                    const gameDay = Number(ticketInfo.gameDay);
                    
                    misTicketsConTiming.push({
                        id: ticketId,
                        gameDay: gameDay,
                        purchaseTime: purchaseTime,
                        purchaseDate: new Date(purchaseTime * 1000),
                        numbers: ticketInfo.numbers.map(n => Number(n))
                    });
                }
            } catch (error) {
                // Ticket no existe, continuar
            }
        }
        
        console.log(`✅ Encontrados ${misTicketsConTiming.length} tickets míos`);
        
        // ==========================================
        // 3. ANÁLISIS POR DÍAS
        // ==========================================
        console.log("\n📅 3. DISTRIBUCIÓN POR DÍAS");
        console.log("-".repeat(40));
        
        const ticketsPorDia = {};
        misTicketsConTiming.forEach(ticket => {
            if (!ticketsPorDia[ticket.gameDay]) {
                ticketsPorDia[ticket.gameDay] = [];
            }
            ticketsPorDia[ticket.gameDay].push(ticket);
        });
        
        Object.keys(ticketsPorDia).sort((a, b) => Number(a) - Number(b)).forEach(dia => {
            const tickets = ticketsPorDia[dia];
            console.log(`\n📅 DÍA ${dia}: ${tickets.length} tickets`);
            
            if (tickets.length > 0) {
                const primerTicket = tickets[0];
                const ultimoTicket = tickets[tickets.length - 1];
                
                console.log(`   ⏰ Primer ticket: ${primerTicket.purchaseDate.toISOString()}`);
                console.log(`   ⏰ Último ticket: ${ultimoTicket.purchaseDate.toISOString()}`);
                
                const duracion = ultimoTicket.purchaseTime - primerTicket.purchaseTime;
                console.log(`   📊 Duración de compras: ${Math.floor(duracion / 60)} minutos ${duracion % 60} segundos`);
                
                // Mostrar algunos tickets de ejemplo
                console.log(`   🎫 Ejemplos: #${primerTicket.id}, #${tickets[Math.floor(tickets.length/2)]?.id || ultimoTicket.id}, #${ultimoTicket.id}`);
            }
        });
        
        // ==========================================
        // 4. ANÁLISIS DEL MOMENTO DEL CAMBIO
        // ==========================================
        console.log("\n🔄 4. ANÁLISIS DEL CAMBIO DE DÍA");
        console.log("-".repeat(40));
        
        const ticketsDia20267 = ticketsPorDia[20267] || [];
        const ticketsDia20268 = ticketsPorDia[20268] || [];
        
        if (ticketsDia20267.length > 0 && ticketsDia20268.length > 0) {
            const ultimoTicket20267 = ticketsDia20267[ticketsDia20267.length - 1];
            const primerTicket20268 = ticketsDia20268[0];
            
            console.log("🔍 MOMENTO DEL CAMBIO DE DÍA:");
            console.log(`   📅 Último ticket día 20267: #${ultimoTicket20267.id}`);
            console.log(`      ⏰ Tiempo: ${ultimoTicket20267.purchaseDate.toISOString()}`);
            console.log(`   📅 Primer ticket día 20268: #${primerTicket20268.id}`);
            console.log(`      ⏰ Tiempo: ${primerTicket20268.purchaseDate.toISOString()}`);
            
            const tiempoEntreCambio = primerTicket20268.purchaseTime - ultimoTicket20267.purchaseTime;
            console.log(`   ⏱️ Tiempo entre cambio: ${tiempoEntreCambio} segundos`);
            
            // Verificar si el cambio coincide con las 4:00 UTC
            const horaUltimo20267 = ultimoTicket20267.purchaseDate.getUTCHours();
            const horaPrimer20268 = primerTicket20268.purchaseDate.getUTCHours();
            
            console.log(`   🕐 Hora último 20267: ${horaUltimo20267}:${ultimoTicket20267.purchaseDate.getUTCMinutes().toString().padStart(2, '0')} UTC`);
            console.log(`   🕐 Hora primer 20268: ${horaPrimer20268}:${primerTicket20268.purchaseDate.getUTCMinutes().toString().padStart(2, '0')} UTC`);
            
            if (horaPrimer20268 >= 4 && horaUltimo20267 < 4) {
                console.log("   ✅ El cambio de día ocurrió correctamente a las 4:00 UTC");
            } else {
                console.log("   ⚠️ El cambio de día no coincide con las 4:00 UTC esperadas");
            }
        }
        
        // ==========================================
        // 5. HIPÓTESIS SOBRE LOS 100 TICKETS
        // ==========================================
        console.log("\n🤔 5. HIPÓTESIS SOBRE LOS 100 TICKETS");
        console.log("-".repeat(40));
        
        console.log("🔍 ANALIZANDO LAS POSIBLES CAUSAS:");
        
        // Hipótesis 1: Los 100 tickets se compraron el día anterior
        if (ticketsDia20267.length >= 100) {
            console.log(`\n✅ HIPÓTESIS 1: Los 100 tickets están en el día 20267`);
            console.log(`   📊 Total en día 20267: ${ticketsDia20267.length} tickets`);
            console.log(`   💡 Esto significa que cuando ejecutaste buy-100-tickets,`);
            console.log(`      el día de juego aún era 20267, no 20268`);
        }
        
        // Hipótesis 2: Timing de las compras
        if (ticketsDia20268.length === 3) {
            console.log(`\n✅ HIPÓTESIS 2: Solo 3 tickets en día 20268`);
            console.log(`   📊 Tickets en 20268: ${ticketsDia20268.length}`);
            console.log(`   💡 Estos 3 tickets se compraron DESPUÉS del cambio de día`);
            console.log(`      probablemente en una compra separada o manual`);
        }
        
        // ==========================================
        // 6. VERIFICAR SCRIPT BUY-100-TICKETS
        // ==========================================
        console.log("\n📜 6. ANÁLISIS DEL SCRIPT BUY-100-TICKETS");
        console.log("-".repeat(40));
        
        // Buscar patrones en los tickets del día 20267
        if (ticketsDia20267.length > 0) {
            const primerTicket = ticketsDia20267[0];
            const ultimoTicket = ticketsDia20267[ticketsDia20267.length - 1];
            const duracionTotal = ultimoTicket.purchaseTime - primerTicket.purchaseTime;
            
            console.log("🔍 PATRÓN DE COMPRAS DÍA 20267:");
            console.log(`   🎫 Tickets: ${ticketsDia20267.length}`);
            console.log(`   ⏰ Inicio: ${primerTicket.purchaseDate.toISOString()}`);
            console.log(`   ⏰ Final: ${ultimoTicket.purchaseDate.toISOString()}`);
            console.log(`   📊 Duración: ${Math.floor(duracionTotal / 60)} minutos`);
            console.log(`   ⚡ Velocidad: ${(duracionTotal / ticketsDia20267.length).toFixed(2)} segundos por ticket`);
            
            if (ticketsDia20267.length >= 100 && duracionTotal < 3600) {
                console.log(`   ✅ COMPATIBLE con script buy-100-tickets`);
                console.log(`      (100+ tickets en menos de 1 hora)`);
            }
        }
        
        // ==========================================
        // 7. LÍNEA DE TIEMPO DETALLADA
        // ==========================================
        console.log("\n📈 7. LÍNEA DE TIEMPO DETALLADA");
        console.log("-".repeat(40));
        
        // Mostrar transiciones importantes
        const todosTickets = misTicketsConTiming.sort((a, b) => a.purchaseTime - b.purchaseTime);
        
        console.log("🕐 EVENTOS IMPORTANTES:");
        
        // Mostrar algunos tickets clave
        if (todosTickets.length > 0) {
            const primer = todosTickets[0];
            console.log(`   🎫 Primer ticket: #${primer.id} - ${primer.purchaseDate.toISOString()} - Día ${primer.gameDay}`);
            
            // Buscar cambios de día
            let anteriorGameDay = todosTickets[0].gameDay;
            todosTickets.forEach(ticket => {
                if (ticket.gameDay !== anteriorGameDay) {
                    console.log(`   🔄 CAMBIO DE DÍA: ${anteriorGameDay} → ${ticket.gameDay}`);
                    console.log(`      🎫 Ticket #${ticket.id} - ${ticket.purchaseDate.toISOString()}`);
                    anteriorGameDay = ticket.gameDay;
                }
            });
            
            const ultimo = todosTickets[todosTickets.length - 1];
            console.log(`   🎫 Último ticket: #${ultimo.id} - ${ultimo.purchaseDate.toISOString()} - Día ${ultimo.gameDay}`);
        }
        
        // ==========================================
        // 8. CONCLUSIONES
        // ==========================================
        console.log("\n" + "=".repeat(70));
        console.log("📋 CONCLUSIONES");
        console.log("=".repeat(70));
        
        console.log(`🎫 Total de mis tickets analizados: ${misTicketsConTiming.length}`);
        Object.keys(ticketsPorDia).forEach(dia => {
            console.log(`📅 Día ${dia}: ${ticketsPorDia[dia].length} tickets`);
        });
        
        console.log("\n🔍 EXPLICACIÓN MÁS PROBABLE:");
        
        if (ticketsDia20267.length >= 100) {
            console.log("✅ Los 100 tickets del script se compraron para el día 20267");
            console.log("✅ En el momento de la compra, el gameDay aún era 20267");
            console.log("✅ Los 3 tickets del día 20268 son compras posteriores");
            console.log("");
            console.log("💡 ESTO ES NORMAL Y CORRECTO:");
            console.log("   - El script buy-100-tickets funcionó perfectamente");
            console.log("   - Los tickets se asignaron al día correcto (20267)");
            console.log("   - Participaron en el sorteo del día 20267");
            console.log("   - Los 3 tickets del día 20268 son una compra diferente");
        } else {
            console.log("❓ No se encontró el patrón esperado de 100 tickets");
            console.log("🔍 Se necesita más investigación");
        }
        
        console.log("=".repeat(70));
        
    } catch (error) {
        console.error("❌ Error en la investigación:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });