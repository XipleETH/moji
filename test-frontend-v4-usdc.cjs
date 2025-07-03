const { createPublicClient, http } = require('viem');
const { avalancheFuji } = require('viem/chains');

// Configuración V4
const CONTRACT_V4 = "0x19d6c7dc1301860C4E14c72E4338B62113059471";
const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
const TEST_ADDRESS = "0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0";

console.log("🧪 TESTING FRONTEND V4 USDC CONNECTION");
console.log("====================================");

const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http()
});

const USDC_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

const V4_ABI = [
    "function ticketPrice() view returns (uint256)",
    "function nextDrawTs() view returns (uint256)", 
    "function balanceOf(address owner) view returns (uint256)"
];

async function testConnection() {
    try {
        console.log(`📍 Testing address: ${TEST_ADDRESS}`);
        console.log(`🎫 Contract V4: ${CONTRACT_V4}`);
        console.log(`💲 USDC: ${USDC_ADDRESS}\n`);

        // Test USDC functions
        console.log("💰 USDC STATUS");
        console.log("--------------");
        
        const [balance, allowance, decimals] = await Promise.all([
            publicClient.readContract({
                address: USDC_ADDRESS,
                abi: USDC_ABI,
                functionName: 'balanceOf',
                args: [TEST_ADDRESS]
            }),
            publicClient.readContract({
                address: USDC_ADDRESS,
                abi: USDC_ABI,
                functionName: 'allowance',
                args: [TEST_ADDRESS, CONTRACT_V4]
            }),
            publicClient.readContract({
                address: USDC_ADDRESS,
                abi: USDC_ABI,
                functionName: 'decimals'
            })
        ]);

        console.log(`💰 USDC Balance: ${Number(balance) / Math.pow(10, decimals)} USDC`);
        console.log(`✅ USDC Allowance: ${Number(allowance) / Math.pow(10, decimals)} USDC`);

        // Test V4 contract functions
        console.log("\n🎫 CONTRACT V4 STATUS");
        console.log("---------------------");

        const [ticketPrice, nextDraw, ticketsOwned] = await Promise.all([
            publicClient.readContract({
                address: CONTRACT_V4,
                abi: V4_ABI,
                functionName: 'ticketPrice'
            }),
            publicClient.readContract({
                address: CONTRACT_V4,
                abi: V4_ABI,
                functionName: 'nextDrawTs'
            }),
            publicClient.readContract({
                address: CONTRACT_V4,
                abi: V4_ABI,
                functionName: 'balanceOf',
                args: [TEST_ADDRESS]
            })
        ]);

        console.log(`🎫 Ticket Price: ${Number(ticketPrice) / Math.pow(10, 6)} USDC`);
        console.log(`⏰ Next Draw: ${new Date(Number(nextDraw) * 1000).toISOString()}`);
        console.log(`🎟️ Tickets Owned: ${Number(ticketsOwned)}`);

        // Check if user can buy tickets
        console.log("\n✅ PURCHASE STATUS");
        console.log("------------------");
        
        const canBuy = balance >= ticketPrice && allowance >= ticketPrice;
        console.log(`💰 Has sufficient USDC: ${balance >= ticketPrice ? '✅' : '❌'}`);
        console.log(`✅ Has sufficient allowance: ${allowance >= ticketPrice ? '✅' : '❌'}`);
        console.log(`🎯 Can buy tickets: ${canBuy ? '✅ YES' : '❌ NO'}`);

        if (!canBuy) {
            if (balance < ticketPrice) {
                console.log("\n💡 SOLUTION: Get more USDC from faucet");
                console.log("🔗 https://faucets.chain.link/avalanche-fuji");
            }
            if (allowance < ticketPrice) {
                console.log("\n💡 SOLUTION: Run approval script");
                console.log("🔧 cd contracts && npx hardhat run approve-usdc-v4.js --network avalanche-fuji");
            }
        }

        console.log("\n🎉 FRONTEND CONNECTION TEST PASSED!");

    } catch (error) {
        console.error("❌ CONNECTION TEST FAILED:", error);
    }
}

testConnection(); 