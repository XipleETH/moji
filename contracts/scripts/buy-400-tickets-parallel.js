const { spawn } = require('child_process');
const path = require('path');

async function runScriptParallel(scriptName, networkName, emoji, hardhatNetwork) {
    return new Promise((resolve, reject) => {
        console.log(`${emoji} INICIANDO ${networkName}...`);
        
        const args = ['hardhat', 'run', `scripts/${scriptName}`];
        if (hardhatNetwork) {
            args.push('--network', hardhatNetwork);
        }
        
        const child = spawn('npx', args, {
            stdio: 'pipe',
            shell: true,
            cwd: process.cwd()
        });
        
        let output = '';
        let errors = '';
        
        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            // Mostrar progreso en tiempo real con prefijo de red
            const lines = text.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                if (line.trim()) {
                    console.log(`${emoji} ${networkName}: ${line.trim()}`);
                }
            });
        });
        
        child.stderr.on('data', (data) => {
            const text = data.toString();
            errors += text;
            console.error(`${emoji} ${networkName} ERROR: ${text.trim()}`);
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${emoji} ${networkName} COMPLETADO EXITOSAMENTE\n`);
                resolve({ 
                    network: networkName, 
                    success: true, 
                    output: output,
                    emoji: emoji
                });
            } else {
                console.log(`\n❌ ${emoji} ${networkName} FALLÓ (código ${code})\n`);
                resolve({ 
                    network: networkName, 
                    success: false, 
                    output: output,
                    errors: errors,
                    code: code,
                    emoji: emoji
                });
            }
        });
        
        child.on('error', (error) => {
            console.error(`\n💥 ${emoji} ${networkName} ERROR CRÍTICO:`, error.message);
            resolve({ 
                network: networkName, 
                success: false, 
                error: error.message,
                emoji: emoji
            });
        });
    });
}

async function main() {
    console.log("🚀 COMPRA PARALELA DE 400 TICKETS");
    console.log("=".repeat(60));
    console.log("🏔️  Avalanche Fuji: 200 tickets (40 USDC)");
    console.log("🔷  Base Sepolia: 200 tickets (40 USDC)");
    console.log("💰 TOTAL: 400 tickets (80 USDC)");
    console.log("=".repeat(60));
    console.log("\n⚠️  IMPORTANTE:");
    console.log("- Asegúrate de tener al menos 40 USDC en cada red");
    console.log("- Los scripts se ejecutarán simultáneamente");
    console.log("- Puedes ver el progreso de ambos en tiempo real");
    console.log("\n🚀 INICIANDO COMPRAS PARALELAS...\n");
    
    // Ejecutar ambos scripts en paralelo con las redes especificadas
    const [avalancheResult, baseResult] = await Promise.all([
        runScriptParallel('buy-200-tickets-avalanche-fuji.js', 'AVALANCHE FUJI', '🏔️', 'avalanche-fuji'),
        runScriptParallel('buy-200-tickets-base-sepolia.js', 'BASE SEPOLIA', '🔷', 'base-sepolia')
    ]);
    
    // Mostrar resumen final
    console.log("\n" + "=".repeat(80));
    console.log("📊 RESUMEN FINAL DE COMPRAS PARALELAS");
    console.log("=".repeat(80));
    
    let totalTickets = 0;
    let totalSuccess = 0;
    let totalNetworks = 0;
    
    [avalancheResult, baseResult].forEach(result => {
        totalNetworks++;
        console.log(`\n${result.emoji} ${result.network}:`);
        
        if (result.success) {
            console.log(`   ✅ Estado: COMPLETADO`);
            totalSuccess++;
            
            // Extraer información del output si está disponible
            if (result.output) {
                const ticketMatches = result.output.match(/Tickets comprados exitosamente: (\d+)/);
                const usdcMatches = result.output.match(/USDC gastado: ([\d.]+) USDC/);
                
                if (ticketMatches) {
                    const tickets = parseInt(ticketMatches[1]);
                    totalTickets += tickets;
                    console.log(`   🎫 Tickets comprados: ${tickets}`);
                }
                
                if (usdcMatches) {
                    console.log(`   💰 USDC gastado: ${usdcMatches[1]} USDC`);
                }
            }
        } else {
            console.log(`   ❌ Estado: FALLÓ`);
            if (result.code) {
                console.log(`   🔢 Código de error: ${result.code}`);
            }
            if (result.error) {
                console.log(`   💥 Error: ${result.error}`);
            }
        }
    });
    
    console.log("\n" + "=".repeat(50));
    console.log("📈 ESTADÍSTICAS TOTALES:");
    console.log(`✅ Redes exitosas: ${totalSuccess}/${totalNetworks}`);
    console.log(`🎫 Total de tickets comprados: ${totalTickets}`);
    console.log(`💰 Costo estimado total: ~${totalTickets * 0.2} USDC`);
    
    if (totalSuccess === totalNetworks) {
        console.log("\n🎉 ¡TODAS LAS COMPRAS COMPLETADAS EXITOSAMENTE!");
        console.log("🏔️  Avalanche Fuji: https://testnet.snowtrace.io/address/0x1B0B1A24983E51d809FBfAc424946B314fEFA271");
        console.log("🔷  Base Sepolia: https://sepolia.basescan.org/address/0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61");
        console.log("\n⏰ PRÓXIMOS SORTEOS:");
        console.log("🏔️  Avalanche Fuji: Cada día 04:00 UTC (11:00 PM Colombia)");
        console.log("🔷  Base Sepolia: Cada día 16:00 UTC (11:00 AM Colombia)");
    } else if (totalSuccess > 0) {
        console.log("\n⚠️  COMPRAS PARCIALMENTE COMPLETADAS");
        console.log("🔧 Revisa los errores arriba para las redes que fallaron");
    } else {
        console.log("\n💥 TODAS LAS COMPRAS FALLARON");
        console.log("🔧 Verifica:");
        console.log("- Balance USDC suficiente en ambas redes");
        console.log("- Wallet configurado correctamente");
        console.log("- Conexión a internet estable");
        console.log("- Estado de los contratos");
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("🚀 COMPRA PARALELA COMPLETADA");
    console.log("=".repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n💥 ERROR CRÍTICO:', error);
        process.exit(1);
    }); 