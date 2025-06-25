import React from 'react';
import { Ticket } from '../types';
import { Ticket as TicketIcon, Clock, Calendar } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  showTime?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, showTime = false }) => {
  // Debug logging
  React.useEffect(() => {
    console.log(`[TicketCard] Renderizando ticket:`, {
      id: ticket.id,
      gameDay: ticket.gameDay,
      timestamp: new Date(ticket.timestamp).toLocaleString(),
      numbers: ticket.numbers,
      isTemp: ticket.id.startsWith('temp-')
    });
  }, [ticket]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    });
  };

  return (
    <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 border-2 border-purple-200 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TicketIcon className="text-purple-600" size={20} />
          <span className="text-sm font-medium text-purple-800">
            {ticket.id.startsWith('temp-') ? 'Procesando...' : 'Ticket'}
          </span>
          {ticket.id.startsWith('temp-') && (
            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        
        {showTime && (
          <div className="text-xs text-gray-600 flex items-center space-x-1">
            <Clock size={12} />
            <span>{formatTime(ticket.timestamp)}</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="flex flex-wrap gap-2">
          {ticket.numbers.map((emoji, index) => (
            <span 
              key={index} 
              className="text-2xl bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-sm border"
            >
              {emoji}
            </span>
          ))}
        </div>
        
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">
            {showTime ? (
              <div className="flex items-center justify-end space-x-1">
                <Calendar size={12} />
                <span>{formatDate(ticket.timestamp)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-end space-x-1">
                <Clock size={12} />
                <span>{formatTime(ticket.timestamp)}</span>
              </div>
            )}
          </div>
          <div className="text-xs font-medium text-purple-600">
            {ticket.tokenCost || 1} token{(ticket.tokenCost || 1) > 1 ? 's' : ''}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 text-center border-t pt-2">
        ID: {ticket.id.length > 20 ? `${ticket.id.substring(0, 20)}...` : ticket.id}
      </div>
    </div>
  );
}; 