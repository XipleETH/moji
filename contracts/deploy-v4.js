const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying LottoMojiCoreV4 with ERC721Enumerable...");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // Contract parameters with user specifications
    const DAILY_DRAW_HOUR_UTC = 5; // 05:00 UTC (user specified)
    const PAYMENT_TOKEN = "0x5425890298aed601595a70AB815c96711a31Bc65"; // USDC on Avalanche Fuji
    const TICKET_PRICE = ethers.parseUnits("0.2", 6); // 0.2 USDC (6 decimals)
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"; // Avalanche Fuji VRF Coordinator
    const KEY_HASH = "0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887"; // Avalanche Fuji Key Hash
    const SUBSCRIPTION_ID = "115219711696345395920320818068130094129726319678991844124002335643645462793035"; // User final
    const GAS_LIMIT = 14000000; // 14M gas limit (user specified)

    console.log("📋 Deployment Parameters:");
    console.log("- Daily Draw Hour UTC:", DAILY_DRAW_HOUR_UTC);
    console.log("- Payment Token (USDC):", PAYMENT_TOKEN);
    console.log("- Ticket Price:", ethers.formatUnits(TICKET_PRICE, 6), "USDC");
    console.log("- VRF Coordinator:", VRF_COORDINATOR);
    console.log("- Key Hash:", KEY_HASH);
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Gas Limit:", GAS_LIMIT.toLocaleString());
    console.log("- Network: Avalanche Fuji");

    // Deploy the contract
    const LottoMojiCoreV4 = await ethers.getContractFactory("contracts/LottoMojiCoreV4.sol:LottoMojiCoreV4");
    
    console.log("\n⏳ Deploying contract with ERC721Enumerable...");
    const contract = await LottoMojiCoreV4.deploy(
        DAILY_DRAW_HOUR_UTC,
        PAYMENT_TOKEN,
        TICKET_PRICE,
        VRF_COORDINATOR,
        KEY_HASH,
        SUBSCRIPTION_ID,
        {
            gasLimit: GAS_LIMIT
        }
    );

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n✅ LottoMojiCoreV4 deployed successfully!");
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

    // Test ERC721Enumerable functions
    console.log("\n🧪 Testing ERC721Enumerable functions...");
    try {
        const totalSupply = await contract.totalSupply();
        console.log("- Total Supply:", totalSupply.toString());
        
        // Test supportsInterface for ERC721Enumerable
        const supportsEnumerable = await contract.supportsInterface("0x780e9d63"); // ERC721Enumerable interface ID
        console.log("- Supports ERC721Enumerable:", supportsEnumerable);
        
        const supportsERC721 = await contract.supportsInterface("0x80ac58cd"); // ERC721 interface ID
        console.log("- Supports ERC721:", supportsERC721);
    } catch (error) {
        console.log("⚠️ Error testing enumerable functions:", error.message);
    }

    // Save deployment info
    const deploymentInfo = {
        network: "avalanche-fuji",
        contractName: "LottoMojiCoreV4",
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
            subscriptionId: SUBSCRIPTION_ID,
            gasLimit: GAS_LIMIT
        },
        features: {
            vrfVersion: "VRF V2Plus (latest)",
            gasOptimized: "Standard arrays (uint8[4])",
            vrfCallback: "Uses requestIdToDay mapping",
            automation: "Chainlink Automation compatible",
            enumerable: "ERC721Enumerable implemented",
            performance: "10-100x faster ticket queries"
        }
    };

    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎯 Next Steps:");
    console.log("1. Add this contract as a consumer to the VRF subscription");
    console.log("2. Fund the VRF subscription with LINK tokens");
    console.log("3. Set up Chainlink Automation for automatic draws");
    console.log("4. Update frontend contractAddresses.ts with new V4 address");
    console.log("5. Test ERC721Enumerable performance improvements");
    console.log("6. Verify the contract on Snowtrace");

    return contractAddress;
}

main()
    .then((address) => {
        console.log(`\n🎉 V4 Deployment completed! Contract address: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ V4 Deployment failed:", error);
        process.exit(1);
    }); 