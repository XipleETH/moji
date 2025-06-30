const { ethers } = require("hardhat");

// CONTRACT V3 ADDRESS
const CONTRACT_ADDRESS = "0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5";

async function main() {
    console.log("🎯 SOLUCION VRF Y FORZADO DE SORTEO - LOTTOMOJI V3");
    console.log("=".repeat(65));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // 1. Verificar si hay función para setear draw time manualmente
        console.log("\n🔧 1. OPCIONES DE CORRECCION MANUAL");
        console.log("-".repeat(40));
        
        // Check current state
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        const now = Math.floor(Date.now() / 1000);
        
        console.log("📅 Current Game Day:", Number(currentGameDay));
        console.log("⏰ Current Unix Time:", now);
        console.log("🎲 Last Draw Time:", Number(lastDrawTime));
        
        // Calculate what the correct lastDrawTime should be
        const drawTimeUTC = await contract.drawTimeUTC(); // 3:00 UTC
        const drawInterval = await contract.DRAW_INTERVAL(); // 24 hours
        
        // Find the most recent midnight SP time
        const now_sp = new Date();
        const today_sp = new Date(now_sp.getFullYear(), now_sp.getMonth(), now_sp.getDate());
        today_sp.setUTCHours(3, 0, 0, 0); // 3:00 UTC = midnight SP
        
        let correctLastDrawTime;
        if (now > today_sp.getTime() / 1000) {
            // Today's draw time has passed, so last draw should be today
            correctLastDrawTime = Math.floor(today_sp.getTime() / 1000);
        } else {
            // Today's draw time hasn't passed, so last draw should be yesterday
            correctLastDrawTime = Math.floor(today_sp.getTime() / 1000) - Number(drawInterval);
        }
        
        console.log("🎯 Correct Last Draw Time should be:", correctLastDrawTime);
        console.log("🎯 Which is:", new Date(correctLastDrawTime * 1000).toLocaleString());
        
        // 2. Try to check if contract has setLastDrawTime function
        console.log("\n🔄 2. INTENTANDO CORREGIR TIEMPO DE SORTEO");
        console.log("-".repeat(40));
        
        try {
            // Most contracts have this function for emergency corrections
            console.log("📝 Attempting to set correct draw time...");
            
            const setTimeTx = await contract.setLastDrawTime(correctLastDrawTime);
            await setTimeTx.wait();
            
            console.log("✅ Last draw time corrected successfully!");
            console.log("📡 Transaction:", setTimeTx.hash);
            
        } catch (error) {
            console.log("❌ setLastDrawTime not available or failed:", error.message);
            console.log("🔄 Trying alternative methods...");
            
            // Method 2: Try to trigger maintenance mode
            try {
                console.log("🔧 Attempting maintenance performUpkeep...");
                
                // Try with maintenance data (false = maintenance, true = draw)
                const maintenanceData = ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [false]);
                const maintTx = await contract.performUpkeep(maintenanceData);
                await maintTx.wait();
                
                console.log("✅ Maintenance upkeep executed!");
                console.log("📡 Transaction:", maintTx.hash);
                
            } catch (maintError) {
                console.log("❌ Maintenance upkeep failed:", maintError.message);
                
                // Method 3: Try direct draw with current data
                console.log("🎲 Attempting direct draw performUpkeep...");
                
                try {
                    const drawData = ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [true]);
                    const drawTx = await contract.performUpkeep(drawData, {
                        gasLimit: 2000000 // Higher gas limit
                    });
                    await drawTx.wait();
                    
                    console.log("✅ Direct draw upkeep executed!");
                    console.log("📡 Transaction:", drawTx.hash);
                    
                } catch (drawError) {
                    console.log("❌ Direct draw failed:", drawError.message);
                    
                    // Method 4: Emergency automation toggle
                    console.log("🚨 Attempting automation reset...");
                    
                    try {
                        // Disable and re-enable automation to reset state
                        const disableTx = await contract.toggleAutomation();
                        await disableTx.wait();
                        
                        const enableTx = await contract.toggleAutomation();
                        await enableTx.wait();
                        
                        console.log("🔄 Automation reset completed");
                        
                        // Try upkeep again after reset
                        const [upkeepAfterReset, dataAfterReset] = await contract.checkUpkeep("0x");
                        
                        if (upkeepAfterReset) {
                            console.log("✅ Upkeep available after reset, executing...");
                            
                            const finalTx = await contract.performUpkeep(dataAfterReset, {
                                gasLimit: 2000000
                            });
                            await finalTx.wait();
                            
                            console.log("✅ Final upkeep execution successful!");
                            console.log("📡 Transaction:", finalTx.hash);
                        } else {
                            console.log("❌ Upkeep still not available after reset");
                        }
                        
                    } catch (resetError) {
                        console.log("❌ Automation reset failed:", resetError.message);
                    }
                }
            }
        }
        
        // 3. Final verification
        console.log("\n📊 3. VERIFICACION FINAL");
        console.log("-".repeat(40));
        
        const finalLastDrawTime = await contract.lastDrawTime();
        const finalCurrentDay = await contract.getCurrentDay();
        const [finalUpkeepNeeded] = await contract.checkUpkeep("0x");
        
        console.log("🕒 Final Last Draw Time:", new Date(Number(finalLastDrawTime) * 1000).toLocaleString());
        console.log("📅 Final Current Day:", Number(finalCurrentDay));
        console.log("🔄 Final Upkeep Needed:", finalUpkeepNeeded);
        
        const timeDiff = Number(finalLastDrawTime) - Number(lastDrawTime);
        if (timeDiff > 0) {
            console.log("✅ SUCCESS: Draw time was updated by", Math.floor(timeDiff / 3600), "hours");
        } else if (timeDiff === 0 && !finalUpkeepNeeded) {
            console.log("✅ SUCCESS: Upkeep was executed (time may not change until next cycle)");
        } else {
            console.log("⚠️ Status unchanged. Manual VRF or Chainlink Automation intervention needed");
            
            console.log("\n🔧 MANUAL SOLUTIONS:");
            console.log("1. Check VRF subscription funding at: https://vrf.chain.link/");
            console.log("2. Check Chainlink Automation upkeep funding");
            console.log("3. Wait for next automatic cycle (may self-correct)");
            console.log("4. Contact Chainlink support if VRF subscription is broken");
        }
        
        // 4. Show next steps
        console.log("\n📋 4. PROXIMOS PASOS RECOMENDADOS");
        console.log("-".repeat(40));
        
        const nextDrawTime = Number(finalLastDrawTime) + Number(drawInterval);
        console.log("⏰ Next expected draw:", new Date(nextDrawTime * 1000).toLocaleString());
        
        const timeToNext = nextDrawTime - Math.floor(Date.now() / 1000);
        if (timeToNext > 0) {
            console.log("⏳ Time until next draw:", Math.floor(timeToNext / 3600) + "h " + Math.floor((timeToNext % 3600) / 60) + "m");
        } else {
            console.log("🔴 Next draw is overdue by:", Math.floor(-timeToNext / 3600) + "h " + Math.floor((-timeToNext % 3600) / 60) + "m");
        }
        
        console.log("\n✅ PROCESO COMPLETADO");
        console.log("=".repeat(65));
        
    } catch (error) {
        console.error("💥 Error crítico:", error);
        
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