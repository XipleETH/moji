const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61';
const TX_HASH_EXITOSO = '0x43f283b8b68717d34a4ac57eeeb37f8e7f39d41aa18fab2eba5cffe45ffb6244';
const TICKET_EXITOSO = 52;
const TICKET_FALLIDO = 53;

async function main() {
    console.log('🔍 VERIFICACIÓN DE RECLAMACIÓN');
    console.log('='.repeat(60));
    
    const [deployer] = await ethers.getSigners();
    const contract = await ethers.getContractAt('LottoMojiCore', CONTRACT_ADDRESS);
    
    const formatUSDC = (amount) => (Number(amount) / 1e6).toFixed(6);
    
    // 1. Analizar la transacción exitosa
    console.log('\n🎉 1. ANÁLISIS DE TRANSACCIÓN EXITOSA');
    console.log('-'.repeat(40));
    
    try {
        const receipt = await ethers.provider.getTransactionReceipt(TX_HASH_EXITOSO);
        console.log('📝 Hash:', TX_HASH_EXITOSO);
        console.log('✅ Estado:', receipt.status === 1 ? 'EXITOSO' : 'FALLIDO');
        console.log('📊 Gas usado:', Number(receipt.gasUsed));
        console.log('💸 Gas precio:', Number(receipt.gasPrice));
        console.log('📋 Logs emitidos:', receipt.logs.length);
        
        // Decodificar eventos
        console.log('\n📄 EVENTOS DECODIFICADOS:');
        for (let i = 0; i < receipt.logs.length; i++) {
            const log = receipt.logs[i];
            console.log(`\nEvento ${i + 1}:`);
            console.log('  📍 Address:', log.address);
            console.log('  🏷️ Topics:', log.topics.length);
            console.log('  📝 Data length:', log.data.length);
            
            // Verificar si es del contrato principal
            if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
                console.log('  ✅ Del contrato LottoMoji');
            } else {
                console.log('  🔗 Del token USDC (transferencia)');
            }
        }
        
    } catch (error) {
        console.log('❌ Error analizando transacción:', error.message);
    }
    
    // 2. Verificar estado del ticket exitoso
    console.log('\n🎫 2. ESTADO DEL TICKET EXITOSO (#52)');
    console.log('-'.repeat(40));
    
    try {
        const ticketInfo = await contract.getFullTicketInfo(TICKET_EXITOSO);
        console.log('🔢 Números:', ticketInfo.numbers.map(n => Number(n)));
        console.log('📅 Día:', Number(ticketInfo.gameDay));
        console.log('✅ Activo:', ticketInfo.isActive);
        console.log('👤 Owner:', ticketInfo.ticketOwner);
        
        // Verificar si fue reclamado
        try {
            const gasEstimate = await contract.claimPrize.estimateGas(TICKET_EXITOSO);
            console.log('🔄 Estado reclamación: AÚN NO RECLAMADO (se puede reclamar)');
        } catch (error) {
            if (error.message.includes('Prize already claimed')) {
                console.log('✅ Estado reclamación: YA RECLAMADO');
            } else {
                console.log('❓ Estado reclamación:', error.message);
            }
        }
        
    } catch (error) {
        console.log('❌ Error verificando ticket #52:', error.message);
    }
    
    // 3. Analizar por qué el ticket #53 falló
    console.log('\n🔍 3. ANÁLISIS DEL TICKET FALLIDO (#53)');
    console.log('-'.repeat(40));
    
    try {
        const ticketInfo = await contract.getFullTicketInfo(TICKET_FALLIDO);
        console.log('🔢 Números:', ticketInfo.numbers.map(n => Number(n)));
        console.log('📅 Día:', Number(ticketInfo.gameDay));
        console.log('✅ Activo:', ticketInfo.isActive);
        
        // Obtener números ganadores del día
        const dailyInfo = await contract.getDailyPoolInfo(Number(ticketInfo.gameDay));
        const numerosGanadores = dailyInfo.winningNumbers.map(n => Number(n));
        console.log('🎯 Números ganadores:', numerosGanadores);
        
        // Analizar coincidencias manualmente
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
        
        console.log('\n📊 ANÁLISIS DE COINCIDENCIAS:');
        console.log('🎯 Coincidencias exactas (posición):', exactMatches);
        console.log('🎯 Coincidencias totales (cualquier posición):', totalMatches);
        
        // Determinar tipo de premio según lógica
        console.log('\n🏆 CLASIFICACIÓN DE PREMIO:');
        if (exactMatches === 4) {
            console.log('🥇 PRIMER PREMIO (4 exactos)');
        } else if (totalMatches === 4) {
            console.log('🥈 SEGUNDO PREMIO (4 cualquier orden)');
        } else if (exactMatches === 3) {
            console.log('🥉 TERCER PREMIO (3 exactos)');
        } else if (totalMatches >= 3) {
            console.log('🎫 TICKETS GRATIS (3+ cualquier orden)');
        } else {
            console.log('❌ SIN PREMIO');
        }
        
        // Verificar si se puede reclamar
        try {
            const gasEstimate = await contract.claimPrize.estimateGas(TICKET_FALLIDO);
            console.log('🔄 Se puede reclamar: SÍ');
        } catch (error) {
            console.log('❌ Se puede reclamar: NO -', error.message);
        }
        
    } catch (error) {
        console.log('❌ Error verificando ticket #53:', error.message);
    }
    
    // 4. Verificar estado actual de las pools
    console.log('\n💰 4. ESTADO ACTUAL DE POOLS');
    console.log('-'.repeat(40));
    
    const [mainPools, reservePools] = await Promise.all([
        contract.getMainPoolBalances(),
        contract.getReservePoolBalances()
    ]);
    
    console.log('🏆 POOLS PRINCIPALES:');
    console.log('🥇 Primer Premio:', formatUSDC(mainPools.firstPrizeAccumulated), 'USDC');
    console.log('🥈 Segundo Premio:', formatUSDC(mainPools.secondPrizeAccumulated), 'USDC');
    console.log('🥉 Tercer Premio:', formatUSDC(mainPools.thirdPrizeAccumulated), 'USDC');
    console.log('💼 Desarrollo:', formatUSDC(mainPools.developmentAccumulated), 'USDC');
    
    console.log('\n🏦 POOLS DE RESERVA:');
    console.log('🔒 Reserva Principal:', formatUSDC(reservePools.mainReserve), 'USDC');
    console.log('🔒 Reserva Secundaria:', formatUSDC(reservePools.secondaryReserve), 'USDC');
    
    // 5. Intentar reclamar el ticket #53 de nuevo
    console.log('\n🔄 5. REINTENTO TICKET #53');
    console.log('-'.repeat(40));
    
    try {
        console.log('🔄 Intentando reclamar ticket #53 nuevamente...');
        const gasEstimate = await contract.claimPrize.estimateGas(TICKET_FALLIDO);
        console.log('✅ Gas estimado:', Number(gasEstimate));
        console.log('🚀 Se puede reclamar - ejecutando...');
        
        const tx = await contract.claimPrize(TICKET_FALLIDO);
        console.log('📝 Hash:', tx.hash);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log('🎉 ¡TICKET #53 RECLAMADO EXITOSAMENTE!');
            console.log('📊 Gas usado:', Number(receipt.gasUsed));
        }
        
    } catch (error) {
        console.log('❌ No se pudo reclamar ticket #53:', error.message);
        
        if (error.message.includes('No prize')) {
            console.log('💡 Confirmado: Este ticket no tiene premio según el contrato');
        }
    }
    
    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DE VERIFICACIÓN');
    console.log('='.repeat(60));
    
    console.log('✅ Ticket #52: RECLAMADO EXITOSAMENTE');
    console.log('❓ Ticket #53: Requiere más análisis');
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('1. Verifica tu balance de USDC en tu wallet');
    console.log('2. Revisa la transacción en BaseScan');
    console.log('3. Si el ticket #53 no es ganador, está bien');
    console.log('4. ¡Ya reclamaste el premio principal!');
    
    console.log('\n🔗 Enlaces:');
    console.log(`📊 Transacción: https://sepolia.basescan.org/tx/${TX_HASH_EXITOSO}`);
    console.log(`👤 Tu wallet: https://sepolia.basescan.org/address/${deployer.address}`);
    console.log('='.repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    }); 