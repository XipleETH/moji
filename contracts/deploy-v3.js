const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying LottoMojiCoreV3 (LottoMojiCoreV2 contract)...");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // Contract parameters
    const DAILY_DRAW_HOUR_UTC = 2; // 02:00 UTC
    const PAYMENT_TOKEN = "0x5425890298aed601595a70AB815c96711a31Bc65"; // USDC on Avalanche Fuji
    const TICKET_PRICE = ethers.parseUnits("0.2", 6); // 0.2 USDC (6 decimals)
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"; // Avalanche Fuji VRF Coordinator
    const KEY_HASH = "0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887"; // Avalanche Fuji Key Hash
    const SUBSCRIPTION_ID = "115219711696345395920320818068130094129726319678991844124002335643645462793035";

    console.log("📋 Deployment Parameters:");
    console.log("- Daily Draw Hour UTC:", DAILY_DRAW_HOUR_UTC);
    console.log("- Payment Token (USDC):", PAYMENT_TOKEN);
    console.log("- Ticket Price:", ethers.formatUnits(TICKET_PRICE, 6), "USDC");
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    console.log("- Key Hash:", KEY_HASH);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);

    // Deploy the contract (note: the contract name is LottoMojiCoreV2 inside the V3 file)
    const LottoMojiCoreV3 = await ethers.getContractFactory("contracts/LottoMojiCoreV3.sol:LottoMojiCoreV2");
    
    console.log("\n⏳ Deploying contract...");
    const contract = await LottoMojiCoreV3.deploy(
        DAILY_DRAW_HOUR_UTC,
        PAYMENT_TOKEN,
        TICKET_PRICE,
        VRF_COORDINATOR,
        KEY_HASH,
        SUBSCRIPTION_ID
    );

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n✅ LottoMojiCoreV3 deployed successfully!");
    console.log("📍 Contract Address:", contractAddress);
    console.log("🔗 Transaction Hash:", contract.deploymentTransaction().hash);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const dailyDrawHour = await contract.dailyDrawHourUTC();
    const ticketPrice = await contract.ticketPrice();
    const paymentToken = await contract.paymentToken();
    const vrfSubId = await contract.vrfSubId();
    const nextDrawTs = await contract.nextDrawTs();
    const currentGameDay = await contract.currentGameDay();

    console.log("✅ Contract verification:");
    console.log("- Daily Draw Hour UTC:", dailyDrawHour.toString());
    console.log("- Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
    console.log("- Payment Token:", paymentToken);
    console.log("- VRF Subscription ID:", vrfSubId.toString());
    console.log("- Next Draw Timestamp:", new Date(Number(nextDrawTs) * 1000).toISOString());
    console.log("- Current Game Day:", currentGameDay.toString());

    // Check automation status
    const automationActive = await contract.automationActive();
    const emergencyPause = await contract.emergencyPause();
    console.log("- Automation Active:", automationActive);
    console.log("- Emergency Pause:", emergencyPause);

    // Save deployment info
    const deploymentInfo = {
        network: "avalanche-fuji",
        contractName: "LottoMojiCoreV3",
        contractAddress: contractAddress,
        deploymentHash: contract.deploymentTransaction().hash,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        parameters: {
            dailyDrawHourUTC: DAILY_DRAW_HOUR_UTC,
            paymentToken: PAYMENT_TOKEN,
            ticketPrice: ethers.formatUnits(TICKET_PRICE, 6) + " USDC",
            vrfCoordinator: VRF_COORDINATOR,
            keyHash: KEY_HASH,
            subscriptionId: SUBSCRIPTION_ID
        },
        features: {
            vrfVersion: "VRF V2 (stable)",
            gasOptimized: "Standard arrays (uint8[4])",
            vrfCallback: "Uses requestIdToDay mapping",
            automation: "Chainlink Automation compatible"
        }
    };

    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎯 Next Steps:");
    console.log("1. Add this contract as a consumer to the VRF subscription");
    console.log("2. Fund the VRF subscription with LINK tokens");
    console.log("3. Set up Chainlink Automation for automatic draws");
    console.log("4. Verify the contract on Snowtrace");
    console.log("5. Test ticket purchase and draw functionality");

    return contractAddress;
}

main()
    .then((address) => {
        console.log(`\n🎉 V3 Deployment completed! Contract address: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ V3 Deployment failed:", error);
        process.exit(1);
    }); 