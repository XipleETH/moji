const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x836AB58c7B98363b263581cDA17202ac50Cb63ed";
    
    console.log("🎲 SORTEO SIMPLE - FORZANDO SIN VERIFICACIONES");
    console.log("=".repeat(55));
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    console.log("📍 Contrato:", contractAddress);
    
    try {
        console.log("\n🔧 STEP 1: Ajustando timing para permitir sorteo...");
        
        // Crear interfaz mínima del contrato
        const contractABI = [
            "function setLastDrawTime(uint256 _timestamp) external",
            "function performUpkeep(bytes calldata performData) external",
            "function gameActive() view returns (bool)",
            "function automationActive() view returns (bool)"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, signer);
        
        // Calcular timestamp que permita sorteo inmediato (25 horas atrás)
        const currentTime = Math.floor(Date.now() / 1000);
        const newLastDrawTime = currentTime - (25 * 3600);
        
        console.log("⏰ Estableciendo lastDrawTime a:", new Date(newLastDrawTime * 1000).toUTCString());
        
        // Ejecutar setLastDrawTime con gas fijo
        console.log("📤 Enviando transacción setLastDrawTime...");
        const timeTx = await contract.setLastDrawTime(newLastDrawTime, {
            gasLimit: 200000,
            gasPrice: ethers.parseUnits("30", "gwei")
        });
        
        console.log("🔗 TX Hash:", timeTx.hash);
        console.log("⏳ Esperando confirmación...");
        
        const timeReceipt = await timeTx.wait();
        console.log("✅ Timing ajustado! Block:", timeReceipt.blockNumber);
        
        console.log("\n🎲 STEP 2: Ejecutando sorteo...");
        
        // Esperar 3 segundos
        console.log("⏳ Esperando 3 segundos...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Ejecutar performUpkeep
        console.log("📤 Enviando transacción performUpkeep...");
        const drawTx = await contract.performUpkeep("0x01", {
            gasLimit: 500000,
            gasPrice: ethers.parseUnits("30", "gwei")
        });
        
        console.log("🔗 TX Hash:", drawTx.hash);
        console.log("⏳ Esperando confirmación...");
        
        const drawReceipt = await drawTx.wait();
        console.log("✅ PerformUpkeep ejecutado! Block:", drawReceipt.blockNumber);
        console.log("⛽ Gas usado:", drawReceipt.gasUsed.toString());
        
        console.log("\n🎯 ¡SORTEO FORZADO EXITOSAMENTE!");
        console.log("=".repeat(40));
        console.log("✅ Se ajustó el timing del contrato");
        console.log("✅ Se ejecutó performUpkeep");
        console.log("✅ Se solicitaron números aleatorios al VRF");
        console.log("⏳ Esperando callback del VRF (~2-5 minutos)");
        console.log("");
        console.log("🔗 Verificar transacciones:");
        console.log("   Timing:", `https://testnet.snowtrace.io/tx/${timeTx.hash}`);
        console.log("   Sorteo:", `https://testnet.snowtrace.io/tx/${drawTx.hash}`);
        console.log("");
        console.log("📋 Verificar contrato:", `https://testnet.snowtrace.io/address/${contractAddress}`);
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        if (error.message.includes("replacement transaction underpriced")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- Aumenta el gas price en el script");
            console.log("- O espera un momento y vuelve a intentar");
        } else if (error.message.includes("nonce")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- Hay transacciones pendientes");
            console.log("- Espera a que se confirmen o reinicia la wallet");
        } else if (error.message.includes("insufficient funds")) {
            console.log("\n💡 SOLUCIÓN:");
            console.log("- No tienes suficiente AVAX para gas");
            console.log("- Consigue más AVAX del faucet");
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