const { ethers } = require("hardhat");

const CONTRACT_ADDRESS = "0xE0afd152Ec3F945A32586eb01A28522F1F69c15c";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
    console.log("PRUEBA DE TODAS LAS FUNCIONES DEL CONTRATO LOTTOMOJI");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("Cuenta de prueba:", deployer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    const usdcContract = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    
    try {
        console.log("\n1. INFORMACION BASICA");
        console.log("-".repeat(30));
        
        const ticketPrice = await contract.TICKET_PRICE();
        const emojiCount = await contract.EMOJI_COUNT();
        const drawInterval = await contract.DRAW_INTERVAL();
        const currentGameDay = await contract.getCurrentDay();
        
        console.log("Precio del ticket:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("Cantidad de emojis:", emojiCount.toString());
        console.log("Intervalo de sorteo:", (Number(drawInterval) / 3600).toString(), "horas");
        console.log("Dia actual del juego:", currentGameDay.toString());
        
        console.log("\n2. ESTADO DEL JUEGO");
        console.log("-".repeat(30));
        
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        
        console.log("Juego activo:", gameActive);
        console.log("Automatizacion activa:", automationActive);
        console.log("Pausa de emergencia:", emergencyPause);
        
        console.log("\n3. POOLS PRINCIPALES");
        console.log("-".repeat(30));
        
        const mainPools = await contract.mainPools();
        console.log("Primera acumulada:", ethers.formatUnits(mainPools.firstPrizeAccumulated, 6), "USDC");
        console.log("Segunda acumulada:", ethers.formatUnits(mainPools.secondPrizeAccumulated, 6), "USDC");
        console.log("Tercera acumulada:", ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6), "USDC");
        console.log("Desarrollo acumulado:", ethers.formatUnits(mainPools.developmentAccumulated, 6), "USDC");
        
        console.log("\n4. POOLS DE RESERVA");
        console.log("-".repeat(30));
        
        const reserves = await contract.reserves();
        console.log("Reserva primera:", ethers.formatUnits(reserves.firstPrizeReserve1, 6), "USDC");
        console.log("Reserva segunda:", ethers.formatUnits(reserves.secondPrizeReserve2, 6), "USDC");
        console.log("Reserva tercera:", ethers.formatUnits(reserves.thirdPrizeReserve3, 6), "USDC");
        
        console.log("\n5. ESTADISTICAS");
        console.log("-".repeat(30));
        
        const ticketCounter = await contract.ticketCounter();
        const totalDrawsExecuted = await contract.totalDrawsExecuted();
        const totalReservesProcessed = await contract.totalReservesProcessed();
        const lastDrawTime = await contract.lastDrawTime();
        
        console.log("Tickets vendidos:", ticketCounter.toString());
        console.log("Sorteos ejecutados:", totalDrawsExecuted.toString());
        console.log("Reservas procesadas:", totalReservesProcessed.toString());
        console.log("Ultimo sorteo:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        
        console.log("\n6. VALIDACION DE EMOJIS");
        console.log("-".repeat(30));
        
        const validSelection = [0, 5, 10, 15];
        const invalidSelection = [0, 5, 10, 25];
        
        const isValid1 = await contract.validateEmojiSelection(validSelection);
        const isValid2 = await contract.validateEmojiSelection(invalidSelection);
        
        console.log("Seleccion [0,5,10,15] es valida:", isValid1);
        console.log("Seleccion [0,5,10,25] es valida:", isValid2);
        
        console.log("\n7. POOL DIARIO ACTUAL");
        console.log("-".repeat(30));
        
        const dailyPool = await contract.dailyPools(currentGameDay);
        console.log("Total recolectado:", ethers.formatUnits(dailyPool.totalCollected, 6), "USDC");
        console.log("Porcion principal:", ethers.formatUnits(dailyPool.mainPoolPortion, 6), "USDC");
        console.log("Porcion reserva:", ethers.formatUnits(dailyPool.reservePortion, 6), "USDC");
        console.log("Sorteo ejecutado:", dailyPool.drawn);
        console.log("Distribuido:", dailyPool.distributed);
        console.log("Reservas enviadas:", dailyPool.reservesSent);
        
        console.log("\n8. ESTADO DE AUTOMATIZACION");
        console.log("-".repeat(30));
        
        try {
            const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
            console.log("Mantenimiento necesario:", upkeepNeeded);
            console.log("Datos de performance:", performData);
        } catch (error) {
            console.log("Error al verificar upkeep:", error.message);
        }
        
        console.log("\n9. BALANCES USDC");
        console.log("-".repeat(30));
        
        const contractUsdcBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
        const deployerUsdcBalance = await usdcContract.balanceOf(deployer.address);
        
        console.log("USDC en contrato:", ethers.formatUnits(contractUsdcBalance, 6), "USDC");
        console.log("USDC del usuario:", ethers.formatUnits(deployerUsdcBalance, 6), "USDC");
        
        console.log("\n10. INFORMACION NFT");
        console.log("-".repeat(30));
        
        const name = await contract.name();
        const symbol = await contract.symbol();
        const totalSupply = await contract.totalSupply();
        
        console.log("Nombre:", name);
        console.log("Simbolo:", symbol);
        console.log("Supply total:", totalSupply.toString());
        
        console.log("\n11. TICKETS DEL USUARIO");
        console.log("-".repeat(30));
        
        const userTickets = await contract.getUserTickets(deployer.address);
        console.log("Tickets del usuario:", userTickets.length);
        
        if (userTickets.length > 0) {
            console.log("Detalles de tickets:");
            for (let i = 0; i < Math.min(userTickets.length, 3); i++) {
                const ticketId = userTickets[i];
                const ticketInfo = await contract.getTicketInfo(ticketId);
                console.log(`  Ticket ${ticketId}: [${ticketInfo.numbers.join(',')}] - Dia ${ticketInfo.gameDay} - Activo: ${ticketInfo.isActive}`);
            }
        }
        
        console.log("\n12. TIEMPO HASTA PROXIMO SORTEO");
        console.log("-".repeat(30));
        
        const drawTimeUTC = await contract.drawTimeUTC();
        const now = Math.floor(Date.now() / 1000);
        const currentDayStart = Number(currentGameDay) * Number(drawInterval) - Number(drawTimeUTC);
        const nextDrawTime = currentDayStart + Number(drawInterval);
        const timeToNextDraw = nextDrawTime - now;
        
        console.log("Hora de sorteo (UTC):", (Number(drawTimeUTC) / 3600).toString() + ":00");
        console.log("Tiempo hasta proximo sorteo:", Math.floor(timeToNextDraw / 3600) + "h " + Math.floor((timeToNextDraw % 3600) / 60) + "m " + (timeToNextDraw % 60) + "s");
        console.log("Proximo sorteo:", new Date(nextDrawTime * 1000).toLocaleString());
        
        console.log("\nPRUEBA COMPLETADA EXITOSAMENTE");
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("Error en la prueba:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 