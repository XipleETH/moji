const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 LÓGICA CORRECTA DE GANADORES V5");
    console.log("=".repeat(70));
    
    // Función para contar matches exactos (posición)
    function countExactMatches(ticketNumbers, winningNumbers) {
        let matches = 0;
        for (let i = 0; i < 4; i++) {
            if (ticketNumbers[i] === winningNumbers[i]) {
                matches++;
            }
        }
        return matches;
    }
    
    // Función para contar matches en cualquier orden
    function countAnyOrderMatches(ticketNumbers, winningNumbers) {
        let ticketCopy = [...ticketNumbers];
        let winningCopy = [...winningNumbers];
        let matches = 0;
        
        // Para cada número del ticket, buscar si existe en los ganadores
        for (let i = 0; i < ticketCopy.length; i++) {
            for (let j = 0; j < winningCopy.length; j++) {
                if (ticketCopy[i] === winningCopy[j]) {
                    matches++;
                    // Remover ambos números para evitar contar duplicados
                    ticketCopy.splice(i, 1);
                    winningCopy.splice(j, 1);
                    i--; // Ajustar índice después de splice
                    break;
                }
            }
        }
        return matches;
    }
    
    // Función para determinar el tipo de premio
    function getPrizeType(ticketNumbers, winningNumbers) {
        const exactMatches = countExactMatches(ticketNumbers, winningNumbers);
        const anyOrderMatches = countAnyOrderMatches(ticketNumbers, winningNumbers);
        
        if (exactMatches === 4) {
            return { type: "FIRST", level: 1, description: "🥇 Primer Premio - 4 emojis posición exacta" };
        } else if (anyOrderMatches === 4) {
            return { type: "SECOND", level: 2, description: "🥈 Segundo Premio - 4 emojis cualquier orden" };
        } else if (exactMatches === 3) {
            return { type: "THIRD", level: 3, description: "🥉 Tercer Premio - 3 emojis posición exacta" };
        } else if (anyOrderMatches === 3) {
            return { type: "FREE_TICKETS", level: 4, description: "🎫 Tickets Gratis - 3 emojis cualquier orden" };
        } else {
            return { type: "NONE", level: 0, description: "❌ Sin premio" };
        }
    }
    
    console.log("📋 LÓGICA CORRECTA DE PREMIOS:");
    console.log("=".repeat(50));
    console.log("🥇 Primer Premio: 4 emojis en POSICIÓN EXACTA");
    console.log("🥈 Segundo Premio: 4 emojis en CUALQUIER ORDEN");
    console.log("🥉 Tercer Premio: 3 emojis en POSICIÓN EXACTA");
    console.log("🎫 Tickets Gratis: 3 emojis en CUALQUIER ORDEN");
    
    console.log("\n🧪 EJEMPLOS DE VERIFICACIÓN:");
    console.log("=".repeat(40));
    
    const winningNumbers = [8, 5, 7, 14];
    console.log("Números ganadores:", `[${winningNumbers.join(', ')}]`);
    
    const testCases = [
        {
            ticket: [8, 5, 7, 14],
            description: "Ticket idéntico"
        },
        {
            ticket: [14, 7, 5, 8],
            description: "Mismos números, orden diferente"
        },
        {
            ticket: [8, 5, 7, 20],
            description: "3 números en posición exacta"
        },
        {
            ticket: [20, 5, 7, 8],
            description: "3 números en cualquier orden"
        },
        {
            ticket: [8, 5, 20, 21],
            description: "2 números en posición exacta"
        },
        {
            ticket: [20, 21, 5, 8],
            description: "2 números en cualquier orden"
        },
        {
            ticket: [1, 2, 3, 4],
            description: "Sin coincidencias"
        }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\nCaso ${index + 1}: ${testCase.description}`);
        console.log(`Ticket: [${testCase.ticket.join(', ')}]`);
        
        const exactMatches = countExactMatches(testCase.ticket, winningNumbers);
        const anyOrderMatches = countAnyOrderMatches(testCase.ticket, winningNumbers);
        const prize = getPrizeType(testCase.ticket, winningNumbers);
        
        console.log(`- Matches exactos: ${exactMatches}`);
        console.log(`- Matches cualquier orden: ${anyOrderMatches}`);
        console.log(`- Premio: ${prize.description}`);
    });
    
    console.log("\n🔧 CÓDIGO SOLIDITY CORRECTO:");
    console.log("=".repeat(45));
    
    const correctSolidityCode = `
    function _countExactMatches(uint256 ticketId, uint8[4] memory winningNumbers) internal view returns (uint8) {
        uint8[4] memory ticketNumbers = tickets[ticketId].numbers;
        uint8 matches = 0;
        
        for (uint256 i = 0; i < 4; i++) {
            if (ticketNumbers[i] == winningNumbers[i]) {
                matches++;
            }
        }
        
        return matches;
    }
    
    function _countAnyOrderMatches(uint256 ticketId, uint8[4] memory winningNumbers) internal view returns (uint8) {
        uint8[4] memory ticketNumbers = tickets[ticketId].numbers;
        uint8 matches = 0;
        
        for (uint256 i = 0; i < 4; i++) {
            for (uint256 j = 0; j < 4; j++) {
                if (ticketNumbers[i] == winningNumbers[j]) {
                    matches++;
                    // Marcar como usado para evitar duplicados
                    winningNumbers[j] = 255; // Valor imposible
                    break;
                }
            }
        }
        
        return matches;
    }
    
    function _getPrizeLevel(uint256 ticketId, uint8[4] memory winningNumbers) internal view returns (uint8) {
        uint8 exactMatches = _countExactMatches(ticketId, winningNumbers);
        uint8 anyOrderMatches = _countAnyOrderMatches(ticketId, winningNumbers);
        
        if (exactMatches == 4) {
            return 1; // Primer Premio
        } else if (anyOrderMatches == 4) {
            return 2; // Segundo Premio
        } else if (exactMatches == 3) {
            return 3; // Tercer Premio
        } else if (anyOrderMatches == 3) {
            return 4; // Tickets Gratis
        } else {
            return 0; // Sin premio
        }
    }`;
    
    console.log(correctSolidityCode);
    
    console.log("\n🚨 PROBLEMA EN EL CONTRATO ACTUAL:");
    console.log("=".repeat(45));
    console.log("❌ Solo cuenta matches en POSICIÓN EXACTA");
    console.log("❌ No distingue entre 4 exactos vs 4 cualquier orden");
    console.log("❌ No implementa tickets gratis para 3 cualquier orden");
    console.log("❌ La distribución de premios es incorrecta");
    
    console.log("\n💡 SOLUCIÓN REQUERIDA:");
    console.log("=".repeat(30));
    console.log("1. Implementar función _countAnyOrderMatches");
    console.log("2. Modificar _getPrizeLevel para usar ambas funciones");
    console.log("3. Actualizar la distribución de premios");
    console.log("4. Agregar sistema de tickets gratis");
    console.log("5. Re-deployar el contrato con la lógica correcta");
    
    console.log("\n" + "=".repeat(70));
    console.log("🔧 ANÁLISIS DE LÓGICA COMPLETADO");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error en el script:", error);
        process.exit(1);
    }); 