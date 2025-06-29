const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("🔍 VERIFICANDO CONTRATO V2");
    console.log("==========================");
    console.log("👤 Cuenta:", deployer.address);
    
    const contractAddressV2 = "0x836AB58c7B98363b263581cDA17202ac50Cb63ed";
    console.log("📜 Dirección V2:", contractAddressV2);
    
    try {
        // Verificar si hay código en esa dirección
        const provider = ethers.provider;
        const code = await provider.getCode(contractAddressV2);
        
        console.log("\n📋 RESULTADOS:");
        console.log("Code length:", code.length);
        console.log("Tiene código:", code !== "0x" ? "✅ SÍ" : "❌ NO");
        
        if (code === "0x") {
            console.log("\n🚨 PROBLEMA CRÍTICO:");
            console.log("   El contrato V2 NO EXISTE en esa dirección");
            console.log("   Necesitas redesplegarlo o usar la dirección correcta");
            
            // Verificar balance de ETH para asegurar que la red está bien
            const balance = await provider.getBalance(deployer.address);
            console.log(`   Balance cuenta: ${ethers.formatEther(balance)} AVAX`);
            
        } else {
            console.log("\n✅ El contrato V2 SÍ EXISTE");
            console.log("   Vamos a intentar interactuar con él...");
            
            // Intentar cargar el contrato
            const fs = require('fs');
            const contractABI = JSON.parse(fs.readFileSync('./contract-abi-v6.json', 'utf8'));
            const contract = new ethers.Contract(contractAddressV2, contractABI, deployer);
            
            try {
                const gameActive = await contract.gameActive();
                console.log(`   ✅ gameActive(): ${gameActive}`);
                
                const currentDay = await contract.currentGameDay();
                console.log(`   ✅ currentGameDay(): ${currentDay.toString()}`);
                
            } catch (contractError) {
                console.log(`   ❌ Error interactuando: ${contractError.message}`);
                console.log("   🔍 Posible problema de ABI o contrato corrupto");
            }
        }
        
    } catch (error) {
        console.log("❌ Error general:", error.message);
    }
    
    console.log("\n🏁 VERIFICACIÓN COMPLETADA");
}

main().catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
}); 