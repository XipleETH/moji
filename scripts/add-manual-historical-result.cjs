const admin = require('firebase-admin');

// Configurar Firebase Admin
admin.initializeApp({
  projectId: "lottomojifun"
});

const db = admin.firestore();

// Datos del resultado histórico conocido (extraídos previamente)
const HISTORICAL_RESULT = {
  gameDay: "22",
  winningNumbers: [39, 24, 23, 0],
  winningEmojis: ["🎧", "🥊", "🏸", "🎮"],
  blockNumber: 35970616,
  transactionHash: "0x92079d0fda897521ce41ad2ca2bb8dc5c9a35f3bfababe5b07c0d2abb3a469eb",
  drawTime: 1735734000, // Timestamp aproximado de cuando ocurrió el sorteo
  network: "avalanche-fuji",
  contractAddress: "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008",
  processed: true,
  createdAt: Date.now()
};

async function addHistoricalResult() {
  try {
    console.log('💾 Adding historical result to Firestore...');
    
    // ID del documento
    const docId = `${HISTORICAL_RESULT.network}_${HISTORICAL_RESULT.gameDay}`;
    const docRef = db.collection('drawResults').doc(docId);
    
    // Verificar si ya existe
    const existingDoc = await docRef.get();
    
    if (existingDoc.exists) {
      console.log('📋 Document already exists, updating...');
      await docRef.update(HISTORICAL_RESULT);
      console.log('✅ Historical result updated in Firestore successfully!');
    } else {
      console.log('📄 Creating new document...');
      await docRef.set(HISTORICAL_RESULT);
      console.log('✅ Historical result saved to Firestore successfully!');
    }
    
    console.log('📄 Document ID:', docId);
    console.log('🎯 Game Day:', HISTORICAL_RESULT.gameDay);
    console.log('🎮 Winning Emojis:', HISTORICAL_RESULT.winningEmojis.join(' '));
    console.log('🔢 Winning Numbers:', HISTORICAL_RESULT.winningNumbers.join(', '));
    console.log('🔗 Transaction Hash:', HISTORICAL_RESULT.transactionHash);
    
    return HISTORICAL_RESULT;
    
  } catch (error) {
    console.error('❌ Error adding historical result:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addHistoricalResult()
    .then(() => {
      console.log('🎉 Script completed successfully');
      console.log('🔄 The frontend should now show the historical winning numbers!');
      console.log('🌐 Check your app to see: 🎧 🥊 🏸 🎮');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      console.log('💡 Make sure you have Firebase authentication set up');
      console.log('   Run: gcloud auth application-default login');
      process.exit(1);
    });
}

module.exports = { addHistoricalResult }; 