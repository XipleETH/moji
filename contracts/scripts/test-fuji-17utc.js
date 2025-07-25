const { ethers } = require("hardhat");

async function main() {
    console.log(" TESTING CONTRATO LOTTO MOJI - AVALANCHE FUJI 17 UTC");
    console.log("=".repeat(65));
    
    const CONTRACT_ADDRESS = "0xeCCF651b43FA349666091b9B4bcA7Bb9D2B8125e";
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    
    const [signer] = await ethers.getSigners();
    console.log(" Testing con cuenta:", signer.address);
    
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(" Balance AVAX:", ethers.formatEther(balance));
    
    const contractABI = [
        "function gameActive() view returns (bool)",
        "function ticketPrice() view returns (uint256)",
        "function drawTimeUTC() view returns (uint256)",
        "function getCurrentDay() view returns (uint256)",
        "function lastDrawTime() view returns (uint256)",
        "function ticketCounter() view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
    
    console.log("\n VERIFICANDO ESTADO DEL CONTRATO:");
    console.log("=".repeat(45));
    
    try {
        const gameActive = await contract.gameActive();
        const ticketPrice = await contract.ticketPrice();
        const drawTimeUTC = await contract.drawTimeUTC();
        const currentGameDay = await contract.getCurrentDay();
        const lastDrawTime = await contract.lastDrawTime();
        const ticketCounter = await contract.ticketCounter();
        
        console.log(" Game Active:", gameActive);
        console.log(" Ticket Price:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log(" Draw Time UTC:", Number(drawTimeUTC) / 3600, "horas");
        console.log(" Current Game Day:", currentGameDay.toString());
        console.log(" Last Draw Time:", new Date(Number(lastDrawTime) * 1000).toISOString());
        console.log(" Tickets vendidos:", ticketCounter.toString());
        
        const nextDrawTime = Number(lastDrawTime) + 24 * 3600;
        console.log(" Próximo sorteo:", new Date(nextDrawTime * 1000).toISOString());
        
        const currentTime = Math.floor(Date.now() / 1000);
        const timeToNext = nextDrawTime - currentTime;
        const hoursToNext = Math.floor(timeToNext / 3600);
        const minutesToNext = Math.floor((timeToNext % 3600) / 60);
        console.log(" Tiempo hasta próximo sorteo:", hoursToNext, "horas y", minutesToNext, "minutos");
        
    } catch (error) {
        console.error(" Error verificando contrato:", error.message);
    }
    
    console.log("\n ESTADO DEL SISTEMA:");
    console.log("=".repeat(25));
    console.log(" Red: Avalanche Fuji Testnet");
    console.log(" Contrato:", CONTRACT_ADDRESS);
    console.log(" USDC:", USDC_ADDRESS);
    console.log(" Sorteos: Diarios a las 17:00 UTC");
    console.log(" Explorer: https://testnet.snowtrace.io/address/" + CONTRACT_ADDRESS);
}

main().catch(console.error);
