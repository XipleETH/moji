/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * Funciones de Firebase para LottoMojiFun
 * 
 * Estas funciones se ejecutan en el servidor de Firebase y centralizan
 * la lógica de generación de resultados del juego.
 * 
 * ACTUALIZADO: Sistema de sorteo diario con tickets válidos por 24 horas
 */

// Inicializar la app de Firebase Admin
initializeApp();

// Obtener una referencia a Firestore
const db = getFirestore();

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'player_tickets';
const GAME_RESULTS_COLLECTION = 'game_results';
const DRAW_TIME_HOUR = 20; // Sorteo a las 8:00 PM
const COOLDOWN_MINUTES = 30; // 30 minutos antes del sorteo sin poder comprar tickets

// Función para generar emojis aleatorios
const generateRandomEmojis = (count) => {
  const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                  '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                  '🎁', '🎮', '🚀', '🌍', '🍀'];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * EMOJIS.length);
    result.push(EMOJIS[randomIndex]);
  }
  return result;
};

// Función para obtener la fecha del día (YYYY-MM-DD)
const getDateKey = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Función para calcular el próximo sorteo
const getNextDrawTime = () => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(DRAW_TIME_HOUR, 0, 0, 0);
  
  // Si ya pasó la hora del sorteo de hoy, programar para mañana
  if (now > today) {
    today.setDate(today.getDate() + 1);
  }
  
  return today;
};

// Función para verificar si estamos en período de cooldown
const isInCooldownPeriod = () => {
  const now = new Date();
  const nextDraw = getNextDrawTime();
  const cooldownStart = new Date(nextDraw.getTime() - (COOLDOWN_MINUTES * 60 * 1000));
  
  return now >= cooldownStart && now < nextDraw;
};

// Función para verificar si un ticket es ganador con los nuevos criterios
const checkWin = (ticketNumbers, winningNumbers) => {
  if (!ticketNumbers || !winningNumbers) return { 
    firstPrize: false, 
    secondPrize: false, 
    thirdPrize: false,
    freePrize: false 
  };
  
  // Verificar coincidencias exactas (mismo emoji en la misma posición)
  let exactMatches = 0;
  for (let i = 0; i < ticketNumbers.length; i++) {
    if (i < winningNumbers.length && ticketNumbers[i] === winningNumbers[i]) {
      exactMatches++;
    }
  }
  
  // Para el segundo premio (ahora) y ticket gratis, necesitamos contar correctamente
  // cuántos emojis del ticket coinciden con los del resultado ganador
  
  // Crear copias para no modificar los originales
  const ticketCopy = [...ticketNumbers];
  const winningCopy = [...winningNumbers];
  
  // Contar emojis que coinciden, teniendo en cuenta repeticiones
  let matchCount = 0;
  for (let i = 0; i < winningCopy.length; i++) {
    const index = ticketCopy.indexOf(winningCopy[i]);
    if (index !== -1) {
      matchCount++;
      // Eliminar el emoji ya contado para no contar repetidos
      ticketCopy.splice(index, 1);
    }
  }
  
  return {
    // 4 aciertos en el mismo orden (premio mayor)
    firstPrize: exactMatches === 4,
    
    // 4 aciertos en cualquier orden (ahora segundo premio)
    secondPrize: matchCount === 4 && exactMatches !== 4,
    
    // 3 aciertos en orden exacto (ahora tercer premio)
    thirdPrize: exactMatches === 3,
    
    // 3 aciertos en cualquier orden (cuarto premio - ticket gratis)
    freePrize: matchCount === 3 && exactMatches !== 3
  };
};

