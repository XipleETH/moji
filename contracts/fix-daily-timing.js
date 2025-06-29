const { ethers } = require("hardhat");

async function main() {
    console.log("⏰ FIXING DAILY DRAW TIMING");
    console.log("===========================");
    
    const CONTRACT_ADDRESS = "0x108FabeC110B5B74DaB4953182F78957ef721ECB";
    
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    
    const contract = await ethers.getContractAt("LottoMojiCore", CONTRACT_ADDRESS);
    
    // Check current configuration
    console.log("\n📊 CURRENT CONFIGURATION:");
    const currentLastDrawTime = await contract.lastDrawTime();
    const drawTimeUTC = await contract.drawTimeUTC();
    const drawInterval = await contract.DRAW_INTERVAL();
    const currentGameDay = await contract.getCurrentDay();
    
    console.log("- Current lastDrawTime:", new Date(Number(currentLastDrawTime) * 1000).toISOString());
    console.log("- Draw Time UTC:", Number(drawTimeUTC) / 3600, ":00 UTC");
    console.log("- Draw Interval:", Number(drawInterval) / 3600, "hours");
    console.log("- Current Game Day:", currentGameDay.toString());
    
    // Calculate next draw based on current timing
    const now = Math.floor(Date.now() / 1000);
    const nextDrawFromCurrent = Number(currentLastDrawTime) + Number(drawInterval);
    
    console.log("- Current time:", new Date(now * 1000).toISOString());
    console.log("- Next draw (current):", new Date(nextDrawFromCurrent * 1000).toISOString());
    
    // Calculate correct lastDrawTime: Yesterday at 1:00 UTC
    // So next draw will be tomorrow at 1:00 UTC
    const today = new Date();
    today.setUTCHours(1, 0, 0, 0); // Today at 1:00 UTC
    const todayAt1UTC = Math.floor(today.getTime() / 1000);
    
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1); // Yesterday at 1:00 UTC
    const yesterdayAt1UTC = Math.floor(yesterday.getTime() / 1000);
    
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); // Tomorrow at 1:00 UTC
    const tomorrowAt1UTC = Math.floor(tomorrow.getTime() / 1000);
    
    console.log("\n🎯 TIMING CALCULATION:");
    console.log("- Today at 1:00 UTC:", new Date(todayAt1UTC * 1000).toISOString());
    console.log("- Yesterday at 1:00 UTC:", new Date(yesterdayAt1UTC * 1000).toISOString());
    console.log("- Tomorrow at 1:00 UTC:", new Date(tomorrowAt1UTC * 1000).toISOString());
    
    // Determine correct lastDrawTime
    let correctLastDrawTime;
    let nextDrawDescription;
    
    if (now < todayAt1UTC) {
        // It's before today's 1:00 UTC, so last draw should be yesterday
        correctLastDrawTime = yesterdayAt1UTC;
        nextDrawDescription = "today at 1:00 UTC";
    } else {
        // It's after today's 1:00 UTC, so last draw should be today
        correctLastDrawTime = todayAt1UTC;
        nextDrawDescription = "tomorrow at 1:00 UTC";
    }
    
    console.log("\n⚙️ RECOMMENDED CONFIGURATION:");
    console.log("- Set lastDrawTime to:", new Date(correctLastDrawTime * 1000).toISOString());
    console.log("- Next draw will be:", nextDrawDescription);
    
    // Update lastDrawTime
    console.log("\n🔧 UPDATING lastDrawTime...");
    try {
        const tx = await contract.setLastDrawTime(correctLastDrawTime);
        console.log("⏳ Transaction sent:", tx.hash);
        
        await tx.wait();
        console.log("✅ lastDrawTime updated successfully!");
        
    } catch (error) {
        console.log("❌ Failed to update lastDrawTime:", error.message);
        return;
    }
    
    // Verify the update
    console.log("\n🔍 VERIFYING UPDATE...");
    const newLastDrawTime = await contract.lastDrawTime();
    const newCurrentGameDay = await contract.getCurrentDay();
    const newNextDrawTime = Number(newLastDrawTime) + Number(drawInterval);
    
    console.log("✅ New lastDrawTime:", new Date(Number(newLastDrawTime) * 1000).toISOString());
    console.log("✅ New Current Game Day:", newCurrentGameDay.toString());
    console.log("✅ Next draw time:", new Date(newNextDrawTime * 1000).toISOString());
    
    const timeUntilNextDraw = newNextDrawTime - now;
    console.log("✅ Time until next draw:", Math.floor(timeUntilNextDraw / 3600), "hours", Math.floor((timeUntilNextDraw % 3600) / 60), "minutes");
    
    console.log("\n===========================");
    console.log("🎯 TIMING FIX COMPLETED");
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    console.log("⏰ Schedule: Daily at 1:00 UTC");
    console.log("✅ Ready for daily draws");
    console.log("===========================");
}

main().catch(console.error); 