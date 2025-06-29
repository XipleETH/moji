const { ethers } = require("hardhat");

async function main() {
    console.log("🏔️ COMPRANDO 200 TICKETS EN AVALANCHE FUJI");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0x1B0B1A24983E51d809FBfAc424946B314fEFA271";
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    
    // Obtener signer
    const [signer] = await ethers.getSigners();
    console.log("👤 Comprando con cuenta:", signer.address);
    console.log("💰 Balance inicial:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "AVAX");
    
    // Conectar a contratos
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    const usdcABI = [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];
    const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcABI, signer);
    
    console.log("\n📋 INFORMACIÓN DEL CONTRATO:");
    
    // Verificar estado del contrato
    const gameActive = await contract.gameActive();
    const ticketPrice = await contract.TICKET_PRICE();
    const currentGameDay = await contract.currentGameDay();
    const ticketCounter = await contract.ticketCounter();
    
    console.log("- Game Active:", gameActive);
    console.log("- Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
    console.log("- Current Game Day:", currentGameDay.toString());
    console.log("- Tickets vendidos hasta ahora:", ticketCounter.toString());
    console.log("- Red: Avalanche Fuji Testnet");
    
    if (!gameActive) {
        console.error("❌ El juego no está activo!");
        return;
    }
    
    // Verificar balance USDC
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const totalCost = ticketPrice * 200n; // 200 tickets
    
    console.log("\n💰 INFORMACIÓN FINANCIERA:");
    console.log("- Balance USDC:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("- Costo total (200 tickets):", ethers.formatUnits(totalCost, 6), "USDC");
    console.log("- Costo por ticket:", ethers.formatUnits(ticketPrice, 6), "USDC");
    
    if (usdcBalance < totalCost) {
        console.error("❌ Balance USDC insuficiente!");
        console.error(`Necesitas ${ethers.formatUnits(totalCost, 6)} USDC pero solo tienes ${ethers.formatUnits(usdcBalance, 6)} USDC`);
        return;
    }
    
    // Verificar allowance
    const currentAllowance = await usdcContract.allowance(signer.address, CONTRACT_ADDRESS);
    console.log("- Allowance actual:", ethers.formatUnits(currentAllowance, 6), "USDC");
    
    if (currentAllowance < totalCost) {
        console.log("\n🔐 APROBANDO USDC...");
        const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, totalCost);
        console.log("📡 Tx de aprobación enviada:", approveTx.hash);
        await approveTx.wait();
        console.log("✅ USDC aprobado!");
    } else {
        console.log("✅ USDC ya está aprobado");
    }
    
    // Generar 200 combinaciones aleatorias
    console.log("\n🎲 GENERANDO 200 COMBINACIONES ALEATORIAS...");
    
    const ticketCombinations = [];
    for (let i = 0; i < 200; i++) {
        const combination = [
            Math.floor(Math.random() * 25), // 0-24
            Math.floor(Math.random() * 25),
            Math.floor(Math.random() * 25),
            Math.floor(Math.random() * 25)
        ];
        ticketCombinations.push(combination);
    }
    
    // Mapeo de emojis para mostrar
    const EMOJI_MAP = [
        '🎮', '🎲', '🎯', '🎸', '🎨', // Gaming & Art (0-4)
        '💎', '💰', '💸', '🏆', '🎁', // Money & Prizes (5-9)
        '🚀', '🌙', '⭐', '✨', '🌟', // Space & Stars (10-14)
        '🎭', '🎪', '🎢', '🎡', '🎠', // Entertainment (15-19)
        '🍀', '🌈', '⚡', '🔥', '💫'  // Luck & Magic (20-24)
    ];
    
    console.log("✅ Combinaciones generadas:");
    for (let i = 0; i < Math.min(10, ticketCombinations.length); i++) {
        const combo = ticketCombinations[i];
        const emojis = combo.map(num => EMOJI_MAP[num]).join(' ');
        console.log(`  ${i + 1}. [${combo.join(', ')}] → ${emojis}`);
    }
    if (ticketCombinations.length > 10) {
        console.log(`  ... y ${ticketCombinations.length - 10} combinaciones más`);
    }
    
    // Comprar tickets en lotes
    console.log("\n🛒 COMPRANDO TICKETS EN AVALANCHE FUJI...");
    
    const BATCH_SIZE = 5; // Comprar de 5 en 5 para evitar problemas de gas
    let successCount = 0;
    let failCount = 0;
    const transactionHashes = [];
    
    for (let batchStart = 0; batchStart < ticketCombinations.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, ticketCombinations.length);
        const currentBatch = ticketCombinations.slice(batchStart, batchEnd);
        
        console.log(`\n📦 Lote ${Math.floor(batchStart / BATCH_SIZE) + 1}: Tickets ${batchStart + 1}-${batchEnd}`);
        
        for (let i = 0; i < currentBatch.length; i++) {
            const ticketIndex = batchStart + i;
            const combination = currentBatch[i];
            
            try {
                console.log(`🎫 Comprando ticket ${ticketIndex + 1}/200: [${combination.join(', ')}]`);
                
                const buyTx = await contract.buyTicket(combination, {
                    gasLimit: 800000 // Gas limit más alto para Avalanche
                });
                
                console.log(`📡 Tx enviada: ${buyTx.hash}`);
                const receipt = await buyTx.wait();
                
                transactionHashes.push(buyTx.hash);
                successCount++;
                
                console.log(`✅ Ticket ${ticketIndex + 1} comprado en bloque ${receipt.blockNumber}`);
                
                // Pequeña pausa entre transacciones
                if (i < currentBatch.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (error) {
                console.error(`❌ Error comprando ticket ${ticketIndex + 1}:`, error.message);
                failCount++;
                
                // Si hay muchos errores consecutivos, parar
                if (failCount > 15) {
                    console.error("💥 Demasiados errores consecutivos. Parando...");
                    break;
                }
            }
        }
        
        // Pausa entre lotes
        if (batchEnd < ticketCombinations.length) {
            console.log("⏳ Esperando 3 segundos antes del siguiente lote...");
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log("\n📊 RESUMEN DE COMPRAS EN AVALANCHE FUJI:");
    console.log("=".repeat(50));
    console.log(`✅ Tickets comprados exitosamente: ${successCount}`);
    console.log(`❌ Tickets fallidos: ${failCount}`);
    console.log(`💰 USDC gastado: ${ethers.formatUnits(ticketPrice * BigInt(successCount), 6)} USDC`);
    console.log(`📡 Transacciones realizadas: ${transactionHashes.length}`);
    console.log(`🏔️ Red: Avalanche Fuji Testnet`);
    
    if (successCount > 0) {
        console.log("\n🎉 ¡COMPRAS COMPLETADAS EN AVALANCHE FUJI!");
        console.log("📋 Hashes de transacciones:");
        transactionHashes.slice(0, 10).forEach((hash, index) => {
            console.log(`  ${index + 1}. https://testnet.snowtrace.io/tx/${hash}`);
        });
        
        if (transactionHashes.length > 10) {
            console.log(`  ... y ${transactionHashes.length - 10} transacciones más`);
        }
        
        // Verificar estado final
        console.log("\n🔍 VERIFICANDO ESTADO FINAL...");
        const finalTicketCounter = await contract.ticketCounter();
        const finalUsdcBalance = await usdcContract.balanceOf(signer.address);
        
        console.log("- Tickets totales en el contrato:", finalTicketCounter.toString());
        console.log("- Balance USDC final:", ethers.formatUnits(finalUsdcBalance, 6), "USDC");
        
        console.log("\n🎫 ¡Tickets listos para el próximo sorteo!");
        console.log("⏰ Próximo sorteo: Cada día a las 04:00 UTC (11:00 PM Colombia)");
        console.log("🏔️ Avalanche Fuji: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
        
    } else {
        console.log("\n💥 No se pudieron comprar tickets.");
        console.log("🔧 Verifica:");
        console.log("- Balance USDC suficiente");
        console.log("- Aprobación de USDC");
        console.log("- Estado del contrato");
        console.log("- Conexión a Avalanche Fuji");
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🏔️ COMPRA DE TICKETS EN AVALANCHE FUJI COMPLETADA");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 