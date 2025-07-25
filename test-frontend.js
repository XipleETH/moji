const { ethers } = require("ethers");

async function testNewContract() {
    console.log(" TESTING NUEVO CONTRATO PARA FRONTEND");
    console.log("=".repeat(45));
    
    const CONTRACT_ADDRESS = "0xeCCF651b43FA349666091b9B4bcA7Bb9D2B8125e";
    const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
    
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const blockNumber = await provider.getBlockNumber();
        console.log(" RPC conectado - Bloque:", blockNumber);
        
        const contractABI = [
            "function gameActive() view returns (bool)",
            "function ticketPrice() view returns (uint256)",
            "function drawTimeUTC() view returns (uint256)",
            "function getCurrentDay() view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
        
        const gameActive = await contract.gameActive();
        const ticketPrice = await contract.ticketPrice();
        const drawTimeUTC = await contract.drawTimeUTC();
        
        console.log(" Game Active:", gameActive);
        console.log(" Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log(" Draw Time UTC:", Number(drawTimeUTC) / 3600, "horas");
        
        console.log("\n FRONTEND LISTO PARA USAR");
        console.log(" Contrato:", CONTRACT_ADDRESS);
        console.log(" Red: Avalanche Fuji");
        console.log(" Sorteos: 17:00 UTC (12:00 PM Colombia)");
        
    } catch (error) {
        console.error(" Error:", error.message);
    }
}

testNewContract();
