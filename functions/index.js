/**
 * Cloud Functions para LottoMojiFun
 * Sistema de lotería con tokens diarios y premios automáticos
 */

const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

// Inicializar la app de Firebase Admin
initializeApp();

// Obtener una referencia a Firestore
const db = getFirestore();

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'player_tickets';
const GAME_RESULTS_COLLECTION = 'game_results';
const DAILY_TOKENS_COLLECTION = 'daily_tokens';
const PRIZE_TRANSACTIONS_COLLECTION = 'prize_transactions';
const DRAW_INTERVAL_MS = 86400000; // 24 horas
const INITIAL_DAILY_TOKENS = 10;

// Función para obtener la fecha del día actual en formato YYYY-MM-DD
const getCurrentGameDay = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

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

// Función para verificar si un ticket es ganador
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
  
  // Contar emojis que coinciden en cualquier posición
  const ticketCopy = [...ticketNumbers];
  const winningCopy = [...winningNumbers];
  
  let matchCount = 0;
  for (let i = 0; i < winningCopy.length; i++) {
    const index = ticketCopy.indexOf(winningCopy[i]);
    if (index !== -1) {
      matchCount++;
      ticketCopy.splice(index, 1);
    }
  }
  
  return {
    firstPrize: exactMatches === 4,              // 4 aciertos en el mismo orden
    secondPrize: matchCount === 4 && exactMatches !== 4, // 4 aciertos en cualquier orden
    thirdPrize: exactMatches === 3,              // 3 aciertos en orden exacto
    freePrize: matchCount === 3 && exactMatches !== 3    // 3 aciertos en cualquier orden
  };
};

// Función para distribuir premios automáticamente
const distributePrizes = async (results, gameDay, processId) => {
  const prizeAmounts = {
    firstPrize: 1000,
    secondPrize: 500,
    thirdPrize: 100,
    freePrize: 0 // Free tickets no dan tokens, solo ticket gratis
  };
  
  const prizeTransactions = [];
  
  for (const [prizeType, winners] of Object.entries(results)) {
    const amount = prizeAmounts[prizeType];
    
    for (const ticket of winners) {
      if (ticket.userId && ticket.userId !== 'anonymous' && ticket.userId !== 'temp') {
        try {
          if (amount > 0) {
            // Crear transacción de premio
            const transactionId = `${processId}_${prizeType}_${ticket.userId}_${Date.now()}`;
            
            const prizeTransaction = {
              id: transactionId,
              userId: ticket.userId,
              walletAddress: ticket.walletAddress || 'unknown',
              prizeType: prizeType.replace('Prize', ''),
              amount: amount,
              status: 'completed',
              timestamp: FieldValue.serverTimestamp(),
              gameDay: gameDay,
              ticketId: ticket.id
            };
            
            await db.collection(PRIZE_TRANSACTIONS_COLLECTION).doc(transactionId).set(prizeTransaction);
            prizeTransactions.push(prizeTransaction);
            
            logger.info(`[${processId}] Premio de ${amount} tokens registrado para usuario ${ticket.userId} (${prizeType})`);
          } else if (prizeType === 'freePrize') {
            // Generar ticket gratis
            const freeTicketNumbers = generateRandomEmojis(4);
            
            await db.collection(TICKETS_COLLECTION).add({
              numbers: freeTicketNumbers,
              timestamp: FieldValue.serverTimestamp(),
              userId: ticket.userId,
              walletAddress: ticket.walletAddress,
              gameDay: gameDay,
              tokenCost: 0,
              isActive: true,
              isFreeTicket: true,
              wonFrom: ticket.id
            });
            
            logger.info(`[${processId}] Ticket gratis generado para usuario ${ticket.userId}`);
          }
        } catch (error) {
          logger.error(`[${processId}] Error distribuyendo premio para usuario ${ticket.userId}:`, error);
        }
      }
    }
  }
  
  return prizeTransactions;
};

// Función principal para procesar el sorteo
const processGameDraw = async () => {
  const now = new Date();
  const currentDay = getCurrentGameDay();
  const drawControlRef = db.collection('draw_control').doc(currentDay);
  const processId = Date.now().toString();
  
  try {
    logger.info(`[${processId}] Procesando sorteo del juego para el día ${currentDay}...`);
    
    // Verificar si ya existe un resultado para este día
    const existingByKeyQuery = db.collection(GAME_RESULTS_COLLECTION)
      .where('dayKey', '==', currentDay)
      .limit(1);
    
    const existingByKey = await existingByKeyQuery.get();
    
    if (!existingByKey.empty) {
      const existingResult = existingByKey.docs[0];
      logger.info(`[${processId}] Ya existe un resultado para el día ${currentDay} con ID: ${existingResult.id}`);
      return { success: true, alreadyProcessed: true, resultId: existingResult.id };
    }
    
    // Control de concurrencia con transacción
    const result = await db.runTransaction(async (transaction) => {
      const drawControlDoc = await transaction.get(drawControlRef);
      
      if (drawControlDoc.exists) {
        const data = drawControlDoc.data();
        if (data.completed) {
          return { success: true, alreadyProcessed: true, resultId: data.resultId };
        }
        if (data.inProgress) {
          const elapsed = Date.now() - (data.startedAt ? new Date(data.startedAt).getTime() : 0);
          if (elapsed < 30000) {
            return { success: false, inProgress: true };
          }
        }
      }
      
      transaction.set(drawControlRef, {
        timestamp: FieldValue.serverTimestamp(),
        inProgress: true,
        startedAt: now.toISOString(),
        processId: processId
      });
      
      return { success: true, alreadyProcessed: false };
    });
    
    if (result.alreadyProcessed || !result.success) {
      return result;
    }
    
    // Generar números ganadores
    const winningNumbers = generateRandomEmojis(4);
    logger.info(`[${processId}] Números ganadores generados:`, winningNumbers);
    
    // Calcular próximo sorteo
    const nextDay = new Date(now);
    nextDay.setDate(now.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    
    // Actualizar estado del juego
    await db.collection('game_state').doc(GAME_STATE_DOC).set({
      winningNumbers,
      nextDrawTime: Timestamp.fromDate(nextDay),
      lastUpdated: FieldValue.serverTimestamp(),
      lastProcessId: processId
    });
    
    // Obtener tickets activos del día actual
    const ticketsQuery = db.collection(TICKETS_COLLECTION)
      .where('gameDay', '==', currentDay)
      .where('isActive', '==', true);
    
    const ticketsSnapshot = await ticketsQuery.get();
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.info(`[${processId}] Procesando ${tickets.length} tickets del día ${currentDay}`);
    
    // Comprobar ganadores
    const prizesResults = {
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: []
    };
    
    tickets.forEach(ticket => {
      if (!ticket?.numbers) return;
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      if (winStatus.firstPrize) prizesResults.firstPrize.push(ticket);
      else if (winStatus.secondPrize) prizesResults.secondPrize.push(ticket);
      else if (winStatus.thirdPrize) prizesResults.thirdPrize.push(ticket);
      else if (winStatus.freePrize) prizesResults.freePrize.push(ticket);
    });
    
    logger.info(`[${processId}] Resultados:`, {
      firstPrize: prizesResults.firstPrize.length,
      secondPrize: prizesResults.secondPrize.length,
      thirdPrize: prizesResults.thirdPrize.length,
      freePrize: prizesResults.freePrize.length
    });
    
    // Distribuir premios automáticamente
    const prizeTransactions = await distributePrizes(prizesResults, currentDay, processId);
    
    // Guardar resultado
    const gameResultId = Date.now().toString();
    
    const serializableResult = {
      id: gameResultId,
      timestamp: FieldValue.serverTimestamp(),
      dateTime: new Date().toISOString(),
      winningNumbers,
      processId: processId,
      dayKey: currentDay,
      prizesDistributed: true,
      prizeTransactions: prizeTransactions,
      firstPrize: prizesResults.firstPrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous'
      })),
      secondPrize: prizesResults.secondPrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous'
      })),
      thirdPrize: prizesResults.thirdPrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous'
      })),
      freePrize: prizesResults.freePrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous'
      }))
    };
    
    await db.collection(GAME_RESULTS_COLLECTION).doc(gameResultId).set(serializableResult);
    
    // Marcar como completado
    await drawControlRef.set({
      timestamp: FieldValue.serverTimestamp(),
      inProgress: false,
      completed: true,
      resultId: gameResultId,
      processId: processId,
      completedAt: new Date().toISOString()
    });
    
    logger.info(`[${processId}] Sorteo procesado con éxito con ID: ${gameResultId}`);
    
    return { success: true, resultId: gameResultId };
  } catch (error) {
    logger.error(`[${processId}] Error procesando el sorteo:`, error);
    
    try {
      await drawControlRef.set({
        timestamp: FieldValue.serverTimestamp(),
        inProgress: false,
        completed: false,
        processId: processId,
        error: error.message,
        errorAt: new Date().toISOString()
      }, { merge: true });
    } catch (updateError) {
      logger.error(`[${processId}] Error actualizando documento de control:`, updateError);
    }
    
    return { success: false, error: error.message };
  }
};

