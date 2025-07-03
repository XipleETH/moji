const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Approving USDC for LottoMoji V4...");
    
    // Direcciones
    const CONTRACT_V4 = "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008";
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65"; // Avalanche Fuji
    const APPROVAL_AMOUNT = "16"; // 16 USDC (available balance)

    console.log(`📍 Contract V4: ${CONTRACT_V4}`);
    console.log(`💲 USDC Address: ${USDC_ADDRESS}`);
    console.log(`💸 Approval Amount: ${APPROVAL_AMOUNT} USDC\n`);

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`👤 Approving from: ${signer.address}`);

    // USDC ABI
    const USDC_ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];

    try {
        // Create USDC contract instance
        const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

        // Check current balance and allowance
        console.log("🔍 Checking current status...");
        const balance = await usdcContract.balanceOf(signer.address);
        const currentAllowance = await usdcContract.allowance(signer.address, CONTRACT_V4);
        const decimals = await usdcContract.decimals();

        console.log(`💰 Current USDC Balance: ${ethers.formatUnits(balance, decimals)} USDC`);
        console.log(`✅ Current Allowance: ${ethers.formatUnits(currentAllowance, decimals)} USDC`);

        // Check if approval is needed
        const approvalAmount = ethers.parseUnits(APPROVAL_AMOUNT, decimals);
        
        if (currentAllowance >= approvalAmount) {
            console.log("✅ Sufficient allowance already exists!");
            console.log(`💡 No approval needed - current allowance (${ethers.formatUnits(currentAllowance, decimals)} USDC) >= requested (${APPROVAL_AMOUNT} USDC)`);
            return;
        }

        if (balance < approvalAmount) {
            console.log("❌ Insufficient USDC balance!");
            console.log(`💡 You have ${ethers.formatUnits(balance, decimals)} USDC but trying to approve ${APPROVAL_AMOUNT} USDC`);
            console.log("📝 Get test USDC from: https://faucets.chain.link/avalanche-fuji");
            return;
        }

        // Approve USDC
        console.log(`\n🔄 Approving ${APPROVAL_AMOUNT} USDC for contract...`);
        const tx = await usdcContract.approve(CONTRACT_V4, approvalAmount);
        console.log(`📝 Transaction submitted: ${tx.hash}`);

        console.log("⏳ Waiting for confirmation...");
        await tx.wait();

        console.log("✅ USDC approval successful!");

        // Verify approval
        const newAllowance = await usdcContract.allowance(signer.address, CONTRACT_V4);
        console.log(`🎯 New Allowance: ${ethers.formatUnits(newAllowance, decimals)} USDC`);

        console.log("\n🎉 APPROVAL COMPLETED!");
        console.log("===============================");
        console.log(`🔗 Transaction: https://testnet.snowtrace.io/tx/${tx.hash}`);
        console.log("💡 You can now buy tickets from the frontend!");

    } catch (error) {
        console.error("❌ USDC approval failed:", error);
        
        if (error.message.includes("insufficient funds")) {
            console.error("💡 Insufficient AVAX for gas fees");
        } else if (error.message.includes("User rejected")) {
            console.error("💡 Transaction was rejected by user");
        }
    }
}

main()
    .then(() => {
        console.log("\n🏁 USDC approval script completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    }); 