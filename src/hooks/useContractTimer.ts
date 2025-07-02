import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../utils/contractAddresses';

// ABI mínimo para las funciones del timer (LottoMojiCoreV3)
const TIMER_ABI = [
  "function currentGameDay() view returns (uint24)",
  "function nextDrawTs() view returns (uint256)",
  "function dailyDrawHourUTC() view returns (uint8)"
];

interface ContractTimerData {
  timeRemaining: number;
  nextDrawTime: number;
  currentGameDay: number;
  lastDrawTime: number;
  drawTimeUTC: number;
  drawInterval: number;
  isConnected: boolean;
  error: string | null;
}

export function useContractTimer(onTimeEnd: () => void): ContractTimerData {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [nextDrawTime, setNextDrawTime] = useState(0);
  const [currentGameDay, setCurrentGameDay] = useState(0);
  const [lastDrawTime, setLastDrawTime] = useState(0);
  const [drawTimeUTC, setDrawTimeUTC] = useState(0);
  const [drawInterval, setDrawInterval] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const contractSyncRef = useRef<NodeJS.Timeout>();
  const processingRef = useRef(false);
  const lastNotifiedGameDayRef = useRef<number>(0);

  const fetchContractTime = async () => {
    try {
      // Configurar provider para Avalanche Fuji
      const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTO_MOJI_CORE, TIMER_ABI, provider);

      // Obtener datos del contrato V3
      const [
        contractGameDay,
        contractNextDrawTs,
        contractDrawHourUTC
      ] = await Promise.all([
        contract.currentGameDay(),
        contract.nextDrawTs(),
        contract.dailyDrawHourUTC()
      ]);

      const gameDay = Number(contractGameDay);
      const nextDraw = Number(contractNextDrawTs);
      const drawHour = Number(contractDrawHourUTC);
      const interval = 86400; // 24 horas en segundos (fijo para V3)
      const lastDraw = nextDraw - interval;
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, nextDraw - now);

      console.log(`[useContractTimer] Contract V3 data:`, {
        gameDay,
        lastDraw: new Date(lastDraw * 1000).toISOString(),
        nextDraw: new Date(nextDraw * 1000).toISOString(),
        drawHour: `${drawHour}:00 UTC`,
        interval: `${interval / 3600}h`,
        remaining: `${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}m ${remaining % 60}s`
      });

      setCurrentGameDay(gameDay);
      setLastDrawTime(lastDraw);
      setDrawTimeUTC(drawHour * 3600); // convertir horas a segundos para compatibilidad
      setDrawInterval(interval);
      setNextDrawTime(nextDraw);
      setTimeRemaining(remaining);
      setIsConnected(true);
      setError(null);

      // Detectar cambio de día del juego
      if (lastNotifiedGameDayRef.current !== 0 && 
          gameDay > lastNotifiedGameDayRef.current && 
          !processingRef.current) {
        processingRef.current = true;
        console.log(`[useContractTimer] Game day changed: ${lastNotifiedGameDayRef.current} → ${gameDay}`);
        
        setTimeout(() => {
          onTimeEnd();
          processingRef.current = false;
        }, 1000);
      }
      
      lastNotifiedGameDayRef.current = gameDay;

      return { nextDraw, remaining, gameDay };

    } catch (err) {
      console.error('[useContractTimer] Error fetching contract time:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
      
      // Fallback a cálculo local si el contrato falla
      return null;
    }
  };

  const calculateLocalFallback = () => {
    // Fallback usando la lógica del contrato V3
    // drawTimeUTC = 2 hours (02:00 UTC)
    // DRAW_INTERVAL = 24 hours
    
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();
    
    // Próximo sorteo a las 02:00 UTC
    const nextDrawUTC = new Date(now);
    
    if (utcHours >= 2) {
      // Si ya pasaron las 02:00 UTC, el próximo sorteo es mañana
      nextDrawUTC.setUTCDate(nextDrawUTC.getUTCDate() + 1);
    }
    
    nextDrawUTC.setUTCHours(2, 0, 0, 0); // 02:00 UTC
    
    const remaining = Math.floor((nextDrawUTC.getTime() - now.getTime()) / 1000);
    
    console.log(`[useContractTimer] Local fallback:`, {
      now: now.toISOString(),
      nextDraw: nextDrawUTC.toISOString(),
      remaining: `${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}m ${remaining % 60}s`
    });
    
    return Math.max(0, remaining);
  };

  useEffect(() => {
    console.log('[useContractTimer] Initializing contract timer');
    
    // Sincronización inicial con el contrato
    fetchContractTime();
    
    // Timer principal - actualizar cada segundo
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Cuando el timer llega a 0, solicitar datos frescos del contrato
          fetchContractTime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Sincronización periódica con el contrato cada 60 segundos
    contractSyncRef.current = setInterval(async () => {
      const contractData = await fetchContractTime();
      
      if (contractData) {
        const { remaining } = contractData;
        
        // Solo actualizar si hay una diferencia significativa (más de 30 segundos)
        setTimeRemaining(current => {
          const difference = Math.abs(current - remaining);
          
          if (difference > 30) {
            console.log(`[useContractTimer] Syncing with contract: ${current}s → ${remaining}s (diff: ${difference}s)`);
            return remaining;
          }
          
          return current;
        });
      } else {
        // Si el contrato no está disponible, usar fallback local
        const fallbackTime = calculateLocalFallback();
        setTimeRemaining(fallbackTime);
      }
    }, 60000);

    return () => {
      console.log('[useContractTimer] Cleaning up timers');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (contractSyncRef.current) {
        clearInterval(contractSyncRef.current);
      }
    };
  }, [onTimeEnd]);

  return {
    timeRemaining,
    nextDrawTime,
    currentGameDay,
    lastDrawTime,
    drawTimeUTC,
    drawInterval,
    isConnected,
    error
  };
} 