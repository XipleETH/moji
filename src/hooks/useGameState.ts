import { useState, useEffect, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { getGameState, subscribeToGameState, generateTicket, getUserTickets } from '../firebase/game';
import { GameState } from '../firebase/game';

export interface GameResult {
  id: string;
  timestamp: Timestamp;
  dateTime: string;
  dateKey: string;
  winningNumbers: string[];
  processId: string;
  totalTickets: number;
  drawType: string;
  firstPrize: Array<{
    id: string;
    numbers: string[];
    timestamp: Timestamp;
    userId: string;
    walletAddress?: string;
  }>;
  secondPrize: Array<{
    id: string;
    numbers: string[];
    timestamp: Timestamp;
    userId: string;
    walletAddress?: string;
  }>;
  thirdPrize: Array<{
    id: string;
    numbers: string[];
    timestamp: Timestamp;
    userId: string;
    walletAddress?: string;
  }>;
  freePrize: Array<{
    id: string;
    numbers: string[];
    timestamp: Timestamp;
    userId: string;
    walletAddress?: string;
  }>;
}

interface CooldownStatus {
  isInCooldown: boolean;
  nextDrawTime: string;
  currentTime: string;
  cooldownMinutes: number;
}

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Array<{
    id: string;
    numbers: string[];
    timestamp: Timestamp;
  }>>([]);
  const [cooldownStatus, setCooldownStatus] = useState<CooldownStatus | null>(null);

  // Función para obtener el estado de cooldown
  const fetchCooldownStatus = async () => {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase/config');
      
      const checkCooldown = httpsCallable(functions, 'checkCooldownStatus');
      const result = await checkCooldown();
      
      setCooldownStatus(result.data as CooldownStatus);
    } catch (error) {
      console.error('Error checking cooldown status:', error);
    }
  };

  // Función para calcular tiempo restante hasta el próximo sorteo
  const getTimeRemaining = useCallback(() => {
    if (!gameState?.nextDrawTime) return null;
    
    const now = Date.now();
    const nextDraw = gameState.nextDrawTime.toDate().getTime();
    const remaining = nextDraw - now;
    
    if (remaining <= 0) return null;
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds, total: remaining };
  }, [gameState?.nextDrawTime]);

  // Función para generar ticket con validación de cooldown
  const handleGenerateTicket = async (numbers: string[], userId?: string) => {
    try {
      // Verificar cooldown antes de generar ticket
      await fetchCooldownStatus();
      
      if (cooldownStatus?.isInCooldown) {
        throw new Error(`No se pueden comprar tickets durante los ${cooldownStatus.cooldownMinutes} minutos antes del sorteo`);
      }
      
      const result = await generateTicket(numbers, userId);
      
      // Actualizar lista de tickets si es exitoso
      if (result.success && userId) {
        await loadUserTickets(userId);
      }
      
      return result;
    } catch (error) {
      console.error('Error generating ticket:', error);
      throw error;
    }
  };

  // Función para obtener tickets del usuario del día actual
  const loadUserTickets = async (userId?: string) => {
    if (!userId) return;
    
    try {
      // Obtener solo tickets del día actual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const userTickets = await getUserTickets(userId, today, tomorrow);
      setTickets(userTickets);
    } catch (error) {
      console.error('Error loading user tickets:', error);
    }
  };

  // Verificar si un ticket es válido para el sorteo actual
  const isTicketValidForToday = (ticket: { timestamp: Timestamp }) => {
    const ticketDate = ticket.timestamp.toDate();
    const today = new Date();
    
    // Comparar si el ticket es del mismo día
    return (
      ticketDate.getFullYear() === today.getFullYear() &&
      ticketDate.getMonth() === today.getMonth() &&
      ticketDate.getDate() === today.getDate()
    );
  };

  // Función para obtener el estado inicial
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const state = await getGameState();
      setGameState(state);
      
      await fetchCooldownStatus();
    } catch (err) {
      console.error('Error loading game state:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Suscribirse a cambios del estado del juego
  useEffect(() => {
    loadInitialData();
    
    const unsubscribe = subscribeToGameState((state) => {
      setGameState(state);
    });

    // Actualizar cooldown cada minuto
    const cooldownInterval = setInterval(fetchCooldownStatus, 60000);
    
    return () => {
      unsubscribe();
      clearInterval(cooldownInterval);
    };
  }, []);

  // Función para verificar si estamos cerca del sorteo
  const isNearDraw = () => {
    if (!cooldownStatus) return false;
    
    const timeRemaining = getTimeRemaining();
    if (!timeRemaining) return false;
    
    // Considerar "cerca" si queda menos de 1 hora
    return timeRemaining.total < 60 * 60 * 1000;
  };

  // Función para forzar un sorteo manual (solo para pruebas)
  const forceGameDraw = async () => {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase/config');
      
      const triggerDraw = httpsCallable(functions, 'triggerDailyGameDraw');
      const result = await triggerDraw();
      
      console.log('Manual draw result:', result.data);
      
      // Recargar el estado después del sorteo
      await loadInitialData();
      
      return result.data;
    } catch (error) {
      console.error('Error triggering manual draw:', error);
      throw error;
    }
  };

  return {
    gameState,
    loading,
    error,
    tickets,
    cooldownStatus,
    getTimeRemaining,
    handleGenerateTicket,
    loadUserTickets,
    isTicketValidForToday,
    isNearDraw,
    forceGameDraw,
    refresh: loadInitialData
  };
};