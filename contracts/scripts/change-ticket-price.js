const { ethers } = require("hardhat");

async function main() {
    // Obtener argumentos de línea de comandos
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log("❌ Uso incorrecto");
        console.log("📖 Uso: node scripts/change-ticket-price.js <CONTRACT_ADDRESS> <NEW_PRICE_IN_USDC_UNITS>");
        console.log("");
        console.log("💡 Ejemplos:");
        console.log("  Para 0.1 USDC: node scripts/change-ticket-price.js 0x123... 100000");
        console.log("  Para 0.2 USDC: node scripts/change-ticket-price.js 0x123... 200000");
        console.log("  Para 1.0 USDC: node scripts/change-ticket-price.js 0x123... 1000000");
        console.log("");
        console.log("ℹ️ USDC tiene 6 decimales, por lo que:");
        console.log("   100000 = 0.1 USDC");
        console.log("   200000 = 0.2 USDC");
        console.log("  1000000 = 1.0 USDC");
        process.exit(1);
    }
    
    const contractAddress = args[0];
    const newPriceInUnits = args[1];
    
    console.log("💰 CAMBIANDO PRECIO DE TICKET");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    
    // Verificar balance
    const balance = await ethers.provider.getBalance(signer.address);
    console.log("💳 Balance:", ethers.formatEther(balance), "AVAX");
    
    // Conectar al contrato
    const contractFactory = await ethers.getContractFactory("LottoMojiCore");
    const contract = contractFactory.attach(contractAddress);
    
    console.log("📍 Contrato:", contractAddress);
    
    try {
        // Obtener precio actual
        const currentPrice = await contract.ticketPrice();
        const currentPriceInUSDC = ethers.formatUnits(currentPrice, 6);
        
        console.log("💵 Precio actual:", currentPriceInUSDC, "USDC");
        
        // Validar nuevo precio
        if (isNaN(newPriceInUnits) || Number(newPriceInUnits) <= 0) {
            throw new Error("❌ Nuevo precio inválido: " + newPriceInUnits);
        }
        
        const newPrice = ethers.parseUnits(newPriceInUnits, 0); // Ya viene en unidades de 6 decimales
        const newPriceInUSDC = ethers.formatUnits(newPrice, 6);
        
        console.log("🎯 Nuevo precio:", newPriceInUSDC, "USDC");
        
        // Confirmar cambio
        if (currentPrice.toString() === newPrice.toString()) {
            console.log("⚠️ El precio ya es el mismo, no se necesita cambio");
            return;
        }
        
        console.log("\n🔄 Ejecutando cambio de precio...");
        
        // Estimar gas
        const gasEstimate = await contract.setTicketPrice.estimateGas(newPrice);
        console.log("⛽ Gas estimado:", gasEstimate.toString());
        
        // Ejecutar transacción
        const tx = await contract.setTicketPrice(newPrice, {
            gasLimit: gasEstimate + ethers.parseUnits("10000", 0) // Agregar margen de gas
        });
        
        console.log("📤 Transacción enviada:", tx.hash);
        console.log("⏳ Esperando confirmación...");
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log("✅ Transacción confirmada!");
            console.log("📋 Block:", receipt.blockNumber);
            console.log("⛽ Gas usado:", receipt.gasUsed.toString());
            
            // Verificar el cambio
            const updatedPrice = await contract.ticketPrice();
            const updatedPriceInUSDC = ethers.formatUnits(updatedPrice, 6);
            
            console.log("\n🎉 PRECIO ACTUALIZADO:");
            console.log("✅ Precio anterior:", currentPriceInUSDC, "USDC");
            console.log("✅ Precio nuevo:", updatedPriceInUSDC, "USDC");
            
            // Buscar evento emitido
            const events = receipt.logs;
            for (let event of events) {
                try {
                    const parsedEvent = contract.interface.parseLog(event);
                    if (parsedEvent.name === "TicketPriceUpdated") {
                        const oldPrice = ethers.formatUnits(parsedEvent.args.oldPrice, 6);
                        const newPrice = ethers.formatUnits(parsedEvent.args.newPrice, 6);
                        console.log("📢 Evento emitido: TicketPriceUpdated");
                        console.log("   - Precio anterior:", oldPrice, "USDC");
                        console.log("   - Precio nuevo:", newPrice, "USDC");
                    }
                } catch (e) {
                    // Evento de otro contrato, ignorar
                }
            }
            
        } else {
            throw new Error("❌ Transacción falló");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        if (error.message.includes("Not authorized")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- Solo el owner del contrato puede cambiar el precio");
            console.log("- Verifica que estés usando la cuenta correcta");
        } else if (error.message.includes("Price must be greater than 0")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- El precio debe ser mayor que 0");
            console.log("- Usa unidades de USDC (6 decimales)");
        }
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 