const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61';
const TICKETS_GANADORES = [52, 53]; // Primer y segundo premio

async function main() {
    console.log('🏆 RECLAMACIÓN DE PREMIOS - DÍA 20267');
    console.log('='.repeat(60));
    
    const [deployer] = await ethers.getSigners();
    const contract = await ethers.getContractAt('LottoMojiCore', CONTRACT_ADDRESS);
    
    console.log('👤 Reclamando como:', deployer.address);
    console.log('🎫 Tickets ganadores:', TICKETS_GANADORES);
    
    const formatUSDC = (amount) => (Number(amount) / 1e6).toFixed(6);
    
    // Verificar saldo inicial de USDC
    console.log('\n💰 1. SALDO INICIAL');
    console.log('-'.repeat(40));
    
    const balanceInicial = await contract.getTokenBalance(deployer.address);
    console.log('💵 Saldo inicial USDC:', formatUSDC(balanceInicial));
    
    // Verificar información de los tickets
    console.log('\n🎫 2. VERIFICACIÓN DE TICKETS GANADORES');
    console.log('-'.repeat(40));
    
    for (const ticketId of TICKETS_GANADORES) {
        try {
            const ticketInfo = await contract.getFullTicketInfo(ticketId);
            console.log(`\n🎫 TICKET #${ticketId}:`);
            console.log('  🔢 Números:', ticketInfo.numbers.map(n => Number(n)));
            console.log('  📅 Día:', Number(ticketInfo.gameDay));
            console.log('  👤 Owner:', ticketInfo.ticketOwner);
            console.log('  ✅ Active:', ticketInfo.isActive);
            
            // Verificar que sea nuestro
            if (ticketInfo.ticketOwner.toLowerCase() !== deployer.address.toLowerCase()) {
                console.log('  ❌ ERROR: Este ticket no te pertenece');
                return;
            }
        } catch (error) {
            console.log(`❌ Error verificando ticket #${ticketId}:`, error.message);
            return;
        }
    }
    
    // Verificar pools disponibles
    console.log('\n🏆 3. POOLS DISPONIBLES');
    console.log('-'.repeat(40));
    
    const mainPools = await contract.getMainPoolBalances();
    console.log('🥇 Primer Premio disponible:', formatUSDC(mainPools.firstPrizeAccumulated), 'USDC');
    console.log('🥈 Segundo Premio disponible:', formatUSDC(mainPools.secondPrizeAccumulated), 'USDC');
    console.log('🥉 Tercer Premio disponible:', formatUSDC(mainPools.thirdPrizeAccumulated), 'USDC');
    
    // Proceder con la reclamación
    console.log('\n🚀 4. PROCESO DE RECLAMACIÓN');
    console.log('-'.repeat(40));
    
    let totalReclamado = 0;
    let reclamacionesExitosas = 0;
    
    for (const ticketId of TICKETS_GANADORES) {
        try {
            console.log(`\n🎫 RECLAMANDO TICKET #${ticketId}`);
            console.log('  ' + '-'.repeat(30));
            
            // Estimar gas para la transacción
            console.log('  ⛽ Estimando gas...');
            const gasEstimate = await contract.claimPrize.estimateGas(ticketId);
            console.log('  📊 Gas estimado:', Number(gasEstimate));
            
            // Ejecutar la reclamación
            console.log('  🚀 Ejecutando claimPrize()...');
            const tx = await contract.claimPrize(ticketId, {
                gasLimit: Math.floor(Number(gasEstimate) * 1.3) // 30% extra de gas
            });
            
            console.log('  📝 Hash de transacción:', tx.hash);
            console.log('  ⏳ Esperando confirmación...');
            
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log('  ✅ ¡PREMIO RECLAMADO EXITOSAMENTE!');
                console.log('  📊 Gas usado:', Number(receipt.gasUsed));
                console.log('  💸 Costo gas:', formatUSDC(Number(receipt.gasUsed) * Number(receipt.gasPrice)), 'ETH equivalent');
                
                reclamacionesExitosas++;
                
                // Analizar eventos emitidos
                if (receipt.logs && receipt.logs.length > 0) {
                    console.log('  📋 Eventos emitidos:', receipt.logs.length);
                }
                
            } else {
                console.log('  ❌ La transacción fue revertida');
            }
            
            // Esperar un poco entre reclamaciones
            if (ticketId !== TICKETS_GANADORES[TICKETS_GANADORES.length - 1]) {
                console.log('  ⏳ Esperando antes de la siguiente reclamación...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.log(`  ❌ Error reclamando ticket #${ticketId}:`);
            console.log('  📝 Mensaje:', error.message);
            
            // Analizar tipos de error comunes
            if (error.message.includes('Prize already claimed')) {
                console.log('  💡 Este premio ya fue reclamado anteriormente');
            } else if (error.message.includes('No prize to claim')) {
                console.log('  💡 Este ticket no tiene premio para reclamar');
            } else if (error.message.includes('Not ticket owner')) {
                console.log('  💡 No eres el propietario de este ticket');
            } else if (error.message.includes('Insufficient balance')) {
                console.log('  💡 No hay suficientes fondos en las pools');
            } else {
                console.log('  💡 Error desconocido, revisa los detalles');
            }
        }
    }
    
    // Verificar saldo final
    console.log('\n💰 5. VERIFICACIÓN FINAL');
    console.log('-'.repeat(40));
    
    console.log('⏳ Esperando actualización de saldos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const balanceFinal = await contract.getTokenBalance(deployer.address);
    console.log('💵 Saldo final USDC:', formatUSDC(balanceFinal));
    
    const diferencia = Number(balanceFinal) - Number(balanceInicial);
    
    if (diferencia > 0) {
        console.log('🎉 USDC RECLAMADOS:', formatUSDC(diferencia), 'USDC');
        totalReclamado = diferencia;
    } else {
        console.log('😞 No se detectaron cambios en el saldo');
    }
    
    // Verificar pools después de la reclamación
    const finalPools = await contract.getMainPoolBalances();
    console.log('\n🏆 POOLS DESPUÉS DE RECLAMACIÓN:');
    console.log('🥇 Primer Premio restante:', formatUSDC(finalPools.firstPrizeAccumulated), 'USDC');
    console.log('🥈 Segundo Premio restante:', formatUSDC(finalPools.secondPrizeAccumulated), 'USDC');
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DE RECLAMACIÓN');
    console.log('='.repeat(60));
    
    console.log('🎫 Tickets procesados:', TICKETS_GANADORES.length);
    console.log('✅ Reclamaciones exitosas:', reclamacionesExitosas);
    console.log('💰 Total reclamado:', formatUSDC(totalReclamado), 'USDC');
    
    if (reclamacionesExitosas === TICKETS_GANADORES.length) {
        console.log('\n🎉 ¡FELICITACIONES!');
        console.log('🏆 TODOS LOS PREMIOS FUERON RECLAMADOS EXITOSAMENTE');
        console.log('💰 Has recibido', formatUSDC(totalReclamado), 'USDC en tu wallet');
        console.log('🚀 Los fondos están disponibles para usar');
        
        if (totalReclamado >= 7300000) { // ~7.3 USDC en wei
            console.log('✨ ¡Obtuviste ambos premios principales!');
        }
    } else if (reclamacionesExitosas > 0) {
        console.log('\n🎊 ¡PARCIALMENTE EXITOSO!');
        console.log('✅ Algunos premios fueron reclamados');
        console.log('⚠️ Revisa los errores de los tickets fallidos');
    } else {
        console.log('\n😞 NO SE PUDIERON RECLAMAR PREMIOS');
        console.log('💡 Posibles causas:');
        console.log('  - Los premios ya fueron reclamados');  
        console.log('  - Problemas con las pools');
        console.log('  - Errores de timing');
    }
    
    console.log('='.repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error general:', error);
        process.exit(1);
    }); 