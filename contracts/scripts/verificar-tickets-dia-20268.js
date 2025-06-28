const { ethers } = require("hardhat");

// CONTRATO V6 ACTUAL
const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
const DIA_OBJETIVO = 20268; // El día que queremos verificar

async function main() {
    console.log("🎫 VERIFICACIÓN DE TICKETS DÍA 20268");
    console.log("=".repeat(50));
    console.log("📍 Contrato V6:", CONTRACT_ADDRESS);
    console.log("📅 Día objetivo:", DIA_OBJETIVO);
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Verificando con wallet:", deployer.address);
    
    try {
        // Conectar al contrato
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        // ==========================================
        // 1. VERIFICAR DÍA ACTUAL Y ESTADO
        // ==========================================
        console.log("\n📊 1. ESTADO DEL SISTEMA");
        console.log("-".repeat(30));
        
        const currentGameDay = await contract.getCurrentDay();
        console.log("📅 Día actual del contrato:", Number(currentGameDay));
        console.log("🎯 Día que verificamos:", DIA_OBJETIVO);
        
        if (Number(currentGameDay) === DIA_OBJETIVO) {
            console.log("✅ Estamos verificando el día actual");
        } else if (Number(currentGameDay) < DIA_OBJETIVO) {
            console.log("🔮 Estamos verificando un día futuro");
        } else {
            console.log("📜 Estamos verificando un día pasado");
        }
        
        // ==========================================
        // 2. OBTENER TICKETS DEL DÍA 20268
        // ==========================================
        console.log("\n🎫 2. TICKETS DEL DÍA", DIA_OBJETIVO);
        console.log("-".repeat(30));
        
        let ticketsDelDia;
        try {
            ticketsDelDia = await contract.getGameDayTickets(DIA_OBJETIVO);
            console.log("📊 Total tickets encontrados:", ticketsDelDia.length);
        } catch (error) {
            console.log("❌ Error obteniendo tickets:", error.message);
            console.log("ℹ️ Esto puede significar que no hay tickets para este día aún");
            return;
        }
        
        if (ticketsDelDia.length === 0) {
            console.log("❌ No hay tickets para el día", DIA_OBJETIVO);
            console.log("💡 Esto significa que los tickets recientes no están para este día");
            return;
        }
        
        // ==========================================
        // 3. ANÁLISIS DETALLADO DE CADA TICKET
        // ==========================================
        console.log("\n📋 3. ANÁLISIS DETALLADO DE TICKETS");
        console.log("-".repeat(30));
        
        const ticketsDetallados = [];
        
        for (let i = 0; i < ticketsDelDia.length; i++) {
            const ticketId = ticketsDelDia[i];
            
            try {
                const ticketInfo = await contract.getFullTicketInfo(ticketId);
                
                const ticketData = {
                    id: Number(ticketId),
                    owner: ticketInfo.ticketOwner,
                    numbers: ticketInfo.numbers.map(n => Number(n)),
                    gameDay: Number(ticketInfo.gameDay),
                    isActive: ticketInfo.isActive,
                    purchaseTime: Number(ticketInfo.purchaseTime),
                    purchaseDate: new Date(Number(ticketInfo.purchaseTime) * 1000).toISOString(),
                    eligibleForReserve: ticketInfo.eligibleForReserve,
                    matches: Number(ticketInfo.matches)
                };
                
                ticketsDetallados.push(ticketData);
                
                console.log(`\n🎫 TICKET #${ticketData.id}`);
                console.log(`   👤 Owner: ${ticketData.owner}`);
                console.log(`   🔢 Numbers: [${ticketData.numbers.join(', ')}]`);
                console.log(`   📅 Game Day: ${ticketData.gameDay}`);
                console.log(`   ✅ Active: ${ticketData.isActive}`);
                console.log(`   ⏰ Purchase Time: ${ticketData.purchaseDate}`);
                console.log(`   🏦 Eligible for Reserve: ${ticketData.eligibleForReserve}`);
                console.log(`   🎯 Matches: ${ticketData.matches}`);
                
                // Verificar si fue comprado recientemente (últimas 24 horas)
                const now = Math.floor(Date.now() / 1000);
                const timeSincePurchase = now - ticketData.purchaseTime;
                const hoursAgo = Math.floor(timeSincePurchase / 3600);
                
                if (hoursAgo < 24) {
                    console.log(`   🔥 RECIENTE: Comprado hace ${hoursAgo} horas`);
                } else {
                    const daysAgo = Math.floor(hoursAgo / 24);
                    console.log(`   📅 Comprado hace ${daysAgo} días`);
                }
                
            } catch (error) {
                console.log(`❌ Error obteniendo detalles del ticket ${ticketId}:`, error.message);
            }
        }
        
        // ==========================================
        // 4. ANÁLISIS DE COMPRAS RECIENTES
        // ==========================================
        console.log("\n🔥 4. ANÁLISIS DE COMPRAS RECIENTES");
        console.log("-".repeat(30));
        
        const now = Math.floor(Date.now() / 1000);
        const ticketsRecientes = ticketsDetallados.filter(ticket => {
            const timeSincePurchase = now - ticket.purchaseTime;
            return timeSincePurchase < (24 * 3600); // Últimas 24 horas
        });
        
        if (ticketsRecientes.length > 0) {
            console.log(`✅ Encontrados ${ticketsRecientes.length} tickets comprados en las últimas 24 horas:`);
            
            ticketsRecientes.forEach(ticket => {
                const hoursAgo = Math.floor((now - ticket.purchaseTime) / 3600);
                const minutesAgo = Math.floor(((now - ticket.purchaseTime) % 3600) / 60);
                console.log(`   🎫 Ticket #${ticket.id}: [${ticket.numbers.join(', ')}] - hace ${hoursAgo}h ${minutesAgo}m`);
            });
        } else {
            console.log("❌ No se encontraron tickets comprados en las últimas 24 horas");
        }
        
        // ==========================================
        // 5. VERIFICACIÓN POR WALLET
        // ==========================================
        console.log("\n👤 5. TICKETS DE TU WALLET");
        console.log("-".repeat(30));
        
        const misTickets = ticketsDetallados.filter(ticket => 
            ticket.owner.toLowerCase() === deployer.address.toLowerCase()
        );
        
        if (misTickets.length > 0) {
            console.log(`✅ Tienes ${misTickets.length} tickets para el día ${DIA_OBJETIVO}:`);
            
            misTickets.forEach(ticket => {
                const hoursAgo = Math.floor((now - ticket.purchaseTime) / 3600);
                console.log(`   🎫 Ticket #${ticket.id}: [${ticket.numbers.join(', ')}] - hace ${hoursAgo}h`);
            });
        } else {
            console.log("❌ No tienes tickets para el día", DIA_OBJETIVO);
        }
        
        // ==========================================
        // 6. ESTADO DEL SORTEO PARA ESTE DÍA
        // ==========================================
        console.log("\n🎲 6. ESTADO DEL SORTEO DÍA", DIA_OBJETIVO);
        console.log("-".repeat(30));
        
        try {
            const dailyPoolInfo = await contract.getDailyPoolInfo(DIA_OBJETIVO);
            
            console.log("🎯 Ya sorteado:", dailyPoolInfo.drawn);
            console.log("📦 Ya distribuido:", dailyPoolInfo.distributed);
            console.log("💰 Total recolectado:", ethers.formatUnits(dailyPoolInfo.totalCollected, 6), "USDC");
            console.log("🔢 Números ganadores:", dailyPoolInfo.winningNumbers.map(n => Number(n)));
            
            if (!dailyPoolInfo.drawn) {
                console.log("✅ Los tickets están esperando el sorteo");
                
                // Calcular ingresos esperados
                const expectedRevenue = ticketsDelDia.length * 200000; // 0.2 USDC por ticket
                console.log(`💰 Ingresos esperados: ${ethers.formatUnits(expectedRevenue, 6)} USDC`);
            } else {
                console.log("ℹ️ Este día ya fue sorteado");
            }
            
        } catch (error) {
            console.log("⚠️ No hay información de pool para este día aún");
        }
        
        // ==========================================
        // 7. RESUMEN FINAL
        // ==========================================
        console.log("\n" + "=".repeat(50));
        console.log("📋 RESUMEN DE VERIFICACIÓN");
        console.log("=".repeat(50));
        
        console.log(`📅 Día verificado: ${DIA_OBJETIVO}`);
        console.log(`🎫 Total tickets: ${ticketsDelDia.length}`);
        console.log(`🔥 Tickets recientes (24h): ${ticketsRecientes.length}`);
        console.log(`👤 Tus tickets: ${misTickets.length}`);
        
        if (ticketsDelDia.length > 0) {
            console.log("\n✅ CONFIRMACIÓN:");
            console.log(`✅ Hay ${ticketsDelDia.length} tickets esperando el sorteo del día ${DIA_OBJETIVO}`);
            
            if (ticketsRecientes.length > 0) {
                console.log(`✅ ${ticketsRecientes.length} de estos tickets fueron comprados recientemente`);
            }
            
            if (misTickets.length > 0) {
                console.log(`✅ Tienes ${misTickets.length} tickets participando en este sorteo`);
            }
            
            console.log("\n🚀 ESTOS TICKETS PARTICIPARÁN EN EL PRÓXIMO SORTEO");
        } else {
            console.log("\n❌ NO HAY TICKETS PARA EL DÍA", DIA_OBJETIVO);
        }
        
        console.log("=".repeat(50));
        
    } catch (error) {
        console.error("❌ Error en la verificación:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });