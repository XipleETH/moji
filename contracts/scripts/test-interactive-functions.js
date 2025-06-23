const { ethers } = require("hardhat");

const CONTRACT_ADDRESS = "0xE0afd152Ec3F945A32586eb01A28522F1F69c15c";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
    console.log("PRUEBA DE FUNCIONES INTERACTIVAS DEL CONTRATO LOTTOMOJI");
    console.log("=".repeat(65));
    
    const [deployer] = await ethers.getSigners();
    console.log("Cuenta de prueba:", deployer.address);
    
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    const usdcContract = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    
    try {
        // Verificar balances antes
        console.log("\n1. BALANCES INICIALES");
        console.log("-".repeat(30));
        
        const ticketPrice = await contract.TICKET_PRICE();
        const userBalance = await usdcContract.balanceOf(deployer.address);
        const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
        
        console.log("Precio del ticket:", ethers.formatUnits(ticketPrice, 6), "USDC");
        console.log("Balance del usuario:", ethers.formatUnits(userBalance, 6), "USDC");
        console.log("Balance del contrato:", ethers.formatUnits(contractBalance, 6), "USDC");
        
        if (userBalance < ticketPrice) {
            console.log("\nERROR: Balance insuficiente para comprar ticket");
            console.log("Necesitas conseguir USDC en Base Sepolia usando un faucet");
            return;
        }
        
        // Verificar aprobacion actual
        console.log("\n2. VERIFICAR APROBACION USDC");
        console.log("-".repeat(30));
        
        const currentAllowance = await usdcContract.allowance(deployer.address, CONTRACT_ADDRESS);
        console.log("Aprobacion actual:", ethers.formatUnits(currentAllowance, 6), "USDC");
        
        if (currentAllowance < ticketPrice) {
            console.log("Aprobando USDC para el contrato...");
            const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, ethers.parseUnits("10", 6));
            await approveTx.wait();
            console.log("USDC aprobado exitosamente - 10 USDC");
        } else {
            console.log("Ya tienes suficiente aprobacion");
        }
        
        // Generar numeros aleatorios validos para el ticket
        console.log("\n3. GENERANDO NUMEROS PARA TICKET");
        console.log("-".repeat(30));
        
        const randomNumbers = [
            Math.floor(Math.random() * 25),
            Math.floor(Math.random() * 25),
            Math.floor(Math.random() * 25),
            Math.floor(Math.random() * 25)
        ];
        
        console.log("Numeros seleccionados:", randomNumbers);
        
        // Validar numeros antes de comprar
        const isValid = await contract.validateEmojiSelection(randomNumbers);
        console.log("Numeros son validos:", isValid);
        
        if (!isValid) {
            console.log("ERROR: Numeros no validos");
            return;
        }
        
        // Comprar ticket
        console.log("\n4. COMPRANDO TICKET");
        console.log("-".repeat(30));
        
        const ticketCounterBefore = await contract.ticketCounter();
        console.log("Tickets vendidos antes:", ticketCounterBefore.toString());
        
        console.log("Comprando ticket...");
        const buyTx = await contract.buyTicket(randomNumbers);
        const receipt = await buyTx.wait();
        
        console.log("Ticket comprado exitosamente!");
        console.log("Hash de transaccion:", receipt.hash);
        console.log("Gas usado:", receipt.gasUsed.toString());
        
        // Verificar ticket creado
        const ticketCounterAfter = await contract.ticketCounter();
        console.log("Tickets vendidos despues:", ticketCounterAfter.toString());
        
        // Obtener informacion del ticket recien comprado
        console.log("\n5. INFORMACION DEL TICKET COMPRADO");
        console.log("-".repeat(30));
        
        const newTicketId = ticketCounterAfter;
        const ticketInfo = await contract.getTicketInfo(newTicketId);
        
        console.log("ID del ticket:", newTicketId.toString());
        console.log("Propietario:", ticketInfo.ticketOwner);
        console.log("Numeros:", ticketInfo.numbers.toString());
        console.log("Dia del juego:", ticketInfo.gameDay.toString());
        console.log("Activo:", ticketInfo.isActive);
        console.log("Coincidencias actuales:", ticketInfo.matches.toString());
        
        // Verificar que el NFT fue minteado
        console.log("\n6. VERIFICACION NFT");
        console.log("-".repeat(30));
        
        const nftOwner = await contract.ownerOf(newTicketId);
        const tokenURI = await contract.tokenURI(newTicketId);
        
        console.log("Propietario del NFT:", nftOwner);
        console.log("Token URI:", tokenURI);
        
        // Verificar balances despues
        console.log("\n7. BALANCES FINALES");
        console.log("-".repeat(30));
        
        const userBalanceAfter = await usdcContract.balanceOf(deployer.address);
        const contractBalanceAfter = await usdcContract.balanceOf(CONTRACT_ADDRESS);
        
        console.log("Balance del usuario:", ethers.formatUnits(userBalanceAfter, 6), "USDC");
        console.log("Balance del contrato:", ethers.formatUnits(contractBalanceAfter, 6), "USDC");
        console.log("Diferencia usuario:", ethers.formatUnits(userBalance - userBalanceAfter, 6), "USDC");
        console.log("Diferencia contrato:", ethers.formatUnits(contractBalanceAfter - contractBalance, 6), "USDC");
        
        // Verificar estado del pool diario actualizado
        console.log("\n8. ESTADO DEL POOL DIARIO ACTUALIZADO");
        console.log("-".repeat(30));
        
        const currentGameDay = await contract.getCurrentDay();
        const dailyPool = await contract.dailyPools(currentGameDay);
        
        console.log("Total recolectado:", ethers.formatUnits(dailyPool.totalCollected, 6), "USDC");
        console.log("Porcion principal (80%):", ethers.formatUnits(dailyPool.mainPoolPortion, 6), "USDC");
        console.log("Porcion reserva (20%):", ethers.formatUnits(dailyPool.reservePortion, 6), "USDC");
        console.log("Premio diario primer lugar:", ethers.formatUnits(dailyPool.firstPrizeDaily, 6), "USDC");
        console.log("Premio diario segundo lugar:", ethers.formatUnits(dailyPool.secondPrizeDaily, 6), "USDC");
        console.log("Premio diario tercer lugar:", ethers.formatUnits(dailyPool.thirdPrizeDaily, 6), "USDC");
        console.log("Desarrollo diario:", ethers.formatUnits(dailyPool.developmentDaily, 6), "USDC");
        
        // Verificar tickets del usuario
        console.log("\n9. TODOS LOS TICKETS DEL USUARIO");
        console.log("-".repeat(30));
        
        const userTickets = await contract.getUserTickets(deployer.address);
        console.log("Total de tickets:", userTickets.length);
        
        for (let i = 0; i < userTickets.length; i++) {
            const ticketId = userTickets[i];
            const ticketInfo = await contract.getTicketInfo(ticketId);
            console.log(`Ticket ${ticketId}: [${ticketInfo.numbers.join(',')}] - Dia ${ticketInfo.gameDay} - Activo: ${ticketInfo.isActive}`);
        }
        
        console.log("\nPRUEBA DE FUNCIONES INTERACTIVAS COMPLETADA");
        console.log("=".repeat(65));
        
    } catch (error) {
        console.error("Error en la prueba:", error);
        
        if (error.reason) {
            console.error("Razon del error:", error.reason);
        }
        
        if (error.data) {
            console.error("Datos del error:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 