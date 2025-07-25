const { ethers } = require("hardhat");

async function main() {
    console.log(" VERIFICANDO CONFIGURACIÓN HORARIA");
    console.log("=" + "=".repeat(40));
    
    const CONTRACT_ADDRESS = "0x599D73443e2fE18b03dfD8d28cad40af26C04155";
    
    const [deployer] = await ethers.getSigners();
    console.log(" Contrato:", CONTRACT_ADDRESS);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    const drawInterval = await contract.DRAW_INTERVAL();
    const drawTimeUTC = await contract.drawTimeUTC();
    const gameActive = await contract.gameActive();
    
    console.log(" DRAW_INTERVAL:", Number(drawInterval), "segundos");
    console.log(" DRAW_INTERVAL:", Number(drawInterval) / 3600, "horas");
    console.log(" drawTimeUTC:", Number(drawTimeUTC) / 3600, "horas");
    console.log(" gameActive:", gameActive);
    
    if (Number(drawInterval) === 3600) {
        console.log(" CONFIRMADO: SORTEOS CADA HORA");
        console.log(" Configuración horaria exitosa");
    } else {
        console.log(" ERROR: DRAW_INTERVAL =", Number(drawInterval));
    }
}

main().catch(console.error);
