const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 PROBANDO CONTRATO V6 - EL QUE USA EL FRONTEND");
    console.log("=".repeat(70));
    
    const CONTRACT_ADDRESS = "0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Cuenta:", signer.address);
    console.log("📍 Contrato V6:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    const gameDay = await contract.currentGameDay();
    const totalDraws = await contract.totalDrawsExecuted();
    
    console.log("- Game Day:", gameDay.toString());
    console.log("- Total draws:", totalDraws.toString());
    
    const dailyInfo = await contract.getDailyPoolInfo(gameDay);
    console.log("- Collected:", ethers.formatUnits(dailyInfo[0], 6), "USDC");
    console.log("- Ya sorteado:", dailyInfo[4]);
    
    const performData = ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [true]);
    const performTx = await contract.performUpkeep(performData, { gasLimit: 3000000 });
    
    console.log("📡 Tx:", performTx.hash);
    await performTx.wait();
    console.log("✅ Ejecutado");
}

main().catch(console.error); 