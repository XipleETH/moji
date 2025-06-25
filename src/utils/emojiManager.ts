import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES, GAME_CONFIG } from './contractAddresses';

// Emojis de respaldo si hay problemas
const FALLBACK_EMOJIS = GAME_CONFIG.EMOJI_MAP;

let cachedEmojis: string[] = [];
let isLoading = false;
let lastLoadTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

export const loadEmojisFromContract = async (): Promise<string[]> => {
  // Usar caché si es reciente
  const now = Date.now();
  if (cachedEmojis.length > 0 && (now - lastLoadTime) < CACHE_DURATION) {
    console.log('🔄 Usando emojis del caché');
    return cachedEmojis;
  }

  if (isLoading) {
    console.log('⏳ Carga de emojis ya en progreso...');
    return cachedEmojis.length > 0 ? cachedEmojis : FALLBACK_EMOJIS;
  }

  isLoading = true;

  try {
    // En el nuevo sistema, simplemente devolvemos el mapeo de emojis
    // ya que el contrato solo maneja índices
    cachedEmojis = [...GAME_CONFIG.EMOJI_MAP];
    lastLoadTime = now;
    console.log('✅ Usando mapeo de emojis configurado');
    console.log(`📊 Total de emojis: ${cachedEmojis.length}`);
    return cachedEmojis;
    
  } catch (err: any) {
    console.error('❌ Error con el mapeo de emojis:', err);
    console.log('🔄 Usando emojis de respaldo...');
    return FALLBACK_EMOJIS;
    
  } finally {
    isLoading = false;
  }
};

// Función para obtener emojis sincrónicamente (usa caché o fallback)
export const getEmojis = (): string[] => {
  if (cachedEmojis.length > 0) {
    return cachedEmojis;
  }
  return FALLBACK_EMOJIS;
};

// Función para generar selección aleatoria de emojis
export const generateRandomEmojis = (count: number): string[] => {
  const availableEmojis = getEmojis();
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableEmojis.length);
    result.push(availableEmojis[randomIndex]);
  }
  
  return result;
};

// Función para validar que los emojis seleccionados están en la lista válida
export const validateEmojiSelection = (selectedEmojis: string[]): boolean => {
  const validEmojis = getEmojis();
  return selectedEmojis.every(emoji => validEmojis.includes(emoji));
};

// Función para obtener el índice del emoji
export const getEmojiIndex = (emoji: string): number => {
  const emojis = getEmojis();
  const index = emojis.indexOf(emoji);
  return index >= 0 ? index : -1;
};

// Función para obtener emoji por índice
export const getEmojiByIndex = (index: number): string | null => {
  const emojis = getEmojis();
  return emojis[index] || null;
};

// Limpiar caché (útil para testing o recargas)
export const clearEmojiCache = (): void => {
  cachedEmojis = [];
  lastLoadTime = 0;
};

export { FALLBACK_EMOJIS }; 