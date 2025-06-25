const { ethers } = require("hardhat");

// NEW CONTRACT V3 ADDRESS
const CONTRACT_ADDRESS = "0xfc1a8Bc0180Fc615810d62374F16C4c026141031";

async function main() {
    console.log("🕒 CORRIGIENDO TIMING PARA MEDIANOCHE SÃO PAULO");
    console.log("=".repeat(65));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    console.log("📍 New Contract:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. Verificar estado actual
        console.log("\n📊 ESTADO ACTUAL");
        console.log("-".repeat(40));
        
        const lastDrawTime = await contract.lastDrawTime();
        const drawInterval = await contract.DRAW_INTERVAL();
        const currentGameDay = await contract.getCurrentDay();
        
        console.log("🎲 Current Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        console.log("📅 Current Game Day:", Number(currentGameDay));
        
        // 2. Calcular el timing correcto para medianoche SP
        console.log("\n🔧 CALCULANDO TIMING CORRECTO");
        console.log("-".repeat(40));
        
        const now = Math.floor(Date.now() / 1000);
        
        // Crear fecha para medianoche São Paulo (3:00 UTC)
        const currentUTC = new Date(now * 1000);
        const nextMidnightUTC = new Date(currentUTC);
        
        // Si ya pasó las 3:00 UTC de hoy, programar para mañana
        if (currentUTC.getUTCHours() >= 3) {
            nextMidnightUTC.setUTCDate(nextMidnightUTC.getUTCDate() + 1);
        }
        
        nextMidnightUTC.setUTCHours(3, 0, 0, 0); // 3:00 UTC = midnight São Paulo
        
        const correctNextDraw = Math.floor(nextMidnightUTC.getTime() / 1000);
        const correctLastDraw = correctNextDraw - Number(drawInterval);
        
        console.log("🎯 Correct Last Draw Time:", correctLastDraw);
        console.log("🎯 Which is:", new Date(correctLastDraw * 1000).toLocaleString());
        console.log("🎯 Next draw will be:", new Date(correctNextDraw * 1000).toLocaleString());
        console.log("🎯 São Paulo time:", new Date(correctNextDraw * 1000).toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            hour12: false 
        }));
        
        // 3. Aplicar corrección
        console.log("\n⚡ APLICANDO CORRECCIÓN");
        console.log("-".repeat(40));
        
        const setTimeTx = await contract.setLastDrawTime(correctLastDraw);
        await setTimeTx.wait();
        
        console.log("✅ Timing corregido exitosamente!");
        console.log("📡 Transaction:", setTimeTx.hash);
        
        // 4. Verificar corrección
        console.log("\n✅ VERIFICACIÓN");
        console.log("-".repeat(40));
        
        const newLastDrawTime = await contract.lastDrawTime();
        const newGameDay = await contract.getCurrentDay();
        const nextDraw = Number(newLastDrawTime) + Number(drawInterval);
        
        console.log("🕒 New Last Draw Time:", new Date(Number(newLastDrawTime) * 1000).toLocaleString());
        console.log("📅 New Game Day:", Number(newGameDay));
        console.log("⏰ Next Draw Time:", new Date(nextDraw * 1000).toLocaleString());
        
        const nextDrawSP = new Date(nextDraw * 1000).toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false 
        });
        
        console.log("🌎 Next Draw São Paulo:", nextDrawSP);
        console.log("✅ Is Midnight SP?:", nextDrawSP === '00:00' ? "YES! 🎉" : `NO (${nextDrawSP})`);
        
        // 5. Verificar upkeep
        console.log("\n🔄 VERIFICANDO UPKEEP");
        console.log("-".repeat(40));
        
        const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
        console.log("🔄 Upkeep needed:", upkeepNeeded);
        
        if (upkeepNeeded) {
            console.log("⚠️ Upkeep is needed - this is normal for a new contract");
        } else {
            console.log("✅ Upkeep not needed - timing is correct");
        }
        
        console.log("\n✅ TIMING CORRECTION COMPLETED");
        console.log("=".repeat(65));
        
    } catch (error) {
        console.error("💥 Error:", error);
        
        if (error.reason) {
            console.error("📋 Reason:", error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 