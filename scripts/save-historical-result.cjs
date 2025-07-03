const { ethers } = require('ethers');
const admin = require('firebase-admin');

// Configurar Firebase Admin
// En desarrollo, usar el proyecto por defecto (debes estar autenticado con gcloud o tener GOOGLE_APPLICATION_CREDENTIALS)
admin.initializeApp({
  projectId: "lottomojifun"
});

const db = admin.firestore();

// Datos del resultado histórico conocido
const HISTORICAL_TRANSACTION = '0x92079d0fda897521ce41ad2ca2bb8dc5c9a35f3bfababe5b07c0d2abb3a469eb';
const CONTRACT_ADDRESS = '0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008';
const GAME_CONFIG = {
  EMOJI_MAP: ['🎮', '🎯', '⚽', '🎸', '🎲', '🃏', '🎭', '🎨', '🎪', '🎳', '🎿', '🎺', '🎼', '🎧', '🎤', '🎬', '🏆', '🏀', '🏈', '🎾', '⚾', '🏓', '🏸', '🥊', '🏹', '🎣', '🎯', '🎪', '🎭', '🎨', '🎼', '🎹', '🎷', '🎺', '🥁', '🎻', '🎸', '🎤', '🎧', '🎬', '🎮', '🎲', '🎳', '🃏', '🎰', '🎯', '🏆', '🥇', '🏅', '🏆']
};

async function saveHistoricalResult() {
  try {
    console.log('🔍 Fetching historical transaction:', HISTORICAL_TRANSACTION);
    
    // Configurar provider para Avalanche Fuji
    const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
    
    // Obtener la transacción y el recibo
    const [transaction, receipt] = await Promise.all([
      provider.getTransaction(HISTORICAL_TRANSACTION),
      provider.getTransactionReceipt(HISTORICAL_TRANSACTION)
    ]);
    
    if (!transaction || !receipt) {
      throw new Error('Transaction not found');
    }
    
    console.log('📦 Transaction found at block:', receipt.blockNumber);
    
    // ABI para el evento DrawNumbers
    const drawNumbersInterface = new ethers.Interface([
      "event DrawNumbers(uint24 indexed day, uint8[4] numbers)"
    ]);
    
    // Buscar el evento DrawNumbers en los logs
    let drawEvent = null;
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
          const parsed = drawNumbersInterface.parseLog(log);
          if (parsed && parsed.name === 'DrawNumbers') {
            drawEvent = parsed;
            break;
          }
        }
      } catch (error) {
        // Log no es un DrawNumbers event, continuar
      }
    }
    
    if (!drawEvent) {
      throw new Error('DrawNumbers event not found in transaction');
    }
    
    const gameDay = drawEvent.args.day.toString();
    const winningNumbers = drawEvent.args.numbers.map(num => Number(num));
    const winningEmojis = winningNumbers.map(index => GAME_CONFIG.EMOJI_MAP[index] || '❓');
    
    console.log('🎯 Draw event found:');
    console.log('   Game Day:', gameDay);
    console.log('   Winning Numbers:', winningNumbers);
    console.log('   Winning Emojis:', winningEmojis);
    
    // Obtener timestamp del bloque
    const block = await provider.getBlock(receipt.blockNumber);
    const drawTime = block ? block.timestamp : Math.floor(Date.now() / 1000);
    
    // Crear documento para Firestore
    const firestoreResult = {
      gameDay,
      winningNumbers,
      winningEmojis,
      blockNumber: receipt.blockNumber,
      transactionHash: HISTORICAL_TRANSACTION,
      drawTime,
      network: 'avalanche-fuji',
      contractAddress: CONTRACT_ADDRESS,
      processed: true,
      createdAt: Date.now()
    };
    
    console.log('💾 Saving to Firestore...');
    
    // Verificar si ya existe
    const docId = `avalanche-fuji_${gameDay}`;
    const docRef = db.collection('drawResults').doc(docId);
    const existingDoc = await docRef.get();
    
    if (existingDoc.exists) {
      console.log('📋 Document already exists, updating...');
      await docRef.update(firestoreResult);
      console.log('✅ Historical result updated in Firestore successfully!');
    } else {
      console.log('📄 Creating new document...');
      await docRef.set(firestoreResult);
      console.log('✅ Historical result saved to Firestore successfully!');
    }
    
    console.log('📄 Document ID:', docId);
    console.log('🎮 Winning Emojis:', winningEmojis.join(' '));
    
    return firestoreResult;
    
  } catch (error) {
    console.error('❌ Error saving historical result:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  saveHistoricalResult()
    .then(() => {
      console.log('🎉 Script completed successfully');
      console.log('🔄 The frontend should now show the historical winning numbers!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      console.log('💡 Make sure you have Firebase authentication set up');
      console.log('   Run: gcloud auth application-default login');
      process.exit(1);
    });
}

module.exports = { saveHistoricalResult }; 