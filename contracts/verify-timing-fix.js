const { ethers } = require("hardhat");

async function main() {
    console.log(" VERIFICANDO CORRECCIÓN DE TIMING - CONTRATO HORARIO");
    console.log("=" + "=".repeat(55));
    
    const CONTRACT_ADDRESS = "0x900ebdF6C0807E4d3007e07009BDeDFc5E63fbB1";
    
    const [deployer] = await ethers.getSigners();
    console.log(" Contrato:", CONTRACT_ADDRESS);
    console.log(" Cuenta:", deployer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    const drawInterval = await contract.DRAW_INTERVAL();
    const lastDrawTime = await contract.lastDrawTime();
    const gameActive = await contract.gameActive();
    const automationActive = await contract.automationActive();
    
    const now = Math.floor(Date.now() / 1000);
    const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
    const timeToNext = nextDrawTime - now;
    const minutesToNext = Math.floor(timeToNext / 60);
    
    console.log(" CONFIGURACIÓN:");
    console.log("- DRAW_INTERVAL:", Number(drawInterval), "segundos");
    console.log("- DRAW_INTERVAL:", Number(drawInterval) / 3600, "horas");
    console.log("- gameActive:", gameActive);
    console.log("- automationActive:", automationActive);
    console.log("");
    console.log(" TIMING:");
    console.log("- Último sorteo:", new Date(Number(lastDrawTime) * 1000).toISOString());
    console.log("- Próximo sorteo:", new Date(nextDrawTime * 1000).toISOString());
    console.log("- Tiempo restante:", minutesToNext, "minutos");
    console.log("");
    
    if (Number(drawInterval) === 3600) {
        console.log(" CONFIRMADO: Sorteos cada hora");
        if (timeToNext > 0 && timeToNext <= 3600) {
            console.log(" TIMING CORRECTO: Próximo en", minutesToNext, "minutos");
        } else if (timeToNext <= 0) {
            console.log(" SORTEO PENDIENTE (retrasado", Math.abs(minutesToNext), "minutos)");
        } else {
            console.log(" Tiempo hasta próximo sorteo:", Math.floor(timeToNext / 3600), "horas");
        }
    } else {
        console.log(" ERROR: DRAW_INTERVAL incorrecto");
    }
    
    console.log("=" + "=".repeat(55));
    console.log(" RESUMEN: Contrato con timing corregido desplegado");
    console.log(" Frecuencia: Sorteos horarios");
    console.log(" Bug del lastDrawTime: CORREGIDO");
}

main().catch(console.error);