// Función programada para ejecutar sorteo diario
exports.scheduledGameDraw = onSchedule({
  schedule: "0 0 * * *", // Todos los días a medianoche
  timeZone: "America/Sao_Paulo",
  memory: "512MiB",
  retryConfig: {
    maxRetryAttempts: 0,
    minBackoffSeconds: 10
  },
  maxInstances: 1
}, async (event) => {
  const instanceId = Date.now().toString();
  logger.info(`[${instanceId}] Ejecutando sorteo programado: ${event.jobName}`);
  
  const currentDay = getCurrentGameDay();
  const lockRef = db.collection('scheduler_locks').doc(currentDay);
  
  try {
    // Verificar si ya existe un resultado
    const existingResultQuery = db.collection(GAME_RESULTS_COLLECTION)
      .where('dayKey', '==', currentDay)
      .limit(1);
    
    const existingResult = await existingResultQuery.get();
    
    if (!existingResult.empty) {
      logger.info(`[${instanceId}] Ya existe un resultado para el día ${currentDay}. Abortando.`);
      return;
    }
    
    // Adquirir bloqueo
    const lockResult = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      
      if (lockDoc.exists) {
        return false;
      }
      
      transaction.set(lockRef, {
        timestamp: FieldValue.serverTimestamp(),
        jobName: event.jobName,
        instanceId: instanceId,
        startedAt: new Date().toISOString()
      });
      
      return true;
    });
    
    if (!lockResult) {
      logger.info(`[${instanceId}] Otra instancia está procesando el sorteo`);
      return;
    }
    
    // Ejecutar sorteo
    const result = await processGameDraw();
    
    // Actualizar bloqueo
    await lockRef.update({
      completed: true,
      completedAt: new Date().toISOString(),
      resultId: result.resultId || null,
      success: result.success || false
    });
    
    logger.info(`[${instanceId}] Sorteo finalizado: ${result.success}`);
  } catch (error) {
    logger.error(`[${instanceId}] Error en sorteo programado:`, error);
    
    try {
      await lockRef.update({
        error: error.message,
        errorAt: new Date().toISOString(),
        completed: false
      });
    } catch (updateError) {
      logger.error(`[${instanceId}] Error actualizando bloqueo:`, updateError);
    }
  }
});

// Función para trigger manual del sorteo
exports.triggerGameDraw = onCall({ 
  maxInstances: 1,
  memory: "512MiB"
}, async (request) => {
  logger.info("Solicitud manual de sorteo recibida");
  return await processGameDraw();
});

// Función para crear tokens diarios para un usuario
exports.createDailyTokens = onCall({}, async (request) => {
  const { userId } = request.data;
  
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }
  
  try {
    const currentDay = getCurrentGameDay();
    const tokensRef = db.collection(DAILY_TOKENS_COLLECTION).doc(`${userId}_${currentDay}`);
    
    const tokensDoc = await tokensRef.get();
    
    if (!tokensDoc.exists()) {
      await tokensRef.set({
        userId,
        date: currentDay,
        tokensAvailable: INITIAL_DAILY_TOKENS,
        tokensUsed: 0,
        lastUpdated: FieldValue.serverTimestamp()
      });
      
      logger.info(`Tokens diarios creados para usuario ${userId}: ${INITIAL_DAILY_TOKENS} tokens`);
      
      return {
        success: true,
        tokensAvailable: INITIAL_DAILY_TOKENS,
        date: currentDay
      };
    } else {
      const data = tokensDoc.data();
      return {
        success: true,
        tokensAvailable: data.tokensAvailable,
        tokensUsed: data.tokensUsed,
        date: currentDay
      };
    }
  } catch (error) {
    logger.error('Error creando tokens diarios:', error);
    throw new functions.https.HttpsError('internal', 'Error creating daily tokens');
  }
}); 