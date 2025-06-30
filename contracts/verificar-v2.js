const { ethers } = require("hardhat");
async function main() {
    const contractV2 = "0x836AB58c7B98363b263581cDA17202ac50Cb63ed";
    console.log("Verificando:", contractV2);
    const code = await ethers.provider.getCode(contractV2);
    console.log("Existe:", code !== "0x" ? " SÍ" : " NO");
}
main().catch(console.error);
