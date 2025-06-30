const { ethers } = require("hardhat");

// CONTRACT V3 ADDRESS
const CONTRACT_ADDRESS = "0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5";

// CORRECT SUBSCRIPTION ID
const CORRECT_SUBSCRIPTION_ID = "105961847727705490544354750783936451991128107961690295417839588082464327658827";

async function main() {
    console.log("🔧 ACTUALIZACION DE SUBSCRIPTION ID - LOTTOMOJI V3");
    console.log("=".repeat(65));
    console.log("⚠️ ADVERTENCIA: Esto requiere funciones especiales en el contrato");
    console.log("=".repeat(65));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. Verificar owner
        const owner = await contract.owner();
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("❌ ERROR: No eres el owner del contrato");
            return;
        }
        
        console.log("✅ Owner verificado");
        
        // 2. Mostrar estado actual
        console.log("\n📊 ESTADO ACTUAL");
        console.log("-".repeat(40));
        
        const currentSubscriptionId = await contract.subscriptionId();
        console.log("🔗 Current Subscription ID:", currentSubscriptionId.toString());
        console.log("🎯 Target Subscription ID:", CORRECT_SUBSCRIPTION_ID);
        
        // 3. Método 1: Crear un nuevo contrato con función de update
        console.log("\n🔧 METODO 1: CONTRATO CON FUNCION UPDATE");
        console.log("-".repeat(40));
        console.log("Necesitamos agregar esta función al contrato:");
        console.log(`
function setSubscriptionId(uint256 _subscriptionId) external onlyOwner {
    subscriptionId = _subscriptionId;
    emit SubscriptionIdUpdated(subscriptionId, _subscriptionId);
}
        `);
        
        // 4. Método 2: Verificar si podemos usar delegate call o similar
        console.log("\n🔧 METODO 2: REDESPLIEGUE CONSERVANDO ESTADO");
        console.log("-".repeat(40));
        
        console.log("Pasos para redesplegar conservando el estado:");
        console.log("1. Exportar todos los tickets actuales");
        console.log("2. Exportar pools actuales");
        console.log("3. Redesplegar con subscription ID correcto");
        console.log("4. Re-importar estado (tickets, pools)");
        
        // 5. Exportar estado actual para respaldo
        console.log("\n📥 EXPORTANDO ESTADO ACTUAL PARA RESPALDO");
        console.log("-".repeat(40));
        
        const currentGameDay = await contract.getCurrentDay();
        const ticketCounter = await contract.ticketCounter();
        const totalSupply = await contract.totalSupply();
        
        console.log("📅 Current Game Day:", Number(currentGameDay));
        console.log("🎫 Ticket Counter:", Number(ticketCounter));
        console.log("📊 Total Supply:", Number(totalSupply));
        
        // Obtener main pools
        const mainPools = await contract.mainPools();
        console.log("\n💰 MAIN POOLS:");
        console.log("🥇 First Prize:", ethers.formatUnits(mainPools[0], 6), "USDC");
        console.log("🥈 Second Prize:", ethers.formatUnits(mainPools[1], 6), "USDC");
        console.log("🥉 Third Prize:", ethers.formatUnits(mainPools[2], 6), "USDC");
        console.log("🛠️ Development:", ethers.formatUnits(mainPools[3], 6), "USDC");
        
        // Obtener reserves
        const reserves = await contract.reserves();
        console.log("\n🛡️ RESERVES:");
        console.log("🥇 First Reserve:", ethers.formatUnits(reserves[0], 6), "USDC");
        console.log("🥈 Second Reserve:", ethers.formatUnits(reserves[1], 6), "USDC");
        console.log("🥉 Third Reserve:", ethers.formatUnits(reserves[2], 6), "USDC");
        
        // 6. Recomendación
        console.log("\n💡 RECOMENDACION");
        console.log("-".repeat(40));
        console.log("Dado que el contrato no tiene función setSubscriptionId,");
        console.log("la opción MÁS SIMPLE es:");
        console.log("");
        console.log("1. ✅ Ya tienes el contrato agregado como consumer");
        console.log("2. 🔄 Fondear la subscription que usa el contrato:");
        console.log("   Subscription ID:", currentSubscriptionId.toString());
        console.log("3. Ve a https://vrf.chain.link/");
        console.log("4. Busca esa subscription");
        console.log("5. Agrégale fondos LINK");
        console.log("");
        console.log("Esto es MÁS RÁPIDO que redesplegar y mantiene todo el estado.");
        
        // 7. Intentar upkeep una vez más por si acaso
        console.log("\n🚀 PRUEBA FINAL DE UPKEEP");
        console.log("-".repeat(40));
        
        try {
            const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
            console.log("🔄 Upkeep needed:", upkeepNeeded);
            
            if (upkeepNeeded) {
                console.log("⚠️ Intentando upkeep una vez más...");
                
                const gasEstimate = await contract.performUpkeep.estimateGas(performData);
                console.log("⛽ Gas estimate:", Number(gasEstimate));
                
                // Try with higher gas limit
                const performTx = await contract.performUpkeep(performData, {
                    gasLimit: Math.min(Number(gasEstimate) * 2, 5000000)
                });
                
                console.log("📡 Transaction sent:", performTx.hash);
                const receipt = await performTx.wait();
                
                console.log("✅ Transaction confirmed!");
                console.log("📊 Gas used:", Number(receipt.gasUsed));
                console.log("⏳ VRF request should be processed now");
                
            } else {
                console.log("❌ Upkeep not needed at this time");
            }
            
        } catch (error) {
            console.log("❌ Upkeep still fails:", error.message);
            console.log("📞 Next step: Fund the VRF subscription");
            console.log("🔗 Subscription ID to fund:", currentSubscriptionId.toString());
        }
        
        console.log("\n✅ ANALISIS COMPLETADO");
        console.log("=".repeat(65));
        
    } catch (error) {
        console.error("💥 Error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 