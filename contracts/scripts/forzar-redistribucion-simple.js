const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61';
const DIA_A_REDISTRIBUIR = 20267;

async function main() {
    console.log('🔄 FORZANDO REDISTRIBUCIÓN DÍA 20267');
    console.log('='.repeat(60));
    
    const [deployer] = await ethers.getSigners();
    const contract = await ethers.getContractAt('LottoMojiCore', CONTRACT_ADDRESS);
    
    console.log('👤 Ejecutando como:', deployer.address);
    console.log('📅 Día a redistribuir:', DIA_A_REDISTRIBUIR);
    
    const formatUSDC = (amount) => (Number(amount) / 1e6).toFixed(6);
    
    // Estado inicial
    console.log('\n📊 1. ESTADO INICIAL');
    console.log('-'.repeat(40));
    
    const initialInfo = await contract.getDailyPoolInfo(DIA_A_REDISTRIBUIR);
    const initialPools = await contract.getMainPoolBalances();
    
    console.log('🎯 Sorteado:', initialInfo.drawn);
    console.log('📦 Distribuido:', initialInfo.distributed);
    console.log('💰 Total recolectado:', formatUSDC(initialInfo.totalCollected), 'USDC');
    console.log('🔢 Números ganadores:', initialInfo.winningNumbers.map(n => Number(n)));
    
    console.log('\n🏆 POOLS INICIALES:');
    console.log('🥇 Primer Premio:', formatUSDC(initialPools.firstPrizeAccumulated), 'USDC');
    console.log('🥈 Segundo Premio:', formatUSDC(initialPools.secondPrizeAccumulated), 'USDC');
    console.log('🥉 Tercer Premio:', formatUSDC(initialPools.thirdPrizeAccumulated), 'USDC');
    console.log('💼 Desarrollo:', formatUSDC(initialPools.developmentAccumulated), 'USDC');
    
    // Intentar redistribución
    console.log('\n🚀 2. EJECUTANDO REDISTRIBUCIÓN');
    console.log('-'.repeat(40));
    
    let redistribucionExitosa = false;
    
    try {
        console.log('🔄 Ejecutando performUpkeep()...');
        
        // Primero verificar si se necesita upkeep
        const upkeepNeeded = await contract.checkUpkeep('0x');
        console.log('⚡ Upkeep needed:', upkeepNeeded[0]);
        
        // Ejecutar performUpkeep independientemente
        const tx = await contract.performUpkeep('0x', {
            gasLimit: 2000000 // Gas suficiente
        });
        
        console.log('📝 Hash de transacción:', tx.hash);
        console.log('⏳ Esperando confirmación...');
        
        const receipt = await tx.wait();
        console.log('✅ performUpkeep() ejecutado exitosamente');
        console.log('📊 Gas usado:', Number(receipt.gasUsed));
        
        redistribucionExitosa = true;
        
    } catch (error) {
        console.log('❌ Error ejecutando performUpkeep():', error.message);
        
        // Mostrar información específica del error
        if (error.message.includes('revert')) {
            console.log('💡 El contrato rechazó la transacción');
        } else if (error.message.includes('gas')) {
            console.log('💡 Problema relacionado con gas');
        } else {
            console.log('💡 Error desconocido');
        }
    }
    
    // Esperar procesamiento
    if (redistribucionExitosa) {
        console.log('\n⏳ Esperando procesamiento...');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Verificar estado final
    console.log('\n📊 3. ESTADO FINAL');
    console.log('-'.repeat(40));
    
    const finalInfo = await contract.getDailyPoolInfo(DIA_A_REDISTRIBUIR);
    const finalPools = await contract.getMainPoolBalances();
    
    console.log('🎯 Sorteado:', finalInfo.drawn);
    console.log('📦 Distribuido:', finalInfo.distributed);
    console.log('💰 Total recolectado:', formatUSDC(finalInfo.totalCollected), 'USDC');
    
    console.log('\n🏆 POOLS FINALES:');
    console.log('🥇 Primer Premio:', formatUSDC(finalPools.firstPrizeAccumulated), 'USDC');
    console.log('🥈 Segundo Premio:', formatUSDC(finalPools.secondPrizeAccumulated), 'USDC');
    console.log('🥉 Tercer Premio:', formatUSDC(finalPools.thirdPrizeAccumulated), 'USDC');
    console.log('💼 Desarrollo:', formatUSDC(finalPools.developmentAccumulated), 'USDC');
    
    // Detectar cambios
    console.log('\n📈 4. CAMBIOS DETECTADOS');
    console.log('-'.repeat(40));
    
    const cambios = {
        primero: Number(finalPools.firstPrizeAccumulated) - Number(initialPools.firstPrizeAccumulated),
        segundo: Number(finalPools.secondPrizeAccumulated) - Number(initialPools.secondPrizeAccumulated),
        tercero: Number(finalPools.thirdPrizeAccumulated) - Number(initialPools.thirdPrizeAccumulated),
        desarrollo: Number(finalPools.developmentAccumulated) - Number(initialPools.developmentAccumulated)
    };
    
    console.log('🥇 Cambio Primer Premio:', formatUSDC(cambios.primero), 'USDC');
    console.log('🥈 Cambio Segundo Premio:', formatUSDC(cambios.segundo), 'USDC');
    console.log('🥉 Cambio Tercer Premio:', formatUSDC(cambios.tercero), 'USDC');
    console.log('💼 Cambio Desarrollo:', formatUSDC(cambios.desarrollo), 'USDC');
    
    const totalCambios = Math.abs(cambios.primero) + Math.abs(cambios.segundo) + 
                        Math.abs(cambios.tercero) + Math.abs(cambios.desarrollo);
    
    console.log('📊 Total cambios:', formatUSDC(totalCambios), 'USDC');
    
    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN');
    console.log('='.repeat(60));
    
    if (redistribucionExitosa) {
        console.log('✅ REDISTRIBUCIÓN EJECUTADA EXITOSAMENTE');
        
        if (totalCambios > 0) {
            console.log('💰 Se detectaron cambios en las pools');
            console.log('🎉 Los fondos fueron redistribuidos');
        } else {
            console.log('💡 No se detectaron cambios en las pools');
            console.log('🔄 La distribución ya estaba correcta');
        }
        
        console.log('\n🚀 PRÓXIMOS PASOS:');
        console.log('1. Los premios están listos para reclamar');
        console.log('2. Usa claimPrize(ticketId) para reclamar');
        console.log('3. Tickets ganadores: #52 y #53');
        
    } else {
        console.log('❌ LA REDISTRIBUCIÓN FALLÓ');
        console.log('💡 Posibles causas:');
        console.log('- Ya estaba correctamente distribuido');
        console.log('- Problemas de permisos');
        console.log('- Timing incorrecto');
    }
    
    console.log('='.repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    }); 