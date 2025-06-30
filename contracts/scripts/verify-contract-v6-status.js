const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICACIÓN COMPLETA CONTRATO V6");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    const VRF_SUBSCRIPTION_ID = "70846359092368923949796315994230469102226608583606291730577230133525692264419";
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    
    console.log("🌐 Conectando a Base Sepolia...");
    
    try {
        // Usar provider directo para lectura sin necesidad de signers
        const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
        
        // ABI mínimo para las funciones que necesitamos
        const contractABI = [
            "function gameActive() view returns (bool)",
            "function automationActive() view returns (bool)",
            "function emergencyPause() view returns (bool)",
            "function getCurrentDay() view returns (uint256)",
            "function ticketCounter() view returns (uint256)",
            "function lastDrawTime() view returns (uint256)",
            "function DRAW_INTERVAL() view returns (uint256)",
            "function checkUpkeep(bytes) view returns (bool, bytes)",
            "function mainPools() view returns (uint256, uint256, uint256, uint256)",
            "function reserves() view returns (uint256, uint256, uint256)",
            "function dailyPools(uint256) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool, uint256, bool, bool)",
            "function s_subscriptionId() view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
        
        console.log("📋 Contrato:", CONTRACT_ADDRESS);
        
        console.log("\n📋 ESTADO BÁSICO:");
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        const currentGameDay = await contract.getCurrentDay();
        const ticketCounter = await contract.ticketCounter();
        
        console.log("- Game Active:", gameActive);
        console.log("- Automation Active:", automationActive);
        console.log("- Emergency Pause:", emergencyPause);
        console.log("- Current Game Day:", currentGameDay.toString());
        console.log("- Total Tickets:", ticketCounter.toString());
        
        console.log("\n🎲 SORTEO:");
        const lastDrawTime = await contract.lastDrawTime();
        const drawInterval = await contract.DRAW_INTERVAL();
        const [upkeepNeeded] = await contract.checkUpkeep("0x");
        
        const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
        const currentTime = Math.floor(Date.now() / 1000);
        
        console.log("- Last Draw:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        console.log("- Next Draw:", new Date(nextDrawTime * 1000).toLocaleString());
        console.log("- Upkeep Needed:", upkeepNeeded);
        console.log("- Time to Draw:", Math.max(0, nextDrawTime - currentTime), "seconds");
        
        if (upkeepNeeded) {
            console.log("🚨 ¡ACCIÓN REQUERIDA! - Hay un sorteo pendiente");
        }
        
        console.log("\n💰 POOLS:");
        const mainPools = await contract.mainPools();
        const reserves = await contract.reserves();
        
        const totalMain = Number(ethers.formatUnits(
            mainPools[0] + mainPools[1] + mainPools[2] + mainPools[3], 6));
            
        const totalReserves = Number(ethers.formatUnits(
            reserves[0] + reserves[1] + reserves[2], 6));
        
        console.log("- Main Pools Total:", totalMain.toFixed(6), "USDC");
        console.log("  • First Prize:", ethers.formatUnits(mainPools[0], 6), "USDC");
        console.log("  • Second Prize:", ethers.formatUnits(mainPools[1], 6), "USDC");
        console.log("  • Third Prize:", ethers.formatUnits(mainPools[2], 6), "USDC");
        console.log("  • Development:", ethers.formatUnits(mainPools[3], 6), "USDC");
        
        console.log("- Reserves Total:", totalReserves.toFixed(6), "USDC");
        console.log("  • Reserve 1:", ethers.formatUnits(reserves[0], 6), "USDC");
        console.log("  • Reserve 2:", ethers.formatUnits(reserves[1], 6), "USDC");
        console.log("  • Reserve 3:", ethers.formatUnits(reserves[2], 6), "USDC");
        
        const dailyPool = await contract.dailyPools(currentGameDay);
        console.log("- Today's Pool:", ethers.formatUnits(dailyPool[0], 6), "USDC");
        console.log("- Today Drawn:", dailyPool[9]);
        console.log("- Today Distributed:", dailyPool[7]);
        
        console.log("\n🔗 VRF:");
        const subscriptionId = await contract.s_subscriptionId();
        console.log("- Subscription ID:", subscriptionId.toString());
        console.log("- Expected ID:", VRF_SUBSCRIPTION_ID);
        console.log("- VRF Status:", subscriptionId.toString() === VRF_SUBSCRIPTION_ID ? "✅ CORRECTO" : "❌ INCORRECTO");
        
        console.log("\n🏥 DIAGNÓSTICO:");
        const issues = [];
        
        if (!gameActive) issues.push("❌ PROBLEMA: Juego inactivo");
        if (!automationActive) issues.push("❌ PROBLEMA: Automatización inactiva");
        if (emergencyPause) issues.push("❌ PROBLEMA: Pausa de emergencia");
        if (upkeepNeeded) issues.push("🚨 ACCIÓN REQUERIDA: Sorteo pendiente");
        if (subscriptionId.toString() !== VRF_SUBSCRIPTION_ID) issues.push("❌ PROBLEMA: VRF mal configurado");
        
        if (issues.length === 0) {
            console.log("✅ SISTEMA FUNCIONANDO CORRECTAMENTE");
        } else {
            issues.forEach(issue => console.log(issue));
        }
        
        // Información adicional útil
        console.log("\n📊 RESUMEN:");
        console.log("- Total en el sistema:", (totalMain + totalReserves + Number(ethers.formatUnits(dailyPool[0], 6))).toFixed(6), "USDC");
        console.log("- Próximo sorteo en:", Math.max(0, Math.floor((nextDrawTime - currentTime) / 3600)), "horas");
        
        if (upkeepNeeded) {
            console.log("\n⚡ COMANDO PARA EJECUTAR SORTEO:");
            console.log("cd contracts && npx hardhat run scripts/force-draw-v6.js --network base-sepolia");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.log("\n🔧 POSIBLES SOLUCIONES:");
        console.log("1. Verificar conexión a internet");
        console.log("2. Verificar que Base Sepolia esté funcionando");
        console.log("3. Verificar que la dirección del contrato sea correcta");
    }
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
}); 