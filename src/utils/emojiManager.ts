import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES } from './contractAddresses';

const LOTTO_MOJI_MAIN_ABI = [
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'EMOJIS',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Emojis de respaldo si el contrato no está disponible
const FALLBACK_EMOJIS = [
  '💰', '💎', '🚀', '🎰', '🎲', '🃏', '💸', '🏆', '🎯', '🔥',
  '⚡', '🌙', '⭐', '💫', '🎪', '🎨', '🦄', '🌈', '🍀', '🎭',
  '🎢', '🎮', '🏅', '🎊', '🎈'
];

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
    console.log('🔍 Cargando emojis del contrato:', CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN);
    console.log('🌐 Red: Base Sepolia');
    console.log('📡 RPC Transport: HTTP');
    
    const emojiPromises = [];
    
    // Cargar 25 emojis del contrato (índices 0-24)
    console.log('📋 Intentando leer emojis indices 0-24...');
    for (let i = 0; i < 25; i++) {
      emojiPromises.push(
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN as `0x${string}`,
          abi: LOTTO_MOJI_MAIN_ABI,
          functionName: 'EMOJIS',
          args: [BigInt(i)]
        }).catch(err => {
          console.warn(`❌ Error cargando emoji índice ${i}:`, err.message || err);
          return null;
        })
      );
    }

    const results = await Promise.all(emojiPromises);
    const validEmojis = results.filter(emoji => emoji !== null && emoji !== '') as string[];
    
    if (validEmojis.length > 0) {
      cachedEmojis = validEmojis;
      lastLoadTime = now;
      console.log('✅ Emojis cargados del contrato:', validEmojis);
      console.log(`📊 Total de emojis: ${validEmojis.length}`);
      return validEmojis;
    } else {
      throw new Error('No se pudieron cargar emojis del contrato');
    }
    
  } catch (err: any) {
    console.error('❌ Error cargando emojis del contrato:', err);
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
  
  // Si no hay caché, cargar en background y devolver fallback
  loadEmojisFromContract().catch(console.error);
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

// Función para obtener el índice del emoji en el contrato
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