const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VERIFICACION SIMPLE DEL SORTEO");
    console.log("================================");
    
    const CONTRACT_ADDRESS = "0x900ebdF6C0807E4d3007e07009BDeDFc5E63fbB1";
    
    try {
        console.log("📍 Contrato:", CONTRACT_ADDRESS);
        
        // Verificar si el contrato existe
        const code = await ethers.provider.getCode(CONTRACT_ADDRESS);
        if (code === "0x") {
            console.log("❌ ERROR: El contrato no existe en esta dirección");
            return;
        }
        console.log("✅ Contrato existe");
        
        const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
        
        // Obtener datos básicos paso a paso
        console.log("\n📊 OBTENIENDO DATOS...");
        
        let currentGameDay;
        try {
            currentGameDay = await contract.getCurrentDay();
            console.log("✅ Game Day actual:", currentGameDay.toString());
        } catch (error) {
            console.log("❌ Error obteniendo getCurrentDay:", error.message);
            return;
        }
        
        let lastDrawTime;
        try {
            lastDrawTime = await contract.lastDrawTime();
            console.log("✅ Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
        } catch (error) {
            console.log("❌ Error obteniendo lastDrawTime:", error.message);
        }
        
        let totalDraws;
        try {
            totalDraws = await contract.totalDrawsExecuted();
            console.log("✅ Total sorteos ejecutados:", totalDraws.toString());
        } catch (error) {
            console.log("❌ Error obteniendo totalDrawsExecuted:", error.message);
        }
        
        let ticketCounter;
        try {
            ticketCounter = await contract.ticketCounter();
            console.log("✅ Total tickets:", ticketCounter.toString());
        } catch (error) {
            console.log("❌ Error obteniendo ticketCounter:", error.message);
        }
        
        // Obtener información del día actual
        console.log("\n📅 INFORMACION DEL DIA", currentGameDay.toString());
        try {
            const todayPool = await contract.getDailyPoolInfo(currentGameDay);
            console.log("✅ Total recolectado:", ethers.formatUnits(todayPool[0], 6), "USDC");
            console.log("✅ Main pool portion:", ethers.formatUnits(todayPool[1], 6), "USDC");
            console.log("✅ Reserve portion:", ethers.formatUnits(todayPool[2], 6), "USDC");
            console.log("✅ Distribuido:", todayPool[3] ? "SÍ" : "NO");
            console.log("✅ Sorteado:", todayPool[4] ? "SÍ" : "NO");
            
            if (todayPool[4]) {
                console.log("✅ Números ganadores:", Array.from(todayPool[5]).join(", "));
                
                // Mapeo de emojis
                const EMOJI_MAP = [
                    "🎮", "🎲", "🎯", "🎸", "🎨",
                    "💎", "💰", "💸", "🏆", "🎁", 
                    "🚀", "🌙", "⭐", "✨", "🌟",
                    "🎭", "🎪", "🎢", "🎡", "🎠",
                    "🍀", "🌈", "⚡", "🔥", "💫"
                ];
                
                const winningEmojis = Array.from(todayPool[5]).map(num => EMOJI_MAP[num]).join(" ");
                console.log("✅ Emojis ganadores:", winningEmojis);
            }
        } catch (error) {
            console.log("❌ Error obteniendo pool del día:", error.message);
        }
        
        // Obtener pools principales
        console.log("\n💰 MAIN POOLS:");
        try {
            const mainPools = await contract.getMainPoolBalances();
            console.log("✅ First Prize Pool:", ethers.formatUnits(mainPools[0], 6), "USDC");
            console.log("✅ Second Prize Pool:", ethers.formatUnits(mainPools[1], 6), "USDC");
            console.log("✅ Third Prize Pool:", ethers.formatUnits(mainPools[2], 6), "USDC");
            console.log("✅ Development Pool:", ethers.formatUnits(mainPools[3], 6), "USDC");
        } catch (error) {
            console.log("❌ Error obteniendo main pools:", error.message);
        }
        
        // Obtener reserves
        console.log("\n🏦 RESERVE POOLS:");
        try {
            const reserves = await contract.getReserveBalances();
            console.log("✅ First Prize Reserve:", ethers.formatUnits(reserves[0], 6), "USDC");
            console.log("✅ Second Prize Reserve:", ethers.formatUnits(reserves[1], 6), "USDC");
            console.log("✅ Third Prize Reserve:", ethers.formatUnits(reserves[2], 6), "USDC");
        } catch (error) {
            console.log("❌ Error obteniendo reserves:", error.message);
        }
        
        // Balance del contrato
        console.log("\n💰 BALANCE DEL CONTRATO:");
        try {
            const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
            const usdcABI = ["function balanceOf(address) view returns (uint256)"];
            const usdc = new ethers.Contract(USDC_ADDRESS, usdcABI, ethers.provider);
            const contractBalance = await usdc.balanceOf(CONTRACT_ADDRESS);
            console.log("✅ USDC en contrato:", ethers.formatUnits(contractBalance, 6), "USDC");
        } catch (error) {
            console.log("❌ Error obteniendo balance:", error.message);
        }
        
    } catch (error) {
        console.log("❌ ERROR GENERAL:", error.message);
    }
    
    console.log("\n================================");
    console.log("🎯 VERIFICACION COMPLETADA");
}

main().catch(console.error); 