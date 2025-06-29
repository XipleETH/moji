const { ethers } = require("hardhat");

async function main() {
    console.log("🎫 COMPRANDO TICKETS EN AVALANCHE FUJI");
    console.log("=".repeat(50));
    
    const [buyer] = await ethers.getSigners();
    console.log("👤 Comprando con cuenta:", buyer.address);
    
    // Direcciones en Avalanche Fuji
    const CONTRACT_ADDRESS = "0x1B0B1A24983E51d809FBfAc424946B314fEFA271";
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    
    // Conectar a los contratos
    console.log("🔗 Conectando a contratos...");
    const usdcContract = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const lotteryContract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
    
    // Verificar balance de USDC
    const usdcBalance = await usdcContract.balanceOf(buyer.address);
    console.log("💰 Balance USDC:", ethers.formatUnits(usdcBalance, 6), "USDC");
    
    // Verificar precio del ticket
    const ticketPrice = await lotteryContract.TICKET_PRICE();
    console.log("🎫 Precio por ticket:", ethers.formatUnits(ticketPrice, 6), "USDC");
    
    const TICKETS_TO_BUY = 10;
    const totalCost = ticketPrice * BigInt(TICKETS_TO_BUY);
    console.log("💸 Costo total por", TICKETS_TO_BUY, "tickets:", ethers.formatUnits(totalCost, 6), "USDC");
    
    // Verificar que tengamos suficiente USDC
    if (usdcBalance < totalCost) {
        throw new Error(`❌ Balance insuficiente. Necesitas ${ethers.formatUnits(totalCost, 6)} USDC pero solo tienes ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    }
    
    // Verificar allowance actual
    const currentAllowance = await usdcContract.allowance(buyer.address, CONTRACT_ADDRESS);
    console.log("🔐 Allowance actual:", ethers.formatUnits(currentAllowance, 6), "USDC");
    
    // Aprobar gasto si es necesario
    if (currentAllowance < totalCost) {
        console.log("📝 Aprobando gasto de USDC...");
        const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, totalCost);
        console.log("⏳ Esperando confirmación de approve... TX:", approveTx.hash);
        await approveTx.wait();
        console.log("✅ Approve confirmado");
        
        // Verificar nueva allowance
        const newAllowance = await usdcContract.allowance(buyer.address, CONTRACT_ADDRESS);
        console.log("🔐 Nueva allowance:", ethers.formatUnits(newAllowance, 6), "USDC");
    } else {
        console.log("✅ Ya tienes allowance suficiente");
    }
    
    // Generar números aleatorios para los tickets (0-24)
    function generateRandomNumbers() {
        const numbers = [];
        for (let i = 0; i < 4; i++) {
            numbers.push(Math.floor(Math.random() * 25)); // 0-24
        }
        return numbers;
    }
    
    // Comprar tickets
    console.log("\n🎫 COMPRANDO TICKETS:");
    console.log("=".repeat(30));
    
    const purchasedTickets = [];
    
    for (let i = 1; i <= TICKETS_TO_BUY; i++) {
        const numbers = generateRandomNumbers();
        console.log(`🎲 Ticket ${i}: [${numbers.join(', ')}]`);
        
        try {
            const buyTx = await lotteryContract.buyTicket(numbers);
            console.log(`⏳ Comprando ticket ${i}... TX: ${buyTx.hash}`);
            const receipt = await buyTx.wait();
            
            // Buscar el evento TicketPurchased
            const purchaseEvent = receipt.logs.find(log => {
                try {
                    const parsed = lotteryContract.interface.parseLog(log);
                    return parsed.name === 'TicketPurchased';
                } catch {
                    return false;
                }
            });
            
            if (purchaseEvent) {
                const parsed = lotteryContract.interface.parseLog(purchaseEvent);
                const ticketId = parsed.args.ticketId;
                console.log(`✅ Ticket ${i} comprado! ID: ${ticketId}`);
                purchasedTickets.push({
                    id: ticketId.toString(),
                    numbers: numbers,
                    tx: buyTx.hash
                });
            }
            
            // Pequeña pausa entre compras
            if (i < TICKETS_TO_BUY) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
        } catch (error) {
            console.error(`❌ Error comprando ticket ${i}:`, error.message);
        }
    }
    
    // Verificar estado final
    console.log("\n📊 RESUMEN DE COMPRA:");
    console.log("=".repeat(30));
    console.log("✅ Tickets comprados:", purchasedTickets.length);
    console.log("💰 USDC gastado:", ethers.formatUnits(ticketPrice * BigInt(purchasedTickets.length), 6), "USDC");
    
    // Verificar balance final
    const finalBalance = await usdcContract.balanceOf(buyer.address);
    console.log("💰 Balance final USDC:", ethers.formatUnits(finalBalance, 6), "USDC");
    
    // Obtener información del juego actual
    const currentGameDay = await lotteryContract.getCurrentDay();
    const totalTickets = await lotteryContract.ticketCounter();
    
    console.log("\n🎮 ESTADO DEL JUEGO:");
    console.log("=".repeat(25));
    console.log("📅 Día de juego actual:", currentGameDay.toString());
    console.log("🎫 Total tickets vendidos:", totalTickets.toString());
    
    // Mostrar información de los pools
    const dailyPool = await lotteryContract.getDailyPoolInfo(currentGameDay);
    console.log("💰 Pool del día:", ethers.formatUnits(dailyPool.totalCollected, 6), "USDC");
    
    console.log("\n🎫 TUS TICKETS:");
    console.log("=".repeat(20));
    purchasedTickets.forEach((ticket, index) => {
        console.log(`${index + 1}. ID: ${ticket.id} | Números: [${ticket.numbers.join(', ')}]`);
    });
    
    console.log("\n⏰ PRÓXIMO SORTEO:");
    console.log("🗓️ Fecha: Todos los días a las 4:00 UTC");
    console.log("🔗 Ver contratos en: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 ¡COMPRA DE TICKETS COMPLETADA!");
    console.log("🎲 ¡Buena suerte en el sorteo!");
    console.log("=".repeat(50));
    
    return {
        ticketsPurchased: purchasedTickets.length,
        totalCost: ethers.formatUnits(ticketPrice * BigInt(purchasedTickets.length), 6),
        tickets: purchasedTickets,
        currentGameDay: currentGameDay.toString()
    };
}

main()
    .then((result) => {
        console.log("✅ Compra exitosa:", result);
        process.exit(0);
    })
    .catch((error) => {
        console.error("💥 Error en la compra:", error);
        process.exit(1);
    }); 