const { ethers } = require("hardhat");

// CONTRACT V3 ADDRESS
const CONTRACT_ADDRESS = "0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5";

async function main() {
    console.log("🔧 DIAGNOSTICO Y FORZADO MANUAL DE SORTEO - LOTTOMOJI V3");
    console.log("=".repeat(65));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    console.log("📍 Contract V3:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. Verificar estado actual
        console.log("\n🔍 1. DIAGNOSTICO ACTUAL");
        console.log("-".repeat(40));
        
        const owner = await contract.owner();
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        const currentGameDay = await contract.getCurrentDay();
        
        console.log("🏠 Contract Owner:", owner);
        console.log("👑 Eres el owner:", owner.toLowerCase() === deployer.address.toLowerCase());
        console.log("🎮 Game Active:", gameActive);
        console.log("🤖 Automation Active:", automationActive);
        console.log("⏸️ Emergency Pause:", emergencyPause);
        console.log("📅 Current Game Day:", Number(currentGameDay));
        
        // 2. Verificar timing del sorteo
        console.log("\n⏰ 2. ANALISIS DE TIMING");
        console.log("-".repeat(40));
        
        const drawTimeUTC = await contract.drawTimeUTC();
        const drawInterval = await contract.DRAW_INTERVAL();
        const lastDrawTime = await contract.lastDrawTime();
        
        const now = Math.floor(Date.now() / 1000);
        const timeSinceLastDraw = now - Number(lastDrawTime);
        const expectedNextDraw = Number(lastDrawTime) + Number(drawInterval);
        const delayTime = now - expectedNextDraw;
        
        console.log("🕒 Draw Time UTC:", (Number(drawTimeUTC) / 3600) + ":00 (São Paulo midnight)");
        console.log("⏱️ Draw Interval:", (Number(drawInterval) / 3600) + " hours");
        console.log("🎲 Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        console.log("📊 Time Since Last Draw:", Math.floor(timeSinceLastDraw / 3600) + "h " + Math.floor((timeSinceLastDraw % 3600) / 60) + "m");
        console.log("🔴 Expected Next Draw:", new Date(expectedNextDraw * 1000).toLocaleString());
        
        if (delayTime > 0) {
            console.log("⚠️ DRAW IS DELAYED BY:", Math.floor(delayTime / 3600) + "h " + Math.floor((delayTime % 3600) / 60) + "m");
        } else {
            console.log("✅ Next draw in:", Math.floor(-delayTime / 3600) + "h " + Math.floor((-delayTime % 3600) / 60) + "m");
        }
        
        // 3. Verificar estado de upkeep
        console.log("\n🔧 3. ESTADO DE UPKEEP");
        console.log("-".repeat(40));
        
        try {
            const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
            console.log("🔄 Upkeep Needed:", upkeepNeeded);
            
            if (upkeepNeeded) {
                console.log("✅ UPKEEP IS READY TO EXECUTE");
                
                // Decodificar performData si existe
                if (performData !== "0x") {
                    try {
                        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['bool'], performData);
                        console.log("📋 Upkeep Type:", decoded[0] ? "DRAW" : "MAINTENANCE");
                    } catch (e) {
                        console.log("📋 Upkeep Type: UNKNOWN (raw data:", performData + ")");
                    }
                }
            } else {
                console.log("❌ Upkeep not needed. Reasons:");
                console.log("   - Automation inactive:", !automationActive);
                console.log("   - Emergency pause:", emergencyPause);
                console.log("   - Not time for draw:", delayTime <= 0);
            }
        } catch (error) {
            console.log("❌ Error checking upkeep:", error.message);
        }
        
        // 4. Verificar VRF subscription
        console.log("\n🎲 4. VRF SUBSCRIPTION STATUS");
        console.log("-".repeat(40));
        
        try {
            const subscriptionId = await contract.subscriptionId();
            console.log("🔗 VRF Subscription ID:", Number(subscriptionId));
            
            // Check if we have pending VRF requests
            // Note: This would require VRF coordinator contract access
            console.log("ℹ️ Check VRF subscription manually at: https://vrf.chain.link/");
        } catch (error) {
            console.log("❌ Error getting VRF info:", error.message);
        }
        
        // 5. Intentar ejecutar upkeep manualmente
        console.log("\n🚀 5. EJECUTAR SORTEO MANUALMENTE");
        console.log("-".repeat(40));
        
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("❌ Cannot execute: You are not the contract owner");
            console.log("🔑 Contract owner:", owner);
            console.log("👤 Your address:", deployer.address);
            return;
        }
        
        if (emergencyPause) {
            console.log("⚠️ Contract is in emergency pause. Disabling pause first...");
            try {
                const pauseTx = await contract.toggleEmergencyPause();
                await pauseTx.wait();
                console.log("✅ Emergency pause disabled");
            } catch (error) {
                console.log("❌ Failed to disable emergency pause:", error.message);
                return;
            }
        }
        
        if (!automationActive) {
            console.log("⚠️ Automation is inactive. Enabling automation first...");
            try {
                const autoTx = await contract.toggleAutomation();
                await autoTx.wait();
                console.log("✅ Automation enabled");
            } catch (error) {
                console.log("❌ Failed to enable automation:", error.message);
                return;
            }
        }
        
        // Check upkeep again after fixes
        const [upkeepNeededAfterFix, performDataAfterFix] = await contract.checkUpkeep("0x");
        
        if (!upkeepNeededAfterFix) {
            console.log("❌ Upkeep still not needed after fixes");
            console.log("🔧 You may need to manually set the draw time:");
            console.log("   Use setLastDrawTime() function if available");
            return;
        }
        
        console.log("🔄 Executing performUpkeep manually...");
        
        try {
            // Estimate gas first
            const gasEstimate = await contract.performUpkeep.estimateGas(performDataAfterFix);
            console.log("⛽ Estimated gas:", Number(gasEstimate));
            
            // Execute with extra gas buffer
            const performTx = await contract.performUpkeep(performDataAfterFix, {
                gasLimit: Number(gasEstimate) + 100000
            });
            
            console.log("📡 Transaction sent:", performTx.hash);
            console.log("⏳ Waiting for confirmation...");
            
            const receipt = await performTx.wait();
            console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
            console.log("⛽ Gas used:", Number(receipt.gasUsed));
            
            // Check if VRF request was made
            const events = receipt.logs || [];
            const vrfRequestMade = events.some(log => {
                try {
                    const parsed = contract.interface.parseLog(log);
                    return parsed && parsed.name === 'RandomWordsRequested';
                } catch {
                    return false;
                }
            });
            
            if (vrfRequestMade) {
                console.log("🎲 VRF request made successfully!");
                console.log("⏳ Waiting for Chainlink VRF to fulfill the request...");
                console.log("🔍 Monitor at: https://vrf.chain.link/");
            } else {
                console.log("⚠️ No VRF request detected. This might have been maintenance only.");
            }
            
        } catch (error) {
            console.log("❌ Failed to execute performUpkeep:", error.message);
            
            if (error.message.includes("revert")) {
                console.log("💡 Contract reverted. Possible reasons:");
                console.log("   - Upkeep conditions changed");
                console.log("   - VRF subscription issues");
                console.log("   - Insufficient contract balance");
            }
        }
        
        // 6. Final status check
        console.log("\n📊 6. ESTADO FINAL");
        console.log("-".repeat(40));
        
        const finalLastDrawTime = await contract.lastDrawTime();
        const finalUpkeepNeeded = await contract.checkUpkeep("0x");
        
        console.log("🕒 Final Last Draw Time:", new Date(Number(finalLastDrawTime) * 1000).toLocaleString());
        console.log("🔄 Final Upkeep Needed:", finalUpkeepNeeded[0]);
        
        if (Number(finalLastDrawTime) > Number(lastDrawTime)) {
            console.log("✅ SUCCESS: Draw time was updated!");
        } else {
            console.log("⚠️ Draw time unchanged. Manual intervention may be needed.");
        }
        
        console.log("\n✅ DIAGNOSTICO COMPLETADO");
        console.log("=".repeat(65));
        
    } catch (error) {
        console.error("💥 Error en el script:", error);
        
        if (error.reason) {
            console.error("📋 Reason:", error.reason);
        }
        
        if (error.code) {
            console.error("🔢 Error Code:", error.code);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 