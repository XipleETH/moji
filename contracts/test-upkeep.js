const { ethers } = require("hardhat");
async function main() {
    const contractAddress = "0x836AB58c7B98363b263581cDA17202ac50Cb63ed";
    const abi = [
        "function checkUpkeep(bytes calldata) view returns (bool, bytes)",
        "function performUpkeep(bytes calldata) external"
    ];
    const [signer] = await ethers.getSigners();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    
    console.log(" Testing checkUpkeep...");
    const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
    console.log("Upkeep needed:", upkeepNeeded);
    
    if (upkeepNeeded) {
        console.log(" Testing performUpkeep staticCall...");
        try {
            await contract.performUpkeep.staticCall("0x01");
            console.log(" StaticCall OK - performUpkeep should work");
        } catch (error) {
            console.log(" StaticCall failed:", error.message);
        }
    }
}
main().catch(console.error);
