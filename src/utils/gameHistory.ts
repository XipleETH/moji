import { GameResult } from '../types';
import { saveGameHistory, loadGameHistory } from './storage';

// Usar Map para almacenar resultados por día
const gameHistoryMap = new Map<string, GameResult>();
let gameHistory: GameResult[] = loadGameHistory();

// Función auxiliar para obtener la clave del día
const getDayKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

// Inicializar el mapa con la historia cargada
gameHistory.forEach(game => {
  const key = getDayKey(game.timestamp);
  if (!gameHistoryMap.has(key)) {
    gameHistoryMap.set(key, game);
  }
});

export const addGameResult = (result: GameResult) => {
  const key = getDayKey(result.timestamp);
  
  if (!gameHistoryMap.has(key)) {
    gameHistoryMap.set(key, result);
    gameHistory.push(result);
    
    const dayKey = getDayKey(result.timestamp);
    
    // Verificar si ya existe un resultado para este día en la lista
    if (!gameHistoryMap.has(dayKey)) {
      console.log(`Añadiendo nuevo resultado para el día: ${dayKey}`);
      gameHistoryMap.set(dayKey, result);
      gameHistory.push(result);
      
      // Ordenar por timestamp (más reciente primero)
      gameHistory.sort((a, b) => b.timestamp - a.timestamp);
      
      // Guardar en localStorage
      saveGameHistory(gameHistory);
    } else {
      console.log(`Resultado duplicado para el día: ${dayKey}, ignorando`);
    }
  }
};

export const getGameHistory = () => {
  return gameHistory;
};

export const clearCurrentGameHistory = () => {
  gameHistory = [];
  gameHistoryMap.clear();
  localStorage.removeItem('lottomoji_history');
};