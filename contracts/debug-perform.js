const { ethers } = require("hardhat");
async function main() {
    const contractAddress = "0x836AB58c7B98363b263581cDA17202ac50Cb63ed";
    const abi = [
        "function automationActive() view returns (bool)",
        "function emergencyPause() view returns (bool)",
        "function lastDrawTime() view returns (uint256)",
        "function gameActive() view returns (bool)"
    ];
    const [signer] = await ethers.getSigners();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    
    console.log(" Diagnosing performUpkeep failure...");
    
    const gameActive = await contract.gameActive();
    const automationActive = await contract.automationActive();
    const emergencyPause = await contract.emergencyPause();
    const lastDrawTime = await contract.lastDrawTime();
    
    console.log("gameActive:", gameActive);
    console.log("automationActive:", automationActive);
    console.log("emergencyPause:", emergencyPause);
    console.log("lastDrawTime:", new Date(Number(lastDrawTime) * 1000).toUTCString());
    
    const now = Math.floor(Date.now() / 1000);
    const nextDraw = Number(lastDrawTime) + (24 * 3600);
    console.log("Should draw:", now >= nextDraw);
    console.log("Time diff:", now - nextDraw, "seconds");
}
main().catch(console.error);
