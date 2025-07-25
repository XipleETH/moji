const { ethers } = require("ethers");

async function main() {
    console.log(" VERIFICANDO CONFIGURACIÓN HORARIA DEL NUEVO CONTRATO");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0x599D73443e2fE18b03dfD8d28cad40af26C04155";
    const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
    
    const ABI = [
        "function DRAW_INTERVAL() view returns (uint256)",
        "function drawTimeUTC() view returns (uint256)",
        "function lastDrawTime() view returns (uint256)",
        "function getCurrentDay() view returns (uint256)",
        "function gameActive() view returns (bool)",
        "function automationActive() view returns (bool)"
    ];
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    console.log(" Contrato:", CONTRACT_ADDRESS);
    
    try {
        const drawInterval = await contract.DRAW_INTERVAL();
        const drawTimeUTC = await contract.drawTimeUTC();
        const lastDrawTime = await contract.lastDrawTime();
        const currentGameDay = await contract.getCurrentDay();
        
        console.log(" DRAW_INTERVAL:", Number(drawInterval) / 3600, "horas");
        console.log(" drawTimeUTC:", Number(drawTimeUTC) / 3600, "horas");
        console.log(" getCurrentDay:", currentGameDay.toString());
        
        const now = Math.floor(Date.now() / 1000);
        const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
        const minutesToNext = Math.floor((nextDrawTime - now) / 60);
        
        console.log(" Próximo sorteo en:", minutesToNext, "minutos");
        
        if (Number(drawInterval) === 3600) {
            console.log(" CONFIRMADO: SORTEOS CADA HORA");
        } else {
            console.log(" ERROR: No es configuración horaria");
        }
        
    } catch (error) {
        console.error(" Error:", error.message);
    }
}

main().catch(console.error);
