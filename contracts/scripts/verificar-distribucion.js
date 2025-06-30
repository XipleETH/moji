const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61';

async function main() {
    console.log(' VERIFICACIÓN DE DISTRIBUCIÓN DÍA 20267');
    
    const [deployer] = await ethers.getSigners();
    const contract = await ethers.getContractAt('LottoMojiCore', CONTRACT_ADDRESS);
    
    console.log(' Ejecutando como:', deployer.address);
    
    // Verificar estado actual
    const info = await contract.getDailyPoolInfo(20267);
    console.log(' Sorteado:', info.drawn);
    console.log(' Distribuido:', info.distributed);
    console.log(' Total:', ethers.formatUnits(info.totalCollected, 6), 'USDC');
    
    if (info.distributed) {
        console.log(' El día ya está distribuido correctamente');
        console.log(' Puedes reclamar tus premios directamente');
        return;
    }
    
    // Intentar redistribución si no está distribuido
    try {
        console.log(' Intentando redistribución...');
        const tx = await contract.performUpkeep('0x');
        console.log(' Hash:', tx.hash);
        await tx.wait();
        console.log(' Redistribución exitosa');
    } catch (error) {
        console.log(' Error:', error.message);
    }
}

main().catch(console.error);
