const { ethers } = require("hardhat");
async function main() {
    const contractAddress = "0x836AB58c7B98363b263581cDA17202ac50Cb63ed";
    const abi = ["function gameActive() view returns (bool)"];
    const [signer] = await ethers.getSigners();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    try {
        const active = await contract.gameActive();
        console.log(" Contract responsive, gameActive:", active);
    } catch (error) {
        console.log(" Contract error:", error.message);
    }
}
main().catch(console.error);
