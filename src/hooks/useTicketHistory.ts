import { useState, useEffect } from 'react';
import { TicketsByDay, subscribeToUserTicketHistory } from '../firebase/game';

export interface TicketHistoryState {
  ticketsByDay: TicketsByDay;
  isLoading: boolean;
  error: string | null;
  totalTickets: number;
  totalDays: number;
}

export const useTicketHistory = (limitDays: number = 30) => {
  const [state, setState] = useState<TicketHistoryState>({
    ticketsByDay: {},
    isLoading: true,
    error: null,
    totalTickets: 0,
    totalDays: 0
  });

  useEffect(() => {
    console.log('[useTicketHistory] Iniciando suscripción al historial de tickets');
    
    const unsubscribe = subscribeToUserTicketHistory((ticketsByDay) => {
      const totalTickets = Object.values(ticketsByDay).reduce((total, dayTickets) => total + dayTickets.length, 0);
      const totalDays = Object.keys(ticketsByDay).length;
      
      setState({
        ticketsByDay,
        isLoading: false,
        error: null,
        totalTickets,
        totalDays
      });
    }, limitDays);

    return () => {
      console.log('[useTicketHistory] Limpiando suscripción al historial de tickets');
      unsubscribe();
    };
  }, [limitDays]);

  // Función para obtener tickets de un día específico
  const getTicketsForDay = (gameDay: string) => {
    return state.ticketsByDay[gameDay] || [];
  };

  // Función para obtener los días ordenados (más reciente primero)
  const getSortedDays = () => {
    return Object.keys(state.ticketsByDay).sort((a, b) => b.localeCompare(a));
  };

  // Función para formatear fecha de manera amigable
  const formatGameDay = (gameDay: string): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (gameDay === todayStr) {
      return 'Hoy';
    } else if (gameDay === yesterdayStr) {
      return 'Ayer';
    } else {
      // Formatear fecha en español
      const date = new Date(gameDay + 'T00:00:00');
      return date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return {
    ...state,
    getTicketsForDay,
    getSortedDays,
    formatGameDay
  };
}; 