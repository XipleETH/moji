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
    
    // Verificar información de los tickets
    console.log('\n🎫 1. VERIFICACIÓN DE TICKETS GANADORES');
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
    console.log('\n🏆 2. POOLS DISPONIBLES');
    console.log('-'.repeat(40));
    
    const mainPools = await contract.getMainPoolBalances();
    console.log('🥇 Primer Premio disponible:', formatUSDC(mainPools.firstPrizeAccumulated), 'USDC');
    console.log('🥈 Segundo Premio disponible:', formatUSDC(mainPools.secondPrizeAccumulated), 'USDC');
    console.log('🥉 Tercer Premio disponible:', formatUSDC(mainPools.thirdPrizeAccumulated), 'USDC');
    
    const expectedPrizes = {
        52: Number(mainPools.firstPrizeAccumulated), // Primer premio
        53: Number(mainPools.secondPrizeAccumulated) // Segundo premio
    };
    
    console.log('\n💰 PREMIOS ESPERADOS:');
    console.log('🎫 Ticket #52 (Primer Premio):', formatUSDC(expectedPrizes[52]), 'USDC');
    console.log('🎫 Ticket #53 (Segundo Premio):', formatUSDC(expectedPrizes[53]), 'USDC');
    console.log('💵 Total esperado:', formatUSDC(expectedPrizes[52] + expectedPrizes[53]), 'USDC');
    
    // Proceder con la reclamación
    console.log('\n🚀 3. PROCESO DE RECLAMACIÓN');
    console.log('-'.repeat(40));
    
    let reclamacionesExitosas = 0;
    let reclamacionesFallidas = 0;
    
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
                gasLimit: Math.floor(Number(gasEstimate) * 1.5) // 50% extra de gas por seguridad
            });
            
            console.log('  📝 Hash de transacción:', tx.hash);
            console.log('  ⏳ Esperando confirmación...');
            
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log('  ✅ ¡PREMIO RECLAMADO EXITOSAMENTE!');
                console.log('  📊 Gas usado:', Number(receipt.gasUsed));
                console.log('  💸 Costo gas (wei):', Number(receipt.gasUsed) * Number(receipt.gasPrice));
                
                reclamacionesExitosas++;
                
                // Mostrar eventos si están disponibles
                if (receipt.logs && receipt.logs.length > 0) {
                    console.log('  📋 Eventos emitidos:', receipt.logs.length);
                    
                    // Intentar decodificar eventos relacionados con premios
                    receipt.logs.forEach((log, index) => {
                        console.log(`    📄 Log ${index + 1}: ${log.topics.length} topics`);
                    });
                }
                
            } else {
                console.log('  ❌ La transacción fue revertida');
                reclamacionesFallidas++;
            }
            
            // Esperar entre reclamaciones
            if (ticketId !== TICKETS_GANADORES[TICKETS_GANADORES.length - 1]) {
                console.log('  ⏳ Esperando 3 segundos antes de la siguiente reclamación...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.log(`  ❌ Error reclamando ticket #${ticketId}:`);
            console.log('  📝 Mensaje completo:', error.message);
            
            reclamacionesFallidas++;
            
            // Analizar tipos de error comunes
            if (error.message.includes('Prize already claimed')) {
                console.log('  💡 Este premio ya fue reclamado anteriormente');
            } else if (error.message.includes('No prize to claim')) {
                console.log('  💡 Este ticket no tiene premio para reclamar');
            } else if (error.message.includes('Not ticket owner') || error.message.includes('not owner')) {
                console.log('  💡 No eres el propietario de este ticket');
            } else if (error.message.includes('Insufficient balance') || error.message.includes('insufficient')) {
                console.log('  💡 No hay suficientes fondos en las pools');
            } else if (error.message.includes('revert')) {
                console.log('  💡 El contrato rechazó la transacción');
            } else {
                console.log('  💡 Error técnico, revisa la conexión y el gas');
            }
        }
    }
    
    // Verificar estado final de las pools
    console.log('\n🏆 4. VERIFICACIÓN FINAL DE POOLS');
    console.log('-'.repeat(40));
    
    console.log('⏳ Esperando actualización...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalPools = await contract.getMainPoolBalances();
    console.log('🥇 Primer Premio restante:', formatUSDC(finalPools.firstPrizeAccumulated), 'USDC');
    console.log('🥈 Segundo Premio restante:', formatUSDC(finalPools.secondPrizeAccumulated), 'USDC');
    console.log('🥉 Tercer Premio restante:', formatUSDC(finalPools.thirdPrizeAccumulated), 'USDC');
    
    // Calcular cambios en las pools
    const changeFirst = Number(mainPools.firstPrizeAccumulated) - Number(finalPools.firstPrizeAccumulated);
    const changeSecond = Number(mainPools.secondPrizeAccumulated) - Number(finalPools.secondPrizeAccumulated);
    
    console.log('\n📈 CAMBIOS EN POOLS:');
    console.log('🥇 Primer Premio usado:', formatUSDC(changeFirst), 'USDC');
    console.log('🥈 Segundo Premio usado:', formatUSDC(changeSecond), 'USDC');
    console.log('💰 Total transferido:', formatUSDC(changeFirst + changeSecond), 'USDC');
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN FINAL');
    console.log('='.repeat(60));
    
    console.log('🎫 Tickets procesados:', TICKETS_GANADORES.length);
    console.log('✅ Reclamaciones exitosas:', reclamacionesExitosas);
    console.log('❌ Reclamaciones fallidas:', reclamacionesFallidas);
    console.log('💰 USDC transferido (estimado):', formatUSDC(changeFirst + changeSecond), 'USDC');
    
    if (reclamacionesExitosas === TICKETS_GANADORES.length) {
        console.log('\n🎉 ¡ÉXITO TOTAL!');
        console.log('🏆 TODOS LOS PREMIOS FUERON RECLAMADOS');
        console.log('💰 Aproximadamente', formatUSDC(changeFirst + changeSecond), 'USDC transferidos');
        console.log('🚀 Los fondos deben estar en tu wallet');
        console.log('💡 Verifica tu balance de USDC en tu wallet');
        
        if ((changeFirst + changeSecond) >= 7000000) {
            console.log('✨ ¡Recibiste ambos premios principales!');
        }
    } else if (reclamacionesExitosas > 0) {
        console.log('\n🎊 ¡ÉXITO PARCIAL!');
        console.log('✅', reclamacionesExitosas, 'de', TICKETS_GANADORES.length, 'premios reclamados');
        console.log('⚠️ Revisa los errores de los tickets fallidos arriba');
    } else {
        console.log('\n😞 NO SE PUDIERON RECLAMAR PREMIOS');
        console.log('💡 Revisa los errores específicos arriba');
        console.log('🔄 Considera intentar la reclamación manual');
    }
    
    console.log('\n🔗 Links útiles:');
    console.log('📊 BaseScan:', `https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`);
    console.log('👤 Tu wallet:', `https://sepolia.basescan.org/address/${deployer.address}`);
    console.log('='.repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error general:', error);
        process.exit(1);
    }); 