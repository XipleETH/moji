const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61';
const DIA_A_REDISTRIBUIR = 20267;

async function main() {
    console.log(' FORZANDO REDISTRIBUCIÓN DÍA 20267');
    console.log('='.repeat(60));
    
    const [deployer] = await ethers.getSigners();
    const contract = await ethers.getContractAt('LottoMojiCore', CONTRACT_ADDRESS);
    
    console.log(' Ejecutando como:', deployer.address);
    console.log(' Día a redistribuir:', DIA_A_REDISTRIBUIR);
    
    const formatUSDC = (amount) => (Number(amount) / 1e6).toFixed(6);
    
    // Estado inicial
    console.log('\\n 1. ESTADO INICIAL');
    console.log('-'.repeat(40));
    
    const [initialInfo, initialPools] = await Promise.all([
        contract.getDailyPoolInfo(DIA_A_REDISTRIBUIR),
        contract.getMainPoolBalances()
    ]);
    
    console.log(' Sorteado:', initialInfo.drawn);
    console.log(' Distribuido:', initialInfo.distributed);
    console.log(' Total recolectado:', formatUSDC(initialInfo.totalCollected), 'USDC');
    console.log(' Números ganadores:', initialInfo.winningNumbers.map(n => Number(n)));
    
    console.log('\\n POOLS INICIALES:');
    console.log(' Primer Premio:', formatUSDC(initialPools.firstPrizeAccumulated), 'USDC');
    console.log(' Segundo Premio:', formatUSDC(initialPools.secondPrizeAccumulated), 'USDC');
    console.log(' Tercer Premio:', formatUSDC(initialPools.thirdPrizeAccumulated), 'USDC');
    console.log(' Desarrollo:', formatUSDC(initialPools.developmentAccumulated), 'USDC');
    
    // Intentar redistribución
    console.log('\\n 2. INTENTANDO REDISTRIBUCIÓN');
    console.log('-'.repeat(40));
    
    let redistribucionExitosa = false;
    let metodosIntentados = [];
    
    // Método 1: performUpkeep
    try {
        console.log(' Método 1: performUpkeep()...');
        const upkeepNeeded = await contract.checkUpkeep('0x');
        console.log(' Upkeep needed:', upkeepNeeded[0]);
        
        if (upkeepNeeded[0]) {
            const tx = await contract.performUpkeep('0x');
            console.log(' Hash de transacción:', tx.hash);
            console.log(' Esperando confirmación...');
            const receipt = await tx.wait();
            console.log(' performUpkeep() ejecutado exitosamente');
            console.log(' Gas usado:', Number(receipt.gasUsed));
            redistribucionExitosa = true;
            metodosIntentados.push('performUpkeep - EXITOSO');
        } else {
            console.log(' No se necesita upkeep según checkUpkeep()');
            // Intentar forzar de todos modos
            const tx = await contract.performUpkeep('0x');
            const receipt = await tx.wait();
            console.log(' performUpkeep() forzado exitosamente');
            redistribucionExitosa = true;
            metodosIntentados.push('performUpkeep forzado - EXITOSO');
        }
    } catch (error) {
        console.log(' performUpkeep() falló:', error.message);
        metodosIntentados.push('performUpkeep - FALLÓ: ' + error.message.substring(0, 50));
    }
    
    // Si performUpkeep no funcionó, intentar otros métodos
    if (!redistribucionExitosa) {
        // Método 2: Intentar llamar distribución específica del día
        try {
            console.log('\\n Método 2: Distribución específica del día...');
            // Verificar si existe función específica
            if (contract.interface.fragments.some(f => f.name === 'forceDistribution')) {
                const tx = await contract.forceDistribution(DIA_A_REDISTRIBUIR);
                const receipt = await tx.wait();
                console.log(' forceDistribution() ejecutado exitosamente');
                redistribucionExitosa = true;
                metodosIntentados.push('forceDistribution - EXITOSO');
            }
        } catch (error) {
            console.log(' Distribución específica falló:', error.message);
            metodosIntentados.push('forceDistribution - FALLÓ: ' + error.message.substring(0, 50));
        }
    }
    
    // Método 3: Intentar función de administrador si existe
    if (!redistribucionExitosa) {
        try {
            console.log('\\n Método 3: Función de administrador...');
            if (contract.interface.fragments.some(f => f.name === 'adminRedistribute')) {
                const tx = await contract.adminRedistribute(DIA_A_REDISTRIBUIR);
                const receipt = await tx.wait();
                console.log(' adminRedistribute() ejecutado exitosamente');
                redistribucionExitosa = true;
                metodosIntentados.push('adminRedistribute - EXITOSO');
            }
        } catch (error) {
            console.log(' Función de administrador falló:', error.message);
            metodosIntentados.push('adminRedistribute - FALLÓ: ' + error.message.substring(0, 50));
        }
    }
    
    // Esperar un poco para que se procesen los cambios
    if (redistribucionExitosa) {
        console.log('\\n Esperando procesamiento de cambios...');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Verificar estado final
    console.log('\\n 3. ESTADO FINAL');
    console.log('-'.repeat(40));
    
    const [finalInfo, finalPools] = await Promise.all([
        contract.getDailyPoolInfo(DIA_A_REDISTRIBUIR),
        contract.getMainPoolBalances()
    ]);
    
    console.log(' Sorteado:', finalInfo.drawn);
    console.log(' Distribuido:', finalInfo.distributed);
    console.log(' Total recolectado:', formatUSDC(finalInfo.totalCollected), 'USDC');
    
    console.log('\\n POOLS FINALES:');
    console.log(' Primer Premio:', formatUSDC(finalPools.firstPrizeAccumulated), 'USDC');
    console.log(' Segundo Premio:', formatUSDC(finalPools.secondPrizeAccumulated), 'USDC');
    console.log(' Tercer Premio:', formatUSDC(finalPools.thirdPrizeAccumulated), 'USDC');
    console.log(' Desarrollo:', formatUSDC(finalPools.developmentAccumulated), 'USDC');
    
    // Comparar cambios
    console.log('\\n 4. CAMBIOS DETECTADOS');
    console.log('-'.repeat(40));
    
    const cambiosPools = {
        primero: Number(finalPools.firstPrizeAccumulated) - Number(initialPools.firstPrizeAccumulated),
        segundo: Number(finalPools.secondPrizeAccumulated) - Number(initialPools.secondPrizeAccumulated),
        tercero: Number(finalPools.thirdPrizeAccumulated) - Number(initialPools.thirdPrizeAccumulated),
        desarrollo: Number(finalPools.developmentAccumulated) - Number(initialPools.developmentAccumulated)
    };
    
    console.log(' Cambio Primer Premio:', formatUSDC(cambiosPools.primero), 'USDC');
    console.log(' Cambio Segundo Premio:', formatUSDC(cambiosPools.segundo), 'USDC');
    console.log(' Cambio Tercer Premio:', formatUSDC(cambiosPools.tercero), 'USDC');
    console.log(' Cambio Desarrollo:', formatUSDC(cambiosPools.desarrollo), 'USDC');
    
    const totalCambios = Math.abs(cambiosPools.primero) + Math.abs(cambiosPools.segundo) + 
                        Math.abs(cambiosPools.tercero) + Math.abs(cambiosPools.desarrollo);
    
    console.log(' Total cambios detectados:', formatUSDC(totalCambios), 'USDC');
    
    // Resumen final
    console.log('\\n' + '='.repeat(60));
    console.log(' RESUMEN DE REDISTRIBUCIÓN');
    console.log('='.repeat(60));
    
    console.log(' Redistribución exitosa:', redistribucionExitosa ? ' SÍ' : ' NO');
    console.log(' Métodos intentados:', metodosIntentados.length);
    
    metodosIntentados.forEach((metodo, index) => {
        console.log(   . );
    });
    
    if (redistribucionExitosa) {
        console.log('\\n ¡REDISTRIBUCIÓN COMPLETADA!');
        if (totalCambios > 0) {
            console.log(' Se detectaron cambios en las pools');
            console.log(' Los premios están listos para ser reclamados');
        } else {
            console.log(' No se detectaron cambios (distribución ya estaba correcta)');
        }
    } else {
        console.log('\\n NO SE PUDO REDISTRIBUIR');
        console.log(' Posibles razones:');
        console.log('   - La distribución ya estaba correcta');
        console.log('   - No tienes permisos de administrador');
        console.log('   - El contrato no permite redistribuciones');
    }
    
    console.log('='.repeat(60));
}

main().catch(console.error);
