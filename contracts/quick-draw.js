const { ethers } = require('hardhat');

async function main() {
    const contractAddress = '0x836AB58c7B98363b263581cDA17202ac50Cb63ed';
    console.log('🎲 FORZANDO SORTEO SIMPLE');
    console.log('='.repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log('👤 Cuenta:', signer.address);
    console.log('📍 Contrato:', contractAddress);
    
    // ABI mínimo para las funciones que necesitamos
    const abi = [
        'function setLastDrawTime(uint256 _timestamp) external',
        'function performUpkeep(bytes calldata performData) external'
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, signer);
    
    try {
        console.log('\n⏰ STEP 1: Ajustando timing...');
        
        // Calcular timestamp que permita sorteo inmediato (25 horas atrás)
        const currentTime = Math.floor(Date.now() / 1000);
        const newLastDrawTime = currentTime - (25 * 3600);
        
        console.log('🔧 Estableciendo lastDrawTime a:', new Date(newLastDrawTime * 1000).toUTCString());
        
        const timeTx = await contract.setLastDrawTime(newLastDrawTime, { 
            gasLimit: 200000,
            gasPrice: ethers.parseUnits('30', 'gwei')
        });
        
        console.log('📤 TX timing enviada:', timeTx.hash);
        console.log('⏳ Esperando confirmación...');
        
        const timeReceipt = await timeTx.wait();
        console.log('✅ Timing ajustado! Block:', timeReceipt.blockNumber);
        
        console.log('\n🎲 STEP 2: Ejecutando sorteo...');
        console.log('⏳ Esperando 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const drawTx = await contract.performUpkeep('0x01', { 
            gasLimit: 500000,
            gasPrice: ethers.parseUnits('30', 'gwei')
        });
        
        console.log('📤 TX sorteo enviada:', drawTx.hash);
        console.log('⏳ Esperando confirmación...');
        
        const drawReceipt = await drawTx.wait();
        console.log('✅ ¡SORTEO EJECUTADO! Block:', drawReceipt.blockNumber);
        console.log('⛽ Gas usado:', drawReceipt.gasUsed.toString());
        
        console.log('\n🎯 ¡ÉXITO TOTAL!');
        console.log('='.repeat(25));
        console.log('✅ Timing ajustado correctamente');
        console.log('✅ PerformUpkeep ejecutado');
        console.log('✅ VRF solicitado');
        console.log('⏳ Esperando callback (~2-5 min)');
        console.log('');
        console.log('🔗 Verificar transacciones:');
        console.log(`   Timing: https://testnet.snowtrace.io/tx/${timeTx.hash}`);
        console.log(`   Sorteo: https://testnet.snowtrace.io/tx/${drawTx.hash}`);
        console.log('');
        console.log('📋 Verificar contrato:');
        console.log(`   ${contractAddress}`);
        console.log(`   https://testnet.snowtrace.io/address/${contractAddress}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\n💡 Necesitas más AVAX para gas');
        } else if (error.message.includes('nonce')) {
            console.log('\n💡 Hay transacciones pendientes, espera un momento');
        } else if (error.message.includes('replacement')) {
            console.log('\n💡 Transacción reemplazada, puede haber funcionado');
        }
        
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
