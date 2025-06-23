const { ethers } = require("hardhat");

const CONTRACT_ADDRESS = "0xE0afd152Ec3F945A32586eb01A28522F1F69c15c";

async function main() {
    console.log("PRUEBA DE FUNCIONES ADMINISTRATIVAS DEL CONTRATO LOTTOMOJI");
    console.log("=".repeat(65));
    
    const [deployer] = await ethers.getSigners();
    console.log("Cuenta de prueba:", deployer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    try {
        // Verificar owner del contrato
        console.log("\n1. VERIFICAR PROPIETARIO DEL CONTRATO");
        console.log("-".repeat(40));
        
        try {
            const owner = await contract.owner();
            console.log("Owner del contrato:", owner);
            console.log("Tu direccion:", deployer.address);
            console.log("Eres el owner:", owner.toLowerCase() === deployer.address.toLowerCase());
            
            if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
                console.log("ADVERTENCIA: No eres el owner, algunas funciones no funcionaran");
            }
        } catch (error) {
            console.log("Error obteniendo owner:", error.message);
        }
        
        // Estado actual de configuraciones
        console.log("\n2. ESTADO ACTUAL DE CONFIGURACIONES");
        console.log("-".repeat(40));
        
        const gameActive = await contract.gameActive();
        const automationActive = await contract.automationActive();
        const emergencyPause = await contract.emergencyPause();
        
        console.log("Juego activo:", gameActive);
        console.log("Automatizacion activa:", automationActive);
        console.log("Pausa de emergencia:", emergencyPause);
        
        // Probar toggle de automatizacion (solo si eres owner)
        console.log("\n3. PROBAR TOGGLE DE AUTOMATIZACION");
        console.log("-".repeat(40));
        
        try {
            console.log("Desactivando automatizacion...");
            const toggleTx1 = await contract.toggleAutomation();
            await toggleTx1.wait();
            
            const automationAfterDisable = await contract.automationActive();
            console.log("Automatizacion despues de toggle 1:", automationAfterDisable);
            
            console.log("Reactivando automatizacion...");
            const toggleTx2 = await contract.toggleAutomation();
            await toggleTx2.wait();
            
            const automationAfterEnable = await contract.automationActive();
            console.log("Automatizacion despues de toggle 2:", automationAfterEnable);
            
            console.log("Toggle de automatizacion funciona correctamente");
            
        } catch (error) {
            console.log("Error en toggle de automatizacion:", error.message);
            if (error.message.includes("Ownable")) {
                console.log("Razon: No eres el owner del contrato");
            }
        }
        
        // Probar toggle de pausa de emergencia (solo si eres owner)
        console.log("\n4. PROBAR TOGGLE DE PAUSA DE EMERGENCIA");
        console.log("-".repeat(40));
        
        try {
            console.log("Activando pausa de emergencia...");
            const pauseTx1 = await contract.toggleEmergencyPause();
            await pauseTx1.wait();
            
            const pauseAfterEnable = await contract.emergencyPause();
            console.log("Pausa de emergencia despues de toggle 1:", pauseAfterEnable);
            
            console.log("Desactivando pausa de emergencia...");
            const pauseTx2 = await contract.toggleEmergencyPause();
            await pauseTx2.wait();
            
            const pauseAfterDisable = await contract.emergencyPause();
            console.log("Pausa de emergencia despues de toggle 2:", pauseAfterDisable);
            
            console.log("Toggle de pausa de emergencia funciona correctamente");
            
        } catch (error) {
            console.log("Error en toggle de pausa de emergencia:", error.message);
            if (error.message.includes("Ownable")) {
                console.log("Razon: No eres el owner del contrato");
            }
        }
        
        // Verificar funciones de solo lectura especiales
        console.log("\n5. FUNCIONES DE INFORMACION AVANZADA");
        console.log("-".repeat(40));
        
        // Verificar tickets de un dia especifico
        const currentGameDay = await contract.getCurrentDay();
        const gameDayTickets = await contract.getGameDayTickets(currentGameDay);
        console.log("Tickets del dia actual:", gameDayTickets.length);
        
        if (gameDayTickets.length > 0) {
            console.log("IDs de tickets del dia:", gameDayTickets.slice(0, 5).toString());
            if (gameDayTickets.length > 5) {
                console.log(`... y ${gameDayTickets.length - 5} mas`);
            }
        }
        
        // Informacion de tiempo avanzada
        console.log("\n6. INFORMACION DE TIEMPO AVANZADA");
        console.log("-".repeat(40));
        
        const drawTimeUTC = await contract.drawTimeUTC();
        const drawInterval = await contract.DRAW_INTERVAL();
        const lastDrawTime = await contract.lastDrawTime();
        const lastMaintenanceTime = await contract.lastMaintenanceTime();
        
        console.log("Hora de sorteo UTC:", (Number(drawTimeUTC) / 3600).toString() + ":00");
        console.log("Intervalo de sorteo:", (Number(drawInterval) / 3600).toString() + " horas");
        console.log("Ultimo sorteo:", new Date(Number(lastDrawTime) * 1000).toLocaleString());
        console.log("Ultimo mantenimiento:", new Date(Number(lastMaintenanceTime) * 1000).toLocaleString());
        
        // Calcular proximo evento
        const now = Math.floor(Date.now() / 1000);
        const timeSinceLastDraw = now - Number(lastDrawTime);
        const timeToNextDraw = Number(drawInterval) - timeSinceLastDraw;
        
        console.log("Tiempo desde ultimo sorteo:", Math.floor(timeSinceLastDraw / 3600) + "h " + Math.floor((timeSinceLastDraw % 3600) / 60) + "m");
        console.log("Tiempo hasta proximo sorteo:", Math.floor(timeToNextDraw / 3600) + "h " + Math.floor((timeToNextDraw % 3600) / 60) + "m");
        
        // Verificar estado de upkeep
        console.log("\n7. ESTADO DETALLADO DE UPKEEP");
        console.log("-".repeat(40));
        
        try {
            const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
            console.log("Upkeep necesario:", upkeepNeeded);
            
            if (upkeepNeeded) {
                const isDraw = performData !== "0x" ? true : false;
                console.log("Tipo de upkeep:", isDraw ? "Sorteo" : "Mantenimiento");
            } else {
                console.log("No se necesita upkeep en este momento");
            }
        } catch (error) {
            console.log("Error verificando upkeep:", error.message);
        }
        
        // Informacion de percentajes y constantes
        console.log("\n8. CONFIGURACION DE PERCENTAJES");
        console.log("-".repeat(40));
        
        const dailyReservePercentage = await contract.DAILY_RESERVE_PERCENTAGE();
        const mainPoolPercentage = await contract.MAIN_POOL_PERCENTAGE();
        const firstPrizePercentage = await contract.FIRST_PRIZE_PERCENTAGE();
        const secondPrizePercentage = await contract.SECOND_PRIZE_PERCENTAGE();
        const thirdPrizePercentage = await contract.THIRD_PRIZE_PERCENTAGE();
        const developmentPercentage = await contract.DEVELOPMENT_PERCENTAGE();
        
        console.log("Reserva diaria:", dailyReservePercentage.toString() + "%");
        console.log("Pool principal:", mainPoolPercentage.toString() + "%");
        console.log("Primer premio:", firstPrizePercentage.toString() + "% (del pool principal)");
        console.log("Segundo premio:", secondPrizePercentage.toString() + "% (del pool principal)");
        console.log("Tercer premio:", thirdPrizePercentage.toString() + "% (del pool principal)");
        console.log("Desarrollo:", developmentPercentage.toString() + "% (del pool principal)");
        
        console.log("\nPRUEBA DE FUNCIONES ADMINISTRATIVAS COMPLETADA");
        console.log("=".repeat(65));
        
    } catch (error) {
        console.error("Error en la prueba:", error);
        
        if (error.reason) {
            console.error("Razon del error:", error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 