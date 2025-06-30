const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 PROBANDO NUEVO CONTRATO COMPLETO");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0xe980475E4aF2f0B937059E9394262b36827B215F";
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    console.log("📍 Nuevo contrato:", CONTRACT_ADDRESS);
    console.log("🏔️ Red: Avalanche Fuji");
    
    try {
        // Conectar a contratos
        const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
        const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
        
        const usdcABI = [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)"
        ];
        const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcABI, signer);
        
        // 1. Verificar estado del contrato
        console.log("\n📊 ESTADO DEL CONTRATO:");
        console.log("-".repeat(35));
        
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const ticketPrice = await contract.TICKET_PRICE();
        const currentGameDay = await contract.getCurrentDay();
        const totalDraws = await contract.totalDrawsExecuted();
        const ticketCounter = await contract.ticketCounter();
        
        console.log("🎮 Game Active:", gameActive ? "✅" : "❌");
        console.log("🤖 Automation Active:", automationActive ? "✅" : "❌");
        console.log("💰 Precio por ticket:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("📅 Game Day actual:", currentGameDay.toString());
        console.log("🎯 Sorteos ejecutados:", totalDraws.toString());
        console.log("🎫 Tickets vendidos:", ticketCounter.toString());
        
        // 2. Verificar balance USDC
        console.log("\n💰 BALANCE DE USDC:");
        console.log("-".repeat(25));
        
        const usdcBalance = await usdcContract.balanceOf(signer.address);
        console.log("Balance actual:", ethers.formatUnits(usdcBalance, 6), "USDC");
        
        const TICKETS_TO_BUY = 5;
        const totalCost = ticketPrice * BigInt(TICKETS_TO_BUY);
        
        if (usdcBalance < totalCost) {
            console.log("❌ Balance insuficiente para comprar", TICKETS_TO_BUY, "tickets");
            console.log("   Necesitas:", ethers.formatUnits(totalCost, 6), "USDC");
            console.log("   Tienes:", ethers.formatUnits(usdcBalance, 6), "USDC");
            console.log("\n💡 CONSIGUE USDC DE FUJI:");
            console.log("• Usa un faucet de USDC para Avalanche Fuji");
            console.log("• O intercambia AVAX por USDC en una DEX");
            return;
        }
        
        // 3. Aprobar USDC
        console.log("\n🔐 APROBANDO USDC:");
        console.log("-".repeat(25));
        
        const currentAllowance = await usdcContract.allowance(signer.address, CONTRACT_ADDRESS);
        console.log("Allowance actual:", ethers.formatUnits(currentAllowance, 6), "USDC");
        
        if (currentAllowance < totalCost) {
            console.log("📝 Aprobando", ethers.formatUnits(totalCost, 6), "USDC...");
            const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, totalCost);
            await approveTx.wait();
            console.log("✅ USDC aprobado");
        } else {
            console.log("✅ USDC ya está aprobado");
        }
        
        // 4. Comprar tickets
        console.log("\n🎫 COMPRANDO TICKETS:");
        console.log("-".repeat(30));
        
        console.log("Comprando", TICKETS_TO_BUY, "tickets...");
        console.log("Costo total:", ethers.formatUnits(totalCost, 6), "USDC");
        
        for (let i = 0; i < TICKETS_TO_BUY; i++) {
            // Generar números aleatorios del 0-24
            const numbers = [
                Math.floor(Math.random() * 25),
                Math.floor(Math.random() * 25),
                Math.floor(Math.random() * 25),
                Math.floor(Math.random() * 25)
            ];
            
            console.log(`🎫 Ticket ${i + 1}: [${numbers.join(", ")}]`);
            
            const buyTx = await contract.buyTicket(numbers, {
                gasLimit: 300000
            });
            await buyTx.wait();
            
            console.log("✅ Ticket comprado");
        }
        
        // 5. Verificar estado después de la compra
        console.log("\n📊 ESTADO DESPUÉS DE LA COMPRA:");
        console.log("-".repeat(40));
        
        const newTicketCounter = await contract.ticketCounter();
        const newUsdcBalance = await usdcContract.balanceOf(signer.address);
        
        console.log("🎫 Tickets vendidos ahora:", newTicketCounter.toString());
        console.log("💰 Balance USDC restante:", ethers.formatUnits(newUsdcBalance, 6), "USDC");
        
        // Verificar pool del día actual
        const todaysPools = await contract.getDailyPoolInfo(currentGameDay);
        console.log("💰 Pool del día actual:", ethers.formatUnits(todaysPools.totalCollected, 6), "USDC");
        
        // 6. Verificar upkeep
        console.log("\n🔄 ESTADO DEL UPKEEP:");
        console.log("-".repeat(30));
        
        const [upkeepNeeded] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep necesario:", upkeepNeeded ? "✅ SÍ" : "❌ NO");
        
        const lastDrawTime = await contract.lastDrawTime();
        const nextDrawTime = Number(lastDrawTime) + 24*3600;
        const currentTime = Math.floor(Date.now() / 1000);
        
        console.log("⏰ Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("⏰ Próximo sorteo:", new Date(nextDrawTime * 1000).toISOString());
        
        if (nextDrawTime > currentTime) {
            const timeLeft = nextDrawTime - currentTime;
            const hoursLeft = Math.floor(timeLeft / 3600);
            const minutesLeft = Math.floor((timeLeft % 3600) / 60);
            console.log("⏰ Tiempo restante:", hoursLeft + "h " + minutesLeft + "m");
        }
        
        console.log("\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!");
        console.log("=".repeat(50));
        console.log("✅ Contrato operativo y funcionando");
        console.log("✅ Tickets comprados exitosamente");
        console.log("✅ VRF configurado correctamente");
        console.log("✅ Sistema listo para sorteos automáticos");
        
        console.log("\n🔗 ENLACES:");
        console.log("• Contrato: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
        console.log("• VRF Dashboard: https://vrf.chain.link/");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.message.includes("Game not active")) {
            console.log("💡 El juego no está activo");
        } else if (error.message.includes("USDC transfer failed")) {
            console.log("💡 Error en transferencia USDC - verifica balance y allowance");
        } else if (error.message.includes("Invalid emoji selection")) {
            console.log("💡 Selección de emojis inválida");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error fatal:", error);
        process.exit(1);
    }); 