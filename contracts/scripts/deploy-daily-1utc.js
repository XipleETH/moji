const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 DEPLOYING LOTTOMOJI DAILY DRAWS (1:00 UTC)");
    console.log("==============================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "AVAX");
    
    // Configuration for Avalanche Fuji
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    const SUBSCRIPTION_ID = "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    
    console.log("\n⚙️ DEPLOYMENT CONFIGURATION:");
    console.log("- Network: Avalanche Fuji Testnet");
    console.log("- USDC Token:", USDC_ADDRESS);
    console.log("- VRF Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Draw Schedule: Daily at 1:00 UTC");
    console.log("- Initial lastDrawTime: June 29, 2024 at 1:00 UTC");
    console.log("- DRAW_INTERVAL: 24 hours");
    
    console.log("\n🏗️ DEPLOYING CONTRACT...");
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    
    // Deploy with only 2 parameters now (removed _drawTimeUTC)
    const contract = await LottoMojiCore.deploy(
        USDC_ADDRESS,
        SUBSCRIPTION_ID
    );
    
    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("✅ Contract deployed to:", contractAddress);
    
    // Verify configuration
    console.log("\n🔍 VERIFYING CONFIGURATION...");
    
    const drawInterval = await contract.DRAW_INTERVAL();
    const drawTimeUTC = await contract.drawTimeUTC();
    const lastDrawTime = await contract.lastDrawTime();
    const currentGameDay = await contract.getCurrentDay();
    const ticketPrice = await contract.TICKET_PRICE();
    
    console.log("✅ DRAW_INTERVAL:", Number(drawInterval) / 3600, "hours");
    console.log("✅ Draw Time UTC:", Number(drawTimeUTC) / 3600, ":00 UTC");
    console.log("✅ Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
    console.log("✅ Current Game Day:", currentGameDay.toString());
    console.log("✅ Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
    
    // Check pools
    const mainPools = await contract.getMainPoolBalances();
    const reserves = await contract.getReserveBalances();
    
    console.log("\n💰 INITIAL POOL BALANCES:");
    console.log("- First Prize Pool:", ethers.formatUnits(mainPools[0], 6), "USDC");
    console.log("- Second Prize Pool:", ethers.formatUnits(mainPools[1], 6), "USDC");  
    console.log("- Third Prize Pool:", ethers.formatUnits(mainPools[2], 6), "USDC");
    console.log("- Development Pool:", ethers.formatUnits(mainPools[3], 6), "USDC");
    console.log("- First Prize Reserve:", ethers.formatUnits(reserves[0], 6), "USDC");
    console.log("- Second Prize Reserve:", ethers.formatUnits(reserves[1], 6), "USDC");
    console.log("- Third Prize Reserve:", ethers.formatUnits(reserves[2], 6), "USDC");
    
    // Calculate next draw time
    const now = Math.floor(Date.now() / 1000);
    const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
    const timeUntilNextDraw = nextDrawTime - now;
    
    console.log("\n⏰ DRAW SCHEDULE:");
    console.log("- Next draw time:", new Date(nextDrawTime * 1000).toISOString());
    console.log("- Time until next draw:", Math.floor(timeUntilNextDraw / 3600), "hours", Math.floor((timeUntilNextDraw % 3600) / 60), "minutes");
    
    if (timeUntilNextDraw < 0) {
        console.log("🚨 Next draw is OVERDUE by", Math.abs(Math.floor(timeUntilNextDraw / 3600)), "hours");
    }
    
    console.log("\n==============================================");
    console.log("🎯 DEPLOYMENT SUMMARY");
    console.log("==============================================");
    console.log("📍 Contract Address:", contractAddress);
    console.log("🌐 Network: Avalanche Fuji");
    console.log("⏰ Schedule: Daily at 1:00 UTC");
    console.log("🎫 Ticket Price: 0.2 USDC");
    console.log("🎮 Ready for VRF Consumer setup");
    console.log("==============================================");
    
    // Save contract address for easy access
    console.log("\n📝 NEXT STEPS:");
    console.log("1. Add contract as VRF consumer");
    console.log("2. Update frontend with new address");
    console.log("3. Test ticket purchase");
    console.log("4. Verify draw timing");
    
    return contractAddress;
}

main()
    .then((address) => {
        console.log("\n🎉 Deployment completed successfully!");
        console.log("Contract address:", address);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }); 