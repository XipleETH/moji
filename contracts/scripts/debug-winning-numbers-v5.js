const { ethers } = require("hardhat");

async function main() {
    console.log("🐛 DEBUGGING NÚMEROS GANADORES V5");
    console.log("=".repeat(60));
    
    const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
    
    // Obtener signer
    const [signer] = await ethers.getSigners();
    console.log("👤 Debugging con cuenta:", signer.address);
    
    // Conectar al contrato
    const LottoMojiCore = await ethers.getContractFactory("LottoMojiCore");
    const contract = LottoMojiCore.attach(CONTRACT_ADDRESS);
    
    const currentGameDay = await contract.currentGameDay();
    console.log("- Game Day actual:", currentGameDay.toString());
    
    // Obtener números ganadores globales (lastWinningNumbers)
    const globalWinningNumbers = [];
    for (let i = 0; i < 4; i++) {
        globalWinningNumbers.push(await contract.lastWinningNumbers(i));
    }
    console.log("- Números globales (lastWinningNumbers):", `[${globalWinningNumbers.join(', ')}]`);
    
    // Obtener información del día actual
    const dailyPoolInfo = await contract.getDailyPoolInfo(currentGameDay);
    const dailyWinningNumbers = dailyPoolInfo[5]; // winning numbers del día
    
    console.log("- Números del día actual (dailyPool):", `[${dailyWinningNumbers.join(', ')}]`);
    console.log("- Día actual drawn:", dailyPoolInfo[4]);
    console.log("- Día actual distributed:", dailyPoolInfo[3]);
    
    // Verificar día anterior
    const prevGameDay = currentGameDay - 1n;
    console.log("\n🔍 VERIFICANDO DÍA ANTERIOR:", prevGameDay.toString());
    
    const prevDailyInfo = await contract.getDailyPoolInfo(prevGameDay);
    const prevWinningNumbers = prevDailyInfo[5];
    
    console.log("- Números del día anterior:", `[${prevWinningNumbers.join(', ')}]`);
    console.log("- Día anterior drawn:", prevDailyInfo[4]);
    console.log("- Día anterior distributed:", prevDailyInfo[3]);
    
    // Verificar tickets específicos que mostraron discrepancias
    console.log("\n🎫 VERIFICANDO TICKETS ESPECÍFICOS:");
    console.log("=".repeat(50));
    
    const problematicTickets = [1, 68]; // Tickets que mostraron problemas
    
    for (const ticketId of problematicTickets) {
        console.log(`\nTicket ${ticketId}:`);
        
        const ticketInfo = await contract.getFullTicketInfo(ticketId);
        const ticketNumbers = ticketInfo[1].map(n => Number(n));
        const gameDay = ticketInfo[2];
        const contractMatches = Number(ticketInfo[6]);
        
        console.log("- Números del ticket:", `[${ticketNumbers.join(', ')}]`);
        console.log("- Game Day del ticket:", gameDay.toString());
        console.log("- Matches según contrato:", contractMatches);
        
        // Obtener números ganadores del día del ticket
        const ticketDayInfo = await contract.getDailyPoolInfo(gameDay);
        const ticketDayWinningNumbers = ticketDayInfo[5].map(n => Number(n));
        
        console.log("- Números ganadores del día del ticket:", `[${ticketDayWinningNumbers.join(', ')}]`);
        
        // Calcular matches manualmente contra números del día
        let manualMatchesDay = 0;
        for (let i = 0; i < 4; i++) {
            if (ticketNumbers[i] === ticketDayWinningNumbers[i]) {
                manualMatchesDay++;
            }
        }
        
        // Calcular matches manualmente contra números globales
        let manualMatchesGlobal = 0;
        for (let i = 0; i < 4; i++) {
            if (ticketNumbers[i] === Number(globalWinningNumbers[i])) {
                manualMatchesGlobal++;
            }
        }
        
        console.log("- Matches manual vs números del día:", manualMatchesDay);
        console.log("- Matches manual vs números globales:", manualMatchesGlobal);
        
        console.log("- Comparación posición por posición vs día:");
        for (let i = 0; i < 4; i++) {
            const match = ticketNumbers[i] === ticketDayWinningNumbers[i];
            console.log(`   Pos ${i}: ${ticketNumbers[i]} vs ${ticketDayWinningNumbers[i]} = ${match ? '✅' : '❌'}`);
        }
        
        console.log("- Comparación posición por posición vs global:");
        for (let i = 0; i < 4; i++) {
            const match = ticketNumbers[i] === Number(globalWinningNumbers[i]);
            console.log(`   Pos ${i}: ${ticketNumbers[i]} vs ${globalWinningNumbers[i]} = ${match ? '✅' : '❌'}`);
        }
        
        // Verificar consistencia
        if (contractMatches === manualMatchesDay) {
            console.log("✅ Contrato usa números del día correctamente");
        } else if (contractMatches === manualMatchesGlobal) {
            console.log("⚠️ Contrato usa números globales en lugar del día");
        } else {
            console.log("❌ Contrato tiene lógica incorrecta");
        }
    }
    
    // Verificar la función _countMatches directamente
    console.log("\n🔧 ANÁLISIS DE LA FUNCIÓN _countMatches:");
    console.log("=".repeat(50));
    
    console.log("La función _countMatches usa:");
    console.log("return _countMatchesForTicket(ticketId, dailyPools[gameDay].winningNumbers);");
    console.log("");
    console.log("Esto significa que debería usar los números del día específico,");
    console.log("no los números globales (lastWinningNumbers).");
    
    // Verificar si el problema es que el día actual no tiene números asignados
    console.log("\n🎯 PROBLEMA IDENTIFICADO:");
    console.log("=".repeat(40));
    
    if (dailyWinningNumbers.every(n => n === 0)) {
        console.log("❌ El día actual no tiene números ganadores asignados!");
        console.log("Los tickets se están comparando contra [0, 0, 0, 0]");
        console.log("");
        console.log("SOLUCIÓN:");
        console.log("1. El draw debe asignar números al día correcto");
        console.log("2. O los tickets deben compararse contra el día anterior");
    } else {
        console.log("✅ El día actual tiene números asignados");
    }
    
    // Verificar todos los días con draws
    console.log("\n📅 HISTORIAL DE DÍAS CON DRAWS:");
    console.log("=".repeat(40));
    
    for (let day = currentGameDay - 3n; day <= currentGameDay; day++) {
        try {
            const dayInfo = await contract.getDailyPoolInfo(day);
            const dayNumbers = dayInfo[5];
            console.log(`Día ${day}: [${dayNumbers.join(', ')}] - Drawn: ${dayInfo[4]} - Distributed: ${dayInfo[3]}`);
        } catch (error) {
            console.log(`Día ${day}: Error obteniendo info`);
        }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🐛 DEBUG COMPLETADO");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error en el script:", error);
        process.exit(1);
    }); 