// Función compartida para procesar el sorteo diario
const processDailyGameDraw = async () => {
  const now = new Date();
  const dateKey = getDateKey(now);
  const drawControlRef = db.collection('draw_control').doc(dateKey);
  const processId = Date.now().toString();
  
  try {
    logger.info(`[${processId}] Procesando sorteo diario para el día ${dateKey}...`);
    
    // 1. Verificar si ya existe un resultado para este día
    const existingResultQuery = db.collection(GAME_RESULTS_COLLECTION)
      .where('dateKey', '==', dateKey)
      .limit(1);
    
    const existingResult = await existingResultQuery.get();
    
    if (!existingResult.empty) {
      const existingDoc = existingResult.docs[0];
      logger.info(`[${processId}] Ya existe un resultado para el día ${dateKey} con ID: ${existingDoc.id}`);
      return { success: true, alreadyProcessed: true, resultId: existingDoc.id };
    }
    
    // 2. Usar transacción para evitar condiciones de carrera
    const result = await db.runTransaction(async (transaction) => {
      const drawControlDoc = await transaction.get(drawControlRef);
      
      if (drawControlDoc.exists) {
        const data = drawControlDoc.data();
        
        if (data.completed) {
          logger.info(`[${processId}] Ya se procesó un sorteo para el día ${dateKey} con ID: ${data.resultId}`);
          return { success: true, alreadyProcessed: true, resultId: data.resultId };
        }
        
        if (data.inProgress) {
          const startTime = data.startedAt ? new Date(data.startedAt).getTime() : 0;
          const elapsed = Date.now() - startTime;
          
          if (elapsed < 120000) { // menos de 2 minutos
            logger.info(`[${processId}] Sorteo para el día ${dateKey} en proceso, esperando...`);
            return { success: false, inProgress: true };
          } else {
            logger.warn(`[${processId}] Sorteo para el día ${dateKey} no completado después de 2min, reiniciando...`);
          }
        }
      }
      
      // Marcar este día como en proceso
      transaction.set(drawControlRef, {
        timestamp: FieldValue.serverTimestamp(),
        inProgress: true,
        startedAt: now.toISOString(),
        processId: processId,
        dateKey: dateKey
      });
      
      return { success: true, alreadyProcessed: false };
    });
    
    if (result.alreadyProcessed) {
      return result;
    }
    
    if (!result.success) {
      logger.info(`[${processId}] Sorteo ya está siendo procesado por otra instancia, abortando...`);
      return { success: false };
    }
    
    // 3. Generar números ganadores
    const winningNumbers = generateRandomEmojis(4);
    logger.info(`[${processId}] Números ganadores generados:`, winningNumbers);
    
    // 4. Calcular próximo sorteo (mañana a la misma hora)
    const nextDraw = getNextDrawTime();
    
    // 5. Actualizar estado del juego
    await db.collection('game_state').doc(GAME_STATE_DOC).set({
      winningNumbers,
      nextDrawTime: Timestamp.fromDate(nextDraw),
      lastUpdated: FieldValue.serverTimestamp(),
      lastProcessId: processId,
      dateKey: dateKey,
      cooldownActive: false // Resetear cooldown después del sorteo
    });
    
    // 6. Obtener tickets válidos para este día (solo los del día actual)
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    
    const ticketsSnapshot = await db.collection(TICKETS_COLLECTION)
      .where('timestamp', '>=', dayStart)
      .where('timestamp', '<=', dayEnd)
      .get();
    
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.info(`[${processId}] Procesando ${tickets.length} tickets válidos para el día ${dateKey}`);
    
    // 7. Comprobar ganadores
    const results = {
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: []
    };
    
    tickets.forEach(ticket => {
      if (!ticket?.numbers) return;
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      if (winStatus.firstPrize) results.firstPrize.push(ticket);
      else if (winStatus.secondPrize) results.secondPrize.push(ticket);
      else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
      else if (winStatus.freePrize) results.freePrize.push(ticket);
    });
    
    logger.info(`[${processId}] Resultados del día ${dateKey}:`, {
      firstPrize: results.firstPrize.length,
      secondPrize: results.secondPrize.length,
      thirdPrize: results.thirdPrize.length,
      freePrize: results.freePrize.length,
      totalTickets: tickets.length
    });
    
    // 8. Guardar resultado
    const gameResultId = `daily-${dateKey}-${Date.now()}`;
    
    const serializableResult = {
      id: gameResultId,
      timestamp: FieldValue.serverTimestamp(),
      dateTime: new Date().toISOString(),
      dateKey: dateKey,
      winningNumbers,
      processId: processId,
      totalTickets: tickets.length,
      drawType: 'daily',
      firstPrize: results.firstPrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || null
      })),
      secondPrize: results.secondPrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || null
      })),
      thirdPrize: results.thirdPrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || null
      })),
      freePrize: results.freePrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || null
      }))
    };
    
    await db.collection(GAME_RESULTS_COLLECTION).doc(gameResultId).set(serializableResult);
    
    // 9. Actualizar el control de sorteos como completado
    await drawControlRef.set({
      timestamp: FieldValue.serverTimestamp(),
      inProgress: false,
      completed: true,
      resultId: gameResultId,
      processId: processId,
      completedAt: new Date().toISOString(),
      dateKey: dateKey
    });
    
    logger.info(`[${processId}] Sorteo diario procesado con éxito para ${dateKey} con ID: ${gameResultId}`);
    
    return { success: true, resultId: gameResultId, dateKey: dateKey };
  } catch (error) {
    logger.error(`[${processId}] Error procesando el sorteo diario:`, error);
    
    try {
      await drawControlRef.set({
        timestamp: FieldValue.serverTimestamp(),
        inProgress: false,
        completed: false,
        processId: processId,
        error: error.message,
        errorAt: new Date().toISOString(),
        dateKey: dateKey
      }, { merge: true });
    } catch (updateError) {
      logger.error(`[${processId}] Error actualizando documento de control tras fallo:`, updateError);
    }
    
    return { success: false, error: error.message };
  }
};

// Función programada que se ejecuta diariamente a las 8:00 PM
exports.scheduledDailyGameDraw = onSchedule({
  schedule: "0 20 * * *", // Todos los días a las 8:00 PM
  timeZone: "America/Mexico_City",
  retryConfig: {
    maxRetryAttempts: 2,
    minBackoffSeconds: 60
  },
  maxInstances: 1
}, async (event) => {
  const instanceId = Date.now().toString();
  const now = new Date();
  const dateKey = getDateKey(now);
  
  logger.info(`[${instanceId}] Ejecutando sorteo diario programado para ${dateKey}: ${event.jobName}`);
  
  const lockRef = db.collection('scheduler_locks').doc(`daily-${dateKey}`);
  
  try {
    // Intentar adquirir el bloqueo
    const lockResult = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      
      if (lockDoc.exists) {
        logger.info(`[${instanceId}] Ya hay una instancia procesando el sorteo diario para ${dateKey}`);
        return false;
      }
      
      transaction.set(lockRef, {
        timestamp: FieldValue.serverTimestamp(),
        jobName: event.jobName,
        instanceId: instanceId,
        startedAt: now.toISOString(),
        dateKey: dateKey
      });
      
      return true;
    });
    
    if (!lockResult) {
      logger.info(`[${instanceId}] Abortando ejecución duplicada del sorteo diario`);
      return;
    }
    
    logger.info(`[${instanceId}] Bloqueo adquirido, procediendo con el sorteo diario`);
    
    // Ejecutar el sorteo
    const result = await processDailyGameDraw();
    
    // Actualizar el bloqueo como completado
    await lockRef.update({
      completed: true,
      completedAt: new Date().toISOString(),
      resultId: result.resultId || null,
      success: result.success || false
    });
    
    logger.info(`[${instanceId}] Sorteo diario finalizado con éxito: ${result.success}`);
  } catch (error) {
    logger.error(`[${instanceId}] Error en scheduledDailyGameDraw:`, error);
    
    try {
      await lockRef.update({
        error: error.message,
        errorAt: new Date().toISOString(),
        completed: false
      });
    } catch (updateError) {
      logger.error(`[${instanceId}] Error actualizando bloqueo tras fallo:`, updateError);
    }
  }
});

// Función Cloud que puede ser invocada manualmente (para pruebas o sorteos forzados)
exports.triggerDailyGameDraw = onCall({ maxInstances: 1 }, async (request) => {
  logger.info("Solicitud manual de sorteo diario recibida");
  return await processDailyGameDraw();
});

// Función para verificar el estado del cooldown
exports.checkCooldownStatus = onCall({}, async (request) => {
  const now = new Date();
  const isInCooldown = isInCooldownPeriod();
  const nextDraw = getNextDrawTime();
  
  return {
    isInCooldown,
    nextDrawTime: nextDraw.toISOString(),
    currentTime: now.toISOString(),
    cooldownMinutes: COOLDOWN_MINUTES
  };
});
