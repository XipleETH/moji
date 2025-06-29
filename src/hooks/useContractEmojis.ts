import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '../utils/contractAddresses';

const LOTTO_MOJI_MAIN_ABI = [
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'EMOJIS',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export const useContractEmojis = () => {
  const [emojis, setEmojis] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http()
  });

  useEffect(() => {
    const loadEmojisFromContract = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Cargando emojis del contrato:', CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN);
        
        const emojiPromises = [];
        
        // El contrato debería tener 25 emojis (índices 0-24)
        for (let i = 0; i < 25; i++) {
          emojiPromises.push(
            publicClient.readContract({
              address: CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN as `0x${string}`,
              abi: LOTTO_MOJI_MAIN_ABI,
              functionName: 'EMOJIS',
              args: [BigInt(i)]
            }).catch(err => {
              console.warn(`Error cargando emoji ${i}:`, err);
              return null; // Emoji no encontrado
            })
          );
        }

        const results = await Promise.all(emojiPromises);
        const validEmojis = results.filter(emoji => emoji !== null && emoji !== '') as string[];
        
        console.log('✅ Emojis cargados del contrato:', validEmojis);
        console.log(`📊 Total de emojis: ${validEmojis.length}`);
        
        if (validEmojis.length === 0) {
          throw new Error('No se pudieron cargar emojis del contrato');
        }
        
        setEmojis(validEmojis);
        
      } catch (err: any) {
        console.error('❌ Error cargando emojis del contrato:', err);
        setError(err.message || 'Error cargando emojis del contrato');
        
        // Fallback a emojis hardcodeados si falla la lectura del contrato
        console.log('🔄 Usando emojis fallback...');
        const fallbackEmojis = [
          '💰', '💎', '🚀', '🎰', '🎲', '🃏', '💸', '🏆', '🎯', '🔥',
          '⚡', '🌙', '⭐', '💫', '🎪', '🎨', '🦄', '🌈', '🍀', '🎭',
          '🎢', '🎮', '🏅', '🎊', '🎈'
        ];
        setEmojis(fallbackEmojis);
        
      } finally {
        setIsLoading(false);
      }
    };

    loadEmojisFromContract();
  }, []);

  const refreshEmojis = () => {
    setIsLoading(true);
    setError(null);
    // Recargar emojis
    setTimeout(() => {
      const loadEmojis = async () => {
        try {
          const emojiPromises = [];
          for (let i = 0; i < 25; i++) {
            emojiPromises.push(
              publicClient.readContract({
                address: CONTRACT_ADDRESSES.LOTTO_MOJI_MAIN as `0x${string}`,
                abi: LOTTO_MOJI_MAIN_ABI,
                functionName: 'EMOJIS',
                args: [BigInt(i)]
              }).catch(() => null)
            );
          }
          const results = await Promise.all(emojiPromises);
          const validEmojis = results.filter(emoji => emoji !== null && emoji !== '') as string[];
          setEmojis(validEmojis);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      loadEmojis();
    }, 100);
  };

  return {
    emojis,
    isLoading,
    error,
    refreshEmojis,
    totalEmojis: emojis.length
  };
}; 