const { ethers } = require("hardhat");

// CONTRACT V3 ADDRESS
const CONTRACT_ADDRESS = "0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5";

// USER PROVIDED SUBSCRIPTION ID
const USER_SUBSCRIPTION_ID = "105961847727705490544354750783936451991128107961690295417839588082464327658827";

async function main() {
    console.log("🔍 VERIFICACION DE VRF SUBSCRIPTION ID - LOTTOMOJI V3");
    console.log("=".repeat(65));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. Obtener subscription ID del contrato
        console.log("\n📋 1. OBTENIENDO SUBSCRIPTION ID DEL CONTRATO");
        console.log("-".repeat(40));
        
        const contractSubscriptionId = await contract.subscriptionId();
        console.log("🔗 Contract Subscription ID (raw):", contractSubscriptionId.toString());
        console.log("🔗 Contract Subscription ID (BigInt):", contractSubscriptionId);
        
        // 2. Comparar con el ID proporcionado por el usuario
        console.log("\n🔄 2. COMPARACION DE IDS");
        console.log("-".repeat(40));
        
        console.log("👤 User provided ID:", USER_SUBSCRIPTION_ID);
        console.log("📜 Contract stored ID:", contractSubscriptionId.toString());
        
        const idsMatch = contractSubscriptionId.toString() === USER_SUBSCRIPTION_ID;
        console.log("✅ IDs coinciden:", idsMatch);
        
        if (!idsMatch) {
            console.log("⚠️ LOS IDS NO COINCIDEN!");
            console.log("   Esto puede ser la causa del problema de VRF");
            
            // 3. Verificar si podemos actualizar el subscription ID
            console.log("\n🔧 3. CORRIGIENDO SUBSCRIPTION ID");
            console.log("-".repeat(40));
            
            try {
                // Verificar si somos owner
                const owner = await contract.owner();
                if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
                    console.log("❌ ERROR: No eres el owner del contrato");
                    console.log("🔑 Owner:", owner);
                    console.log("👤 Your address:", deployer.address);
                    return;
                }
                
                console.log("📝 Attempting to update subscription ID...");
                
                // Intentar actualizar el subscription ID
                const updateTx = await contract.setSubscriptionId(ethers.toBigInt(USER_SUBSCRIPTION_ID));
                await updateTx.wait();
                
                console.log("✅ Subscription ID updated successfully!");
                console.log("📡 Transaction:", updateTx.hash);
                
                // Verificar el cambio
                const newSubscriptionId = await contract.subscriptionId();
                console.log("🔗 New Subscription ID:", newSubscriptionId.toString());
                console.log("✅ Update verified:", newSubscriptionId.toString() === USER_SUBSCRIPTION_ID);
                
            } catch (updateError) {
                console.log("❌ Cannot update subscription ID:", updateError.message);
                
                if (updateError.message.includes("setSubscriptionId is not a function")) {
                    console.log("⚠️ Contract doesn't have setSubscriptionId function");
                    console.log("📞 You'll need to contact the VRF subscription admin to:");
                    console.log("   1. Add the contract as a consumer to subscription:", USER_SUBSCRIPTION_ID);
                    console.log("   2. Or update the contract to use the correct subscription");
                }
            }
            
        } else {
            console.log("✅ Los subscription IDs coinciden correctamente!");
            
            // 4. Verificar el estado de la subscription
            console.log("\n🎲 4. VERIFICANDO ESTADO DE VRF");
            console.log("-".repeat(40));
            
            console.log("🔗 Subscription ID en uso:", USER_SUBSCRIPTION_ID);
            console.log("📍 Contract address:", CONTRACT_ADDRESS);
            console.log("🌐 Network: Base Sepolia");
            
            console.log("\n📋 Próximos pasos:");
            console.log("1. Ve a https://vrf.chain.link/");
            console.log("2. Conecta tu wallet");
            console.log("3. Busca subscription ID:", USER_SUBSCRIPTION_ID);
            console.log("4. Verifica que tenga fondos LINK suficientes");
            console.log("5. Verifica que el contrato esté listado como consumer");
            
            // Intentar ejecutar upkeep ahora que sabemos que los IDs coinciden
            console.log("\n🚀 5. INTENTANDO UPKEEP CON ID CORRECTO");
            console.log("-".repeat(40));
            
            try {
                const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
                console.log("🔄 Upkeep needed:", upkeepNeeded);
                
                if (upkeepNeeded) {
                    console.log("🔄 Executing performUpkeep...");
                    
                    const performTx = await contract.performUpkeep(performData, {
                        gasLimit: 2000000
                    });
                    await performTx.wait();
                    
                    console.log("✅ Upkeep executed successfully!");
                    console.log("📡 Transaction:", performTx.hash);
                    
                    // Verificar si se hizo request de VRF
                    console.log("⏳ VRF request may have been made. Check VRF dashboard for fulfillment.");
                    
                } else {
                    console.log("❌ Upkeep not needed at this time");
                }
                
            } catch (upkeepError) {
                console.log("❌ Upkeep execution failed:", upkeepError.message);
                
                if (upkeepError.message.includes("revert")) {
                    console.log("💡 Possible reasons:");
                    console.log("   - VRF subscription needs funding");
                    console.log("   - Contract not added as consumer");
                    console.log("   - VRF coordinator issues");
                }
            }
        }
        
        // 6. Información adicional de VRF
        console.log("\n📊 6. INFORMACION ADICIONAL DE VRF");
        console.log("-".repeat(40));
        
        try {
            const keyHash = await contract.KEY_HASH();
            const callbackGasLimit = await contract.CALLBACK_GAS_LIMIT();
            const requestConfirmations = await contract.REQUEST_CONFIRMATIONS();
            
            console.log("🔑 Key Hash:", keyHash);
            console.log("⛽ Callback Gas Limit:", Number(callbackGasLimit));
            console.log("✅ Request Confirmations:", Number(requestConfirmations));
            
        } catch (error) {
            console.log("ℹ️ No se pudo obtener información adicional de VRF");
        }
        
        console.log("\n✅ VERIFICACION COMPLETADA");
        console.log("=".repeat(65));
        
    } catch (error) {
        console.error("💥 Error en verificación:", error);
        
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