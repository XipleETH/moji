import { Ticket } from '../types';

export const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                      '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                      '🎁', '🎮', '🚀', '🌍', '🍀'];

// Convert emoji to its index number (for smart contracts)
export const emojiToNumber = (emoji: string): number => {
  const index = EMOJIS.indexOf(emoji);
  return index >= 0 ? index : 0; // Default to first emoji if not found
};

// Convert number index back to emoji (from smart contracts)
export const numberToEmoji = (number: number): string => {
  return EMOJIS[number] || EMOJIS[0]; // Default to first emoji if index is invalid
};

// Convert array of emojis to array of numbers
export const emojisToNumbers = (emojis: string[]): number[] => {
  return emojis.map(emoji => emojiToNumber(emoji));
};

// Convert array of numbers to array of emojis  
export const numbersToEmojis = (numbers: number[]): string[] => {
  return numbers.map(number => numberToEmoji(number));
};

export const generateRandomEmojis = (count: number): string[] => {
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * EMOJIS.length);
    result.push(EMOJIS[randomIndex]);
  }
  
  return result;
};

export const checkWin = (ticket: string[], winning: string[]): {
  firstPrize: boolean;
  secondPrize: boolean;
  thirdPrize: boolean;
  freePrize: boolean;
} => {
  // Verificar coincidencias exactas (mismo emoji en la misma posición)
  let exactMatches = 0;
  for (let i = 0; i < ticket.length; i++) {
    if (i < winning.length && ticket[i] === winning[i]) {
      exactMatches++;
    }
  }
  
  // Para el segundo premio (ahora) y ticket gratis, necesitamos contar correctamente
  // cuántos emojis del ticket coinciden con los del resultado ganador
  
  // Crear copias para no modificar los originales
  const ticketCopy = [...ticket];
  const winningCopy = [...winning];
  
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
    // 4 aciertos en orden exacto (premio mayor)
    firstPrize: exactMatches === 4,
    
    // 4 aciertos en cualquier orden (ahora segundo premio)
    secondPrize: matchCount === 4 && exactMatches !== 4,
    
    // 3 aciertos en orden exacto (ahora tercer premio)
    thirdPrize: exactMatches === 3,
    
    // 3 aciertos en cualquier orden (cuarto premio - ticket gratis)
    freePrize: matchCount === 3 && exactMatches !== 3
  };
};