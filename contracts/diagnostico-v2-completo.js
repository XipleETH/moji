const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 DIAGNÓSTICO COMPLETO CONTRATO V2");
    console.log("========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Cuenta:", deployer.address);
    
    const contractAddress = "0x836AB58c7B98363b263581cDA17202ac50Cb63ed";
    console.log("📜 Contrato V2:", contractAddress);
    
    // Load contract
    const fs = require('fs');
    const contractABI = JSON.parse(fs.readFileSync('./contract-abi-v6.json', 'utf8'));
    const contract = new ethers.Contract(contractAddress, contractABI, deployer);
    
    // Check basic state
    console.log("\n📊 ESTADO BÁSICO:");
    const gameActive = await contract.gameActive();
    const automationActive = await contract.automationActive();
    const emergencyPause = await contract.emergencyPause();
    
    console.log(`   Game Active: ${gameActive ? '✅' : '❌'}`);
    console.log(`   Automation Active: ${automationActive ? '✅' : '❌'}`);
    console.log(`   Emergency Pause: ${emergencyPause ? '🛑' : '✅'}`);
    
    // Check timing
    console.log("\n⏰ TIMING:");
    const lastDrawTime = await contract.lastDrawTime();
    const now = Math.floor(Date.now() / 1000);
    const nextDrawTime = Number(lastDrawTime) + (24 * 60 * 60);
    
    console.log(`   Último sorteo: ${new Date(Number(lastDrawTime) * 1000).toUTCString()}`);
    console.log(`   Próximo sorteo: ${new Date(nextDrawTime * 1000).toUTCString()}`);
    console.log(`   ¿Debe sortear?: ${now >= nextDrawTime ? '✅' : '❌'}`);
    
    // Test checkUpkeep
    console.log("\n🔧 CHECKUPKEEP:");
    const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
    console.log(`   Upkeep Needed: ${upkeepNeeded ? '✅' : '❌'}`);
    
    // Test VRF subscription
    console.log("\n🎲 VRF SUBSCRIPTION:");
    const subscriptionId = await contract.subscriptionId();
    console.log(`   Subscription ID: ${subscriptionId.toString()}`);
    
    // Test static call
    console.log("\n🧪 TEST STATIC CALL:");
    try {
        const performDataTest = ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [true]);
        await contract.performUpkeep.staticCall(performDataTest);
        console.log("   ✅ Static call exitoso");
    } catch (error) {
        console.log(`   ❌ Static call falló: ${error.message}`);
    }
    
    console.log("\n🏁 DIAGNÓSTICO COMPLETADO");
}

main().catch(console.error); 