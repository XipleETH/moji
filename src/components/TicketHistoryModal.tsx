import React, { useState } from 'react';
import { X, Calendar, Ticket, ChevronDown, ChevronUp } from 'lucide-react';
import { useTicketHistory } from '../hooks/useTicketHistory';
import { Ticket as TicketType } from '../types';

interface TicketHistoryModalProps {
  onClose: () => void;
}

interface DayExpandedState {
  [gameDay: string]: boolean;
}

export const TicketHistoryModal: React.FC<TicketHistoryModalProps> = ({ onClose }) => {
  const { ticketsByDay, isLoading, totalTickets, totalDays, getSortedDays, formatGameDay } = useTicketHistory();
  const [expandedDays, setExpandedDays] = useState<DayExpandedState>({});

  const toggleDayExpanded = (gameDay: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [gameDay]: !prev[gameDay]
    }));
  };

  const formatTicketTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b">
            <h2 className="text-xl font-bold flex items-center">
              <Ticket className="mr-2 text-blue-600" size={24} />
              Historial de Tickets
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando historial de tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedDays = getSortedDays();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              <Ticket className="mr-2 text-blue-600" size={24} />
              Historial de Tickets
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalTickets} tickets en {totalDays} día{totalDays !== 1 ? 's' : ''}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedDays.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="mx-auto text-gray-300 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No hay tickets aún
              </h3>
              <p className="text-gray-500">
                Cuando compres tickets, aparecerán aquí organizados por días.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDays.map(gameDay => {
                const dayTickets = ticketsByDay[gameDay];
                const isExpanded = expandedDays[gameDay];
                
                return (
                  <div key={gameDay} className="border rounded-lg overflow-hidden">
                    {/* Day Header */}
                    <button
                      onClick={() => toggleDayExpanded(gameDay)}
                      className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <Calendar className="text-gray-600" size={20} />
                        <div className="text-left">
                          <div className="font-semibold text-gray-800">
                            {formatGameDay(gameDay)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {gameDay} • {dayTickets.length} ticket{dayTickets.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {dayTickets.length}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="text-gray-400" size={20} />
                        ) : (
                          <ChevronDown className="text-gray-400" size={20} />
                        )}
                      </div>
                    </button>

                    {/* Day Tickets */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t">
                        <div className="grid gap-3">
                          {dayTickets.map((ticket, index) => (
                            <TicketCard key={ticket.id} ticket={ticket} showTime={true} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            Mostrando tickets de los últimos 30 días
          </p>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar cada ticket individual
interface TicketCardProps {
  ticket: TicketType;
  showTime?: boolean;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, showTime = false }) => {
  return (
    <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            {ticket.numbers.map((emoji, i) => (
              <span key={i} className="text-2xl">{emoji}</span>
            ))}
          </div>
          {showTime && (
            <div className="text-sm text-gray-500">
              {new Date(ticket.timestamp).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Ticket #{ticket.id.slice(-8)}</div>
          <div className="text-xs text-green-600 font-medium">1 Token</div>
        </div>
      </div>
    </div>
  );
}; 