const { ethers } = require("hardhat");
async function main() {
    const contractAddress = "0x836AB58c7B98363b263581cDA17202ac50Cb63ed";
    const abi = ["function performUpkeep(bytes calldata) external"];
    const [signer] = await ethers.getSigners();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    
    console.log(" Testing correct performData encoding...");
    
    // Encode boolean true correctly
    const correctPerformData = ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true]);
    console.log("Correct performData:", correctPerformData);
    
    try {
        await contract.performUpkeep.staticCall(correctPerformData);
        console.log(" Static call SUCCESS with correct encoding!");
    } catch (error) {
        console.log(" Still failing:", error.message);
    }
}
main().catch(console.error);
