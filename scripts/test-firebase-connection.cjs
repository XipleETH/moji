// Test simple de conexión a Firebase usando SDK del cliente
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

// Configuración de Firebase (las mismas variables que usa el frontend)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDnkkoNNs8-3mBfgO6TWPfM6Y8mFDdTggg",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "lottomojifun.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "lottomojifun",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "lottomojifun.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "948545618522",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:948545618522:web:f3bf0f48bc06a7095b3031",
  measurementId: process.env.VITE_MEASURAMENT_ID || "G-L76T8WHQB7"
};

async function testFirebaseConnection() {
  try {
    console.log('🔄 Testing Firebase connection...');
    console.log('📁 Project ID:', firebaseConfig.projectId);
    
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase initialized successfully');
    
    // Probar escritura en Firestore
    const testDoc = doc(db, 'test', 'connection-test');
    const testData = {
      timestamp: Date.now(),
      message: 'Test from Node.js script',
      success: true
    };
    
    console.log('🔄 Testing Firestore write...');
    await setDoc(testDoc, testData);
    console.log('✅ Firestore write successful');
    
    // Probar lectura
    console.log('🔄 Testing Firestore read...');
    const docSnap = await getDoc(testDoc);
    
    if (docSnap.exists()) {
      console.log('✅ Firestore read successful');
      console.log('📄 Data:', docSnap.data());
    } else {
      console.log('❌ Document not found after write');
    }
    
    // Ahora vamos a probar agregar el resultado histórico
    console.log('\n🎯 Testing historical result addition...');
    
    const historicalResult = {
      gameDay: "22",
      winningNumbers: [39, 24, 23, 0],
      winningEmojis: ["🎧", "🥊", "🏸", "🎮"],
      blockNumber: 35970616,
      transactionHash: "0x92079d0fda897521ce41ad2ca2bb8dc5c9a35f3bfababe5b07c0d2abb3a469eb",
      drawTime: 1735734000,
      network: "avalanche-fuji",
      contractAddress: "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008",
      processed: true,
      createdAt: Date.now()
    };
    
    const docId = `${historicalResult.network}_${historicalResult.gameDay}`;
    const historicalDoc = doc(db, 'drawResults', docId);
    
    // Verificar si ya existe
    const existingDoc = await getDoc(historicalDoc);
    
    if (existingDoc.exists()) {
      console.log('📋 Historical result already exists in Firestore');
      console.log('🎮 Existing data:', existingDoc.data());
    } else {
      console.log('💾 Adding historical result to Firestore...');
      await setDoc(historicalDoc, historicalResult);
      console.log('✅ Historical result added successfully!');
      console.log('📄 Document ID:', docId);
      console.log('🎮 Winning Emojis:', historicalResult.winningEmojis.join(' '));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    console.error('💡 Error details:', error.message);
    
    if (error.code) {
      console.error('🏷️ Error code:', error.code);
    }
    
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testFirebaseConnection()
    .then((success) => {
      if (success) {
        console.log('\n🎉 Firebase connection test completed successfully!');
        console.log('🔄 The frontend should now show historical winning numbers!');
        console.log('🌐 Check your browser to see: 🎧 🥊 🏸 🎮');
      } else {
        console.log('\n💥 Firebase connection test failed');
        console.log('💡 You may need to run: gcloud auth application-default login');
      }
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testFirebaseConnection }; 