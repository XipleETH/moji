const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61';
const TICKETS_GRATIS = [160, 194, 214]; // Tickets gratis ganadores

async function main() {
    console.log('🎫 RECLAMACIÓN DE TICKETS GRATIS - DÍA 20267');
    console.log('='.repeat(60));
    
    const [deployer] = await ethers.getSigners();
    const contract = await ethers.getContractAt('LottoMojiCore', CONTRACT_ADDRESS);
    
    console.log('👤 Reclamando como:', deployer.address);
    console.log('🎫 Tickets gratis:', TICKETS_GRATIS);
    
    const formatUSDC = (amount) => (Number(amount) / 1e6).toFixed(6);
    
    // Verificar información de los tickets gratis
    console.log('\n🎫 1. VERIFICACIÓN DE TICKETS GRATIS');
    console.log('-'.repeat(40));
    
    for (const ticketId of TICKETS_GRATIS) {
        try {
            const ticketInfo = await contract.getFullTicketInfo(ticketId);
            console.log(`\n🎫 TICKET #${ticketId}:`);
            console.log('  🔢 Números:', ticketInfo.numbers.map(n => Number(n)));
            console.log('  📅 Día:', Number(ticketInfo.gameDay));
            console.log('  👤 Owner:', ticketInfo.ticketOwner);
            console.log('  ✅ Active:', ticketInfo.isActive);
            
            // Verificar coincidencias con números ganadores [18, 20, 23, 17]
            const numerosGanadores = [18, 20, 23, 17];
            const ticketNumbers = ticketInfo.numbers.map(n => Number(n));
            
            let exactMatches = 0;
            let totalMatches = 0;
            
            for (let i = 0; i < 4; i++) {
                if (ticketNumbers[i] === numerosGanadores[i]) {
                    exactMatches++;
                }
            }
            
            for (let num of ticketNumbers) {
                if (numerosGanadores.includes(num)) {
                    totalMatches++;
                }
            }
            
            console.log('  🎯 Coincidencias exactas:', exactMatches);
            console.log('  🎯 Coincidencias totales:', totalMatches);
            
            if (totalMatches >= 3) {
                console.log('  ✅ CALIFICA PARA TICKETS GRATIS');
            } else {
                console.log('  ❌ No califica para tickets gratis');
            }
            
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
    
    // Proceder con la reclamación
    console.log('\n🚀 2. PROCESO DE RECLAMACIÓN DE TICKETS GRATIS');
    console.log('-'.repeat(40));
    
    let reclamacionesExitosas = 0;
    let reclamacionesFallidas = 0;
    let ticketsGratisObtenidos = 0;
    
    for (const ticketId of TICKETS_GRATIS) {
        try {
            console.log(`\n🎫 RECLAMANDO TICKET GRATIS #${ticketId}`);
            console.log('  ' + '-'.repeat(35));
            
            // Estimar gas para la transacción
            console.log('  ⛽ Estimando gas...');
            const gasEstimate = await contract.claimPrize.estimateGas(ticketId);
            console.log('  📊 Gas estimado:', Number(gasEstimate));
            
            // Ejecutar la reclamación
            console.log('  🚀 Ejecutando claimPrize()...');
            const tx = await contract.claimPrize(ticketId, {
                gasLimit: Math.floor(Number(gasEstimate) * 1.5) // 50% extra de gas
            });
            
            console.log('  📝 Hash de transacción:', tx.hash);
            console.log('  ⏳ Esperando confirmación...');
            
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log('  ✅ ¡TICKET GRATIS RECLAMADO EXITOSAMENTE!');
                console.log('  📊 Gas usado:', Number(receipt.gasUsed));
                console.log('  💸 Costo gas (wei):', Number(receipt.gasUsed) * Number(receipt.gasPrice));
                
                reclamacionesExitosas++;
                
                // Analizar eventos para contar tickets gratis obtenidos
                if (receipt.logs && receipt.logs.length > 0) {
                    console.log('  📋 Eventos emitidos:', receipt.logs.length);
                    
                    // Los tickets gratis normalmente no transfieren USDC, sino que otorgan tickets
                    // para el próximo sorteo
                    receipt.logs.forEach((log, index) => {
                        console.log(`    📄 Log ${index + 1}: ${log.topics.length} topics`);
                        if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
                            console.log(`      ✅ Evento del contrato LottoMoji`);
                            ticketsGratisObtenidos++; // Estimación
                        }
                    });
                }
                
            } else {
                console.log('  ❌ La transacción fue revertida');
                reclamacionesFallidas++;
            }
            
            // Esperar entre reclamaciones
            if (ticketId !== TICKETS_GRATIS[TICKETS_GRATIS.length - 1]) {
                console.log('  ⏳ Esperando 3 segundos antes de la siguiente reclamación...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.log(`  ❌ Error reclamando ticket #${ticketId}:`);
            console.log('  📝 Mensaje completo:', error.message);
            
            reclamacionesFallidas++;
            
            // Analizar tipos de error comunes
            if (error.message.includes('Prize already claimed')) {
                console.log('  💡 Este ticket gratis ya fue reclamado anteriormente');
            } else if (error.message.includes('No prize to claim')) {
                console.log('  💡 Este ticket no tiene premio para reclamar');
            } else if (error.message.includes('Not ticket owner')) {
                console.log('  💡 No eres el propietario de este ticket');
            } else if (error.message.includes('revert')) {
                console.log('  💡 El contrato rechazó la transacción');
                
                // Posible que los tickets gratis se otorguen automáticamente
                if (error.message.includes('already')) {
                    console.log('  🤔 Posiblemente ya se otorgaron automáticamente');
                }
            } else {
                console.log('  💡 Error técnico, revisa la conexión');
            }
        }
    }
    
    // Verificar tickets disponibles para próximos sorteos
    console.log('\n🔮 3. VERIFICACIÓN DE TICKETS FUTUROS');
    console.log('-'.repeat(40));
    
    try {
        // Verificar día actual y próximo
        const currentDay = await contract.getCurrentDay();
        console.log('📅 Día actual:', Number(currentDay));
        
        // Buscar tickets recientes que podrían ser para el próximo sorteo
        const totalSupply = await contract.totalSupply();
        console.log('🎫 Total tickets creados:', Number(totalSupply));
        
        // Verificar últimos 10 tickets para ver si hay nuevos tickets gratis
        console.log('\n🔍 Verificando últimos tickets creados...');
        for (let i = Math.max(1, Number(totalSupply) - 10); i <= Number(totalSupply); i++) {
            try {
                const ticketInfo = await contract.getFullTicketInfo(i);
                if (ticketInfo.ticketOwner.toLowerCase() === deployer.address.toLowerCase()) {
                    console.log(`🎫 Ticket #${i}: Día ${Number(ticketInfo.gameDay)} - [${ticketInfo.numbers.map(n => Number(n)).join(', ')}] - Activo: ${ticketInfo.isActive}`);
                }
            } catch (error) {
                // Ticket no existe o error
            }
        }
        
    } catch (error) {
        console.log('❌ Error verificando tickets futuros:', error.message);
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN FINAL DE TICKETS GRATIS');
    console.log('='.repeat(60));
    
    console.log('🎫 Tickets gratis procesados:', TICKETS_GRATIS.length);
    console.log('✅ Reclamaciones exitosas:', reclamacionesExitosas);
    console.log('❌ Reclamaciones fallidas:', reclamacionesFallidas);
    console.log('🎁 Tickets gratis estimados obtenidos:', ticketsGratisObtenidos);
    
    if (reclamacionesExitosas === TICKETS_GRATIS.length) {
        console.log('\n🎉 ¡ÉXITO TOTAL EN TICKETS GRATIS!');
        console.log('🏆 TODOS LOS TICKETS GRATIS FUERON RECLAMADOS');
        console.log('🎁 Deberías tener tickets adicionales para futuros sorteos');
        console.log('🚀 Los tickets gratis se usan automáticamente en próximos sorteos');
        
    } else if (reclamacionesExitosas > 0) {
        console.log('\n🎊 ¡ÉXITO PARCIAL EN TICKETS GRATIS!');
        console.log('✅', reclamacionesExitosas, 'de', TICKETS_GRATIS.length, 'tickets gratis reclamados');
        console.log('⚠️ Revisa los errores de los tickets fallidos arriba');
        
    } else {
        console.log('\n🤔 NO SE PUDIERON RECLAMAR TICKETS GRATIS');
        console.log('💡 Posibles causas:');
        console.log('  - Los tickets gratis se otorgan automáticamente');
        console.log('  - Ya fueron procesados en la distribución');
        console.log('  - La lógica del contrato es diferente');
    }
    
    console.log('\n💡 NOTA IMPORTANTE:');
    console.log('🎫 Los tickets gratis pueden otorgarse automáticamente');
    console.log('🔮 Participan en sorteos futuros sin costo adicional');
    console.log('📊 Verifica tu total de tickets para próximos sorteos');
    
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