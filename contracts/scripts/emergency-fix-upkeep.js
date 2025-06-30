const { ethers } = require("hardhat");

// YOUR CONTRACT
const CONTRACT_ADDRESS = "0x6d05B87dCD1d601770E4c04Db2D91F1cAc288C3D";

async function main() {
    console.log("🚨 EMERGENCY FIX FOR EXCESSIVE UPKEEP EXECUTIONS");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Admin wallet:", deployer.address);
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        console.log("\n🔍 1. DIAGNOSING THE PROBLEM");
        console.log("-".repeat(40));
        
        const [automationActive, lastDrawTime, drawInterval] = await Promise.all([
            contract.automationActive(),
            contract.lastDrawTime(),
            contract.DRAW_INTERVAL()
        ]);
        
        const now = Math.floor(Date.now() / 1000);
        const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
        const overdue = now - nextDrawTime;
        
        console.log("🤖 Automation Active:", automationActive);
        console.log("⏰ Last Draw:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log("📅 Should Draw At:", new Date(nextDrawTime * 1000).toISOString());
        console.log("🕐 Current Time:", new Date(now * 1000).toISOString());
        console.log("⚠️ Overdue by:", Math.floor(overdue / 3600), "hours", Math.floor((overdue % 3600) / 60), "minutes");
        
        if (overdue > 0) {
            console.log("\n🚨 PROBLEM CONFIRMED:");
            console.log("- Draw is overdue, so checkUpkeep returns true");
            console.log("- performUpkeep makes VRF request but doesn't update lastDrawTime");
            console.log("- Next check still sees overdue draw → infinite loop!");
        }
        
        console.log("\n🛑 2. EMERGENCY PAUSE AUTOMATION");
        console.log("-".repeat(40));
        
        if (automationActive) {
            console.log("⏸️ Pausing automation to stop excessive executions...");
            const pauseTx = await contract.toggleAutomation();
            await pauseTx.wait();
            console.log("✅ Automation paused!");
            console.log("📡 Transaction:", pauseTx.hash);
        } else {
            console.log("ℹ️ Automation is already paused");
        }
        
        console.log("\n🔧 3. MANUAL DRAW EXECUTION");
        console.log("-".repeat(40));
        
        console.log("🎲 Attempting manual VRF request...");
        
        try {
            // Try to manually execute the draw
            const drawTx = await contract.performUpkeep(
                ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true]),
                {
                    gasLimit: 2000000
                }
            );
            await drawTx.wait();
            
            console.log("✅ Manual draw executed!");
            console.log("📡 Transaction:", drawTx.hash);
            console.log("⏳ Waiting for VRF fulfillment...");
            
            // Wait a bit and check if lastDrawTime was updated
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
            
            const newLastDrawTime = await contract.lastDrawTime();
            if (Number(newLastDrawTime) > Number(lastDrawTime)) {
                console.log("✅ lastDrawTime updated! Draw completed successfully.");
                console.log("🕐 New lastDrawTime:", new Date(Number(newLastDrawTime) * 1000).toISOString());
                
                // Re-enable automation
                console.log("\n🔄 4. RE-ENABLING AUTOMATION");
                console.log("-".repeat(40));
                
                const resumeTx = await contract.toggleAutomation();
                await resumeTx.wait();
                console.log("✅ Automation re-enabled!");
                console.log("📡 Transaction:", resumeTx.hash);
                
            } else {
                console.log("⚠️ lastDrawTime not updated yet. VRF may still be pending.");
                console.log("💡 Check VRF dashboard and re-run this script later.");
            }
            
        } catch (drawError) {
            console.log("❌ Manual draw failed:", drawError.message);
            
            if (drawError.message.includes("revert")) {
                console.log("\n💡 ALTERNATIVE SOLUTION:");
                console.log("The contract may need the lastDrawTime manually updated.");
                console.log("This requires a contract upgrade or admin function.");
            }
        }
        
        console.log("\n📊 5. FINAL STATUS CHECK");
        console.log("-".repeat(40));
        
        const [finalAutomation, finalLastDraw] = await Promise.all([
            contract.automationActive(),
            contract.lastDrawTime()
        ]);
        
        console.log("🤖 Automation Active:", finalAutomation);
        console.log("⏰ Last Draw Time:", new Date(Number(finalLastDraw) * 1000).toISOString());
        
        const finalNextDraw = Number(finalLastDraw) + Number(drawInterval);
        const finalTimeLeft = finalNextDraw - Math.floor(Date.now() / 1000);
        
        if (finalTimeLeft > 0) {
            console.log("✅ Next draw in:", Math.floor(finalTimeLeft / 3600), "hours", Math.floor((finalTimeLeft % 3600) / 60), "minutes");
            console.log("🎉 PROBLEM FIXED!");
        } else {
            console.log("⚠️ Still overdue. May need contract upgrade.");
        }
        
        console.log("\n✅ EMERGENCY FIX COMPLETED");
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("❌ Emergency fix failed:", error.message);
        
        console.log("\n🆘 MANUAL STEPS REQUIRED:");
        console.log("1. Go to Chainlink Automation dashboard");
        console.log("2. Manually pause the upkeep");
        console.log("3. Contact support for contract upgrade");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 