const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Leer el project ID desde .firebaserc
function getProjectId() {
  try {
    const firebaserc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.firebaserc'), 'utf8'));
    return firebaserc.projects.default;
  } catch (error) {
    console.error('Error leyendo .firebaserc:', error);
    return null;
  }
}

// Configura el timezone para México
process.env.TZ = 'America/Mexico_City';

const DRAW_TIME_HOUR = 20; // 8:00 PM

// Función para obtener la próxima hora de sorteo (8:00 PM México)
function getNextDrawTime() {
  const now = new Date();
  const mexicoTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
  
  // Crear fecha de sorteo para hoy a las 8 PM México
  const todayDraw = new Date(mexicoTime);
  todayDraw.setHours(DRAW_TIME_HOUR, 0, 0, 0);
  
  // Si ya pasó el sorteo de hoy, programar para mañana
  if (mexicoTime >= todayDraw) {
    todayDraw.setDate(todayDraw.getDate() + 1);
  }
  
  return todayDraw;
}

// Función para obtener clave del día
function getDateKey(date = new Date()) {
  const mexicoTime = new Date(date.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
  return mexicoTime.toISOString().split('T')[0]; // YYYY-MM-DD
}

async function initializeGameState() {
  try {
    const projectId = getProjectId();
    if (!projectId) {
      throw new Error('No se pudo obtener el Project ID desde .firebaserc');
    }
    
    console.log('Project ID:', projectId);
    
    // Inicializar Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: projectId
      });
    }
    
    const db = admin.firestore();
    const nextDrawTime = getNextDrawTime();
    const currentDateKey = getDateKey();
    
    console.log('Inicializando estado del juego...');
    console.log('Próximo sorteo:', nextDrawTime.toLocaleString('es-MX', {timeZone: 'America/Mexico_City'}));
    console.log('Fecha clave:', currentDateKey);
    
    // Crear el documento de estado del juego
    const gameStateRef = db.collection('game_state').doc('current');
    
    const gameStateData = {
      winningNumbers: [],
      nextDrawTime: admin.firestore.Timestamp.fromDate(nextDrawTime),
      lastUpdated: admin.firestore.Timestamp.now(),
      dateKey: currentDateKey,
      cooldownActive: false,
      lastProcessId: null
    };
    
    await gameStateRef.set(gameStateData, { merge: true });
    
    console.log('✅ Estado del juego inicializado correctamente');
    console.log('Datos:', gameStateData);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando estado del juego:', error);
    process.exit(1);
  }
}

// Ejecutar script
initializeGameState(); 