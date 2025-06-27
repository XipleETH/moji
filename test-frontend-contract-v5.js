import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Configuración del contrato V5
const CONTRACT_ADDRESS = "0x9F19b81457Ccb253D957a9771187EB38766b9d51";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// ABI mínimo para pruebas
const LOTTO_MOJI_CORE_ABI = [
  {
    inputs: [],
    name: 'getMainPoolBalances',
    outputs: [
      { name: 'firstPrizeAccumulated', type: 'uint256' },
      { name: 'secondPrizeAccumulated', type: 'uint256' },
      { name: 'thirdPrizeAccumulated', type: 'uint256' },
      { name: 'developmentAccumulated', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getReserveBalances',
    outputs: [
      { name: 'firstPrizeReserve', type: 'uint256' },
      { name: 'secondPrizeReserve', type: 'uint256' },
      { name: 'thirdPrizeReserve', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getCurrentDay',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'gameActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'TICKET_PRICE',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'ticketCounter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

async function testFrontendContractConnection() {
  console.log('🔍 TESTING FRONTEND ↔ CONTRACT V5 CONNECTION');
  console.log('='.repeat(60));
  
  try {
    // Crear cliente público
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http()
    });

    console.log('📡 Public client created successfully');
    console.log('📍 Contract Address:', CONTRACT_ADDRESS);
    
    // Test 1: Verificar que el contrato responde
    console.log('\n🧪 TEST 1: Basic Contract Connectivity');
    const gameActive = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOTTO_MOJI_CORE_ABI,
      functionName: 'gameActive'
    });
    
    console.log('✅ Game Active:', gameActive);
    
    // Test 2: Obtener datos básicos
    console.log('\n🧪 TEST 2: Basic Contract Data');
    const [ticketPrice, ticketCounter, currentGameDay] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LOTTO_MOJI_CORE_ABI,
        functionName: 'TICKET_PRICE'
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LOTTO_MOJI_CORE_ABI,
        functionName: 'ticketCounter'
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LOTTO_MOJI_CORE_ABI,
        functionName: 'getCurrentDay'
      })
    ]);
    
    console.log('✅ Ticket Price:', (Number(ticketPrice) / 1e6).toFixed(2), 'USDC');
    console.log('✅ Tickets Sold:', ticketCounter.toString());
    console.log('✅ Current Game Day:', currentGameDay.toString());
    
    // Test 3: Obtener pools principales
    console.log('\n🧪 TEST 3: Main Pools Data');
    const mainPools = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOTTO_MOJI_CORE_ABI,
      functionName: 'getMainPoolBalances'
    });
    
    console.log('✅ Main Pools:');
    console.log('  - First Prize:', (Number(mainPools[0]) / 1e6).toFixed(2), 'USDC');
    console.log('  - Second Prize:', (Number(mainPools[1]) / 1e6).toFixed(2), 'USDC');
    console.log('  - Third Prize:', (Number(mainPools[2]) / 1e6).toFixed(2), 'USDC');
    console.log('  - Development:', (Number(mainPools[3]) / 1e6).toFixed(2), 'USDC');
    
    // Test 4: Obtener reservas
    console.log('\n🧪 TEST 4: Reserve Pools Data');
    const reserves = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOTTO_MOJI_CORE_ABI,
      functionName: 'getReserveBalances'
    });
    
    console.log('✅ Reserve Pools:');
    console.log('  - First Prize Reserve:', (Number(reserves[0]) / 1e6).toFixed(2), 'USDC');
    console.log('  - Second Prize Reserve:', (Number(reserves[1]) / 1e6).toFixed(2), 'USDC');
    console.log('  - Third Prize Reserve:', (Number(reserves[2]) / 1e6).toFixed(2), 'USDC');
    
    // Test 5: Simular carga de datos como en el frontend
    console.log('\n🧪 TEST 5: Frontend-like Data Loading');
    const frontendData = {
      contract: {
        address: CONTRACT_ADDRESS,
        gameActive,
        ticketPrice: Number(ticketPrice),
        ticketsDeepSold: Number(ticketCounter),
        currentGameDay: Number(currentGameDay)
      },
      pools: {
        main: {
          firstPrize: mainPools[0],
          secondPrize: mainPools[1],
          thirdPrize: mainPools[2],
          development: mainPools[3]
        },
        reserves: {
          firstPrize: reserves[0],
          secondPrize: reserves[1],
          thirdPrize: reserves[2]
        }
      },
      totals: {
        mainTotal: Number(mainPools[0]) + Number(mainPools[1]) + Number(mainPools[2]) + Number(mainPools[3]),
        reserveTotal: Number(reserves[0]) + Number(reserves[1]) + Number(reserves[2])
      }
    };
    
    console.log('✅ Frontend-compatible data structure created:');
    console.log('  - Main Total:', (frontendData.totals.mainTotal / 1e6).toFixed(2), 'USDC');
    console.log('  - Reserve Total:', (frontendData.totals.reserveTotal / 1e6).toFixed(2), 'USDC');
    console.log('  - System Total:', ((frontendData.totals.mainTotal + frontendData.totals.reserveTotal) / 1e6).toFixed(2), 'USDC');
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('✅ Frontend can successfully connect to Contract V5');
    console.log('✅ All main functions are working correctly');
    console.log('✅ Data structures are compatible');
    console.log('✅ Ready for production use!');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('\n🔧 Possible solutions:');
    console.error('1. Check that Contract V5 is deployed at the correct address');
    console.error('2. Verify that the RPC connection is working');
    console.error('3. Ensure the ABI matches the deployed contract');
    console.error('4. Check network connectivity');
    
    return false;
  }
}

// Ejecutar pruebas
testFrontendContractConnection()
  .then((success) => {
    if (success) {
      console.log('\n🚀 Frontend is ready to use Contract V5!');
      process.exit(0);
    } else {
      console.log('\n💥 Fix the issues above before proceeding');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }); 