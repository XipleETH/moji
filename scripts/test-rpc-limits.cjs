const { ethers } = require('ethers');

// Configuraciones de redes
const NETWORKS = {
  'avalanche-fuji': {
    name: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    contracts: [
      '0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008', // V4 actual
      '0x19d6c7dc1301860C4E14c72E4338B62113059471', // V4 anterior
    ],
    explorer: 'https://testnet.snowtrace.io'
  },
  'base-sepolia': {
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    backupRpcUrls: [
      'https://base-sepolia.g.alchemy.com/v2/demo',
      'https://base-sepolia-rpc.publicnode.com'
    ],
    contracts: [
      '0xDAf05A87D1C2Dd6d00f6b9fd9Af4A80d818D1e61', // V6
      '0x9F19b81457Ccb253D957a9771187EB38766b9d51', // V5
    ],
    explorer: 'https://sepolia.basescan.org'
  }
};

// ABI para el evento DrawNumbers
const DRAW_NUMBERS_ABI = [
  "event DrawNumbers(uint24 indexed day, uint8[4] numbers)"
];

async function testRpcLimits(networkKey) {
  const network = NETWORKS[networkKey];
  console.log(`\n🔍 Testing RPC limits for ${network.name}`);
  console.log(`📡 RPC URL: ${network.rpcUrl}`);
  
  try {
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    
    // Obtener el bloque más reciente
    const latestBlock = await provider.getBlockNumber();
    console.log(`📦 Latest block: ${latestBlock}`);
    
    // Probar diferentes rangos de bloques
    const testRanges = [
      { range: 100, label: '100 blocks' },
      { range: 500, label: '500 blocks' },
      { range: 1000, label: '1K blocks' },
      { range: 2000, label: '2K blocks' },
      { range: 5000, label: '5K blocks' },
      { range: 10000, label: '10K blocks' },
      { range: 20000, label: '20K blocks' },
      { range: 50000, label: '50K blocks' }
    ];
    
    const results = [];
    
    for (const testRange of testRanges) {
      const fromBlock = Math.max(0, latestBlock - testRange.range);
      const toBlock = latestBlock;
      
      console.log(`\n📊 Testing ${testRange.label} (blocks ${fromBlock} to ${toBlock})`);
      
      let success = false;
      let error = null;
      let eventCount = 0;
      let responseTime = 0;
      
      // Probar con cada contrato
      for (const contractAddress of network.contracts) {
        try {
          const startTime = Date.now();
          
          const contract = new ethers.Contract(contractAddress, DRAW_NUMBERS_ABI, provider);
          const events = await contract.queryFilter(
            contract.filters.DrawNumbers(),
            fromBlock,
            toBlock
          );
          
          responseTime = Date.now() - startTime;
          eventCount = events.length;
          success = true;
          
          console.log(`   ✅ Contract ${contractAddress.slice(0, 10)}... - ${eventCount} events in ${responseTime}ms`);
          
          if (events.length > 0) {
            const latestEvent = events[events.length - 1];
            console.log(`   🎯 Latest event: Game Day ${latestEvent.args.day}, Numbers: [${latestEvent.args.numbers.join(', ')}]`);
          }
          
          break; // Si funciona con un contrato, no necesitamos probar más
          
        } catch (contractError) {
          console.log(`   ⚠️ Contract ${contractAddress.slice(0, 10)}... failed: ${contractError.message}`);
          error = contractError.message;
        }
      }
      
      if (!success) {
        console.log(`   ❌ ${testRange.label} FAILED: ${error}`);
        break; // Si falla este rango, probablemente fallen los más grandes
      }
      
      results.push({
        range: testRange.range,
        label: testRange.label,
        success,
        eventCount,
        responseTime,
        error
      });
      
      // Pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Resumen de resultados
    console.log(`\n📋 Summary for ${network.name}:`);
    const maxWorkingRange = results.filter(r => r.success).pop();
    if (maxWorkingRange) {
      console.log(`✅ Maximum working range: ${maxWorkingRange.label} (${maxWorkingRange.eventCount} events in ${maxWorkingRange.responseTime}ms)`);
    } else {
      console.log(`❌ No ranges worked`);
    }
    
    return results;
    
  } catch (error) {
    console.error(`❌ Error testing ${network.name}:`, error.message);
    return [];
  }
}

async function testBackupRpcUrls(networkKey) {
  const network = NETWORKS[networkKey];
  if (!network.backupRpcUrls) return;
  
  console.log(`\n🔄 Testing backup RPC URLs for ${network.name}`);
  
  for (const rpcUrl of network.backupRpcUrls) {
    try {
      console.log(`📡 Testing: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      const latestBlock = await provider.getBlockNumber();
      console.log(`   ✅ Latest block: ${latestBlock}`);
      
      // Probar una consulta pequeña
      if (network.contracts.length > 0) {
        const contract = new ethers.Contract(network.contracts[0], DRAW_NUMBERS_ABI, provider);
        const fromBlock = Math.max(0, latestBlock - 100);
        
        const startTime = Date.now();
        const events = await contract.queryFilter(
          contract.filters.DrawNumbers(),
          fromBlock,
          latestBlock
        );
        const responseTime = Date.now() - startTime;
        
        console.log(`   📊 100 blocks query: ${events.length} events in ${responseTime}ms`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
}

async function compareNetworks() {
  console.log('🌐 Testing RPC Limits on Different Networks');
  console.log('=' .repeat(60));
  
  const allResults = {};
  
  // Probar cada red
  for (const [networkKey, network] of Object.entries(NETWORKS)) {
    allResults[networkKey] = await testRpcLimits(networkKey);
    
    // Probar RPC alternativos si existen
    await testBackupRpcUrls(networkKey);
    
    // Pausa entre redes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Comparación final
  console.log('\n🏆 FINAL COMPARISON');
  console.log('=' .repeat(60));
  
  for (const [networkKey, results] of Object.entries(allResults)) {
    const network = NETWORKS[networkKey];
    const maxRange = results.filter(r => r.success).pop();
    
    if (maxRange) {
      console.log(`${network.name}: Up to ${maxRange.label} (${maxRange.eventCount} events)`);
    } else {
      console.log(`${network.name}: ❌ No working ranges`);
    }
  }
  
  // Recomendación
  console.log('\n💡 RECOMMENDATION:');
  const bestNetwork = Object.entries(allResults).reduce((best, [key, results]) => {
    const maxRange = results.filter(r => r.success).pop();
    if (!maxRange) return best;
    
    if (!best.maxRange || maxRange.range > best.maxRange.range) {
      return { network: key, maxRange };
    }
    return best;
  }, { network: null, maxRange: null });
  
  if (bestNetwork.network) {
    const network = NETWORKS[bestNetwork.network];
    console.log(`🎯 Use ${network.name} for historical queries`);
    console.log(`   Maximum range: ${bestNetwork.maxRange.label}`);
    console.log(`   RPC URL: ${network.rpcUrl}`);
  } else {
    console.log('❌ No network worked well for historical queries');
    console.log('💡 Consider using Firestore for persistent storage');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  compareNetworks()
    .then(() => {
      console.log('\n🎉 RPC limits testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testRpcLimits, compareNetworks }; 