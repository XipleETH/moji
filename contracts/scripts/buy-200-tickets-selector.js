const readline = require('readline');
const { spawn } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Ejecutando ${scriptName}...\n`);
        
        const child = spawn('npx', ['hardhat', 'run', `scripts/${scriptName}`], {
            stdio: 'inherit',
            shell: true
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${scriptName} completado exitosamente\n`);
                resolve();
            } else {
                console.log(`\n❌ ${scriptName} falló con código ${code}\n`);
                reject(new Error(`Script failed with code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            console.error(`\n💥 Error ejecutando ${scriptName}:`, error.message);
            reject(error);
        });
    });
}

async function main() {
    console.log("🎫 SELECTOR DE COMPRA DE TICKETS - 200 TICKETS");
    console.log("=".repeat(60));
    console.log("Selecciona en qué red quieres comprar tickets:");
    console.log("");
    console.log("1. 🏔️  Avalanche Fuji - Contrato: 0x1B0B1A24983E51d809FBfAc424946B314fEFA271");
    console.log("2. 🔷  Base Sepolia - Contrato: 0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61");
    console.log("3. 🚀  Ambas redes (consecutivamente)");
    console.log("4. ❌  Cancelar");
    console.log("");
    
    const choice = await new Promise((resolve) => {
        rl.question('Ingresa tu opción (1-4): ', (answer) => {
            resolve(answer.trim());
        });
    });
    
    console.log("");
    
    try {
        switch (choice) {
            case '1':
                console.log("🏔️ Has seleccionado: Avalanche Fuji");
                console.log("💰 Costo total: 40 USDC (200 tickets × 0.2 USDC)");
                console.log("⏰ Sorteo: Cada día a las 04:00 UTC (11:00 PM Colombia)");
                await runScript('buy-200-tickets-avalanche-fuji.js');
                break;
                
            case '2':
                console.log("🔷 Has seleccionado: Base Sepolia");
                console.log("💰 Costo total: 40 USDC (200 tickets × 0.2 USDC)");
                console.log("⏰ Sorteo: Cada día a las 16:00 UTC (11:00 AM Colombia)");
                await runScript('buy-200-tickets-base-sepolia.js');
                break;
                
            case '3':
                console.log("🚀 Has seleccionado: Ambas redes");
                console.log("💰 Costo total: 80 USDC (400 tickets × 0.2 USDC)");
                console.log("⚠️  IMPORTANTE: Necesitas tener USDC en ambas redes");
                console.log("");
                
                const confirm = await new Promise((resolve) => {
                    rl.question('¿Estás seguro? Esto comprará 200 tickets en cada red (S/N): ', (answer) => {
                        resolve(answer.trim().toLowerCase());
                    });
                });
                
                if (confirm === 's' || confirm === 'si' || confirm === 'y' || confirm === 'yes') {
                    console.log("\n🏔️ Empezando con Avalanche Fuji...");
                    await runScript('buy-200-tickets-avalanche-fuji.js');
                    
                    console.log("\n🔷 Continuando con Base Sepolia...");
                    await runScript('buy-200-tickets-base-sepolia.js');
                    
                    console.log("\n🎉 ¡COMPRAS COMPLETADAS EN AMBAS REDES!");
                    console.log("📊 Resumen total:");
                    console.log("- 🏔️ Avalanche Fuji: 200 tickets");
                    console.log("- 🔷 Base Sepolia: 200 tickets");
                    console.log("- 💰 Total gastado: ~80 USDC");
                    console.log("- 🎫 Total de tickets: 400");
                } else {
                    console.log("❌ Compra cancelada");
                }
                break;
                
            case '4':
                console.log("❌ Operación cancelada");
                break;
                
            default:
                console.log("❌ Opción inválida. Por favor selecciona 1, 2, 3 o 4");
                break;
        }
    } catch (error) {
        console.error("\n💥 Error durante la ejecución:", error.message);
        process.exit(1);
    }
    
    rl.close();
    console.log("\n" + "=".repeat(60));
    console.log("🎫 SELECTOR COMPLETADO");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        rl.close();
        process.exit(1);
    }); 