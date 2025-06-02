import React, { useState, useEffect } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { generateRandomEmojis } from '../utils/gameLogic';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { WalletIcon, CheckCircle } from 'lucide-react';

interface TicketGeneratorProps {
  onGenerateTicket: (numbers: string[]) => void;
  disabled: boolean;
  ticketCount: number;
  maxTickets: number;
}

export const TicketGenerator: React.FC<TicketGeneratorProps> = ({
  onGenerateTicket,
  disabled,
  ticketCount,
  maxTickets
}) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<string[] | null>(null);
  const { user, isConnected, connect, isConnecting } = useWalletAuth();

  // Reset selected emojis when ticket count changes to 0
  useEffect(() => {
    if (ticketCount === 0) {
      setSelectedEmojis([]);
    }
  }, [ticketCount]);

  const handleGenerateTicket = async (numbers: string[]) => {
    // Si no hay wallet conectada, mostrar prompt y guardar el ticket pendiente
    if (!isConnected || !user?.walletAddress) {
      setPendingTicket(numbers);
      setShowWalletPrompt(true);
      return;
    }
    
    // Si hay wallet, generar ticket
    onGenerateTicket(numbers);
    setSelectedEmojis([]); // Reset selection after generating ticket
    setPendingTicket(null);
    setShowWalletPrompt(false);
  };

  const handleWalletConnect = async () => {
    try {
      await connect();
      setShowWalletPrompt(false);
      
      // Si tenemos un ticket pendiente, generarlo después de conectar
      if (pendingTicket) {
        onGenerateTicket(pendingTicket);
        setPendingTicket(null);
        setSelectedEmojis([]);
      }
    } catch (error) {
      console.error('Error conectando wallet:', error);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (disabled) return;
    
    const newSelection = [...selectedEmojis, emoji];
    setSelectedEmojis(newSelection);
    
    // Ya no generamos automáticamente cuando llegamos a 4
    // El usuario debe hacer clic en el botón de confirmación
  };

  const handleEmojiDeselect = (index: number) => {
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  };

  const handleRandomGenerate = () => {
    if (disabled) return;
    const randomEmojis = generateRandomEmojis(4);
    handleGenerateTicket(randomEmojis);
  };

  const handleConfirmSelectedTicket = () => {
    if (selectedEmojis.length === 4) {
      handleGenerateTicket(selectedEmojis);
    }
  };

  const handleCancelWalletPrompt = () => {
    setShowWalletPrompt(false);
    setPendingTicket(null);
  };

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col gap-4">
        <EmojiGrid
          selectedEmojis={selectedEmojis}
          onEmojiSelect={handleEmojiSelect}
          onEmojiDeselect={handleEmojiDeselect}
          maxSelections={4}
        />
        
        {/* Botón de confirmación para emojis seleccionados */}
        {selectedEmojis.length === 4 && (
          <button
            onClick={handleConfirmSelectedTicket}
            disabled={disabled}
            className={`w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 
                     rounded-xl shadow-lg transform transition hover:scale-105 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            <CheckCircle size={20} />
            Confirmar Ticket con Emojis Seleccionados
          </button>
        )}
        
        <button
          onClick={handleRandomGenerate}
          disabled={disabled}
          className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 
                   rounded-xl shadow-lg transform transition hover:scale-105 
                   disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Generate Random Ticket
        </button>

        {/* Prompt de conexión de wallet */}
        {showWalletPrompt && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <WalletIcon className="mr-2" size={20} />
                <div>
                  <div className="font-medium text-white">Conectar Wallet Requerida</div>
                  <div className="text-sm text-white/70">
                    Necesitas conectar una wallet para generar tickets
                  </div>
                  {pendingTicket && (
                    <div className="text-xs text-white/60 mt-1">
                      Ticket con emojis: {pendingTicket.join(' ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelWalletPrompt}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWalletConnect}
                  disabled={isConnecting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                >
                  {isConnecting ? 'Conectando...' : 'Conectar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mostrar información del ticket count sin límites */}
        <div className="text-center text-white/70 text-sm">
          Tickets generados: {ticketCount}
        </div>

        {/* Instrucciones para el usuario */}
        <div className="text-center text-white/60 text-xs">
          {selectedEmojis.length === 0 && "Selecciona 4 emojis para crear un ticket personalizado"}
          {selectedEmojis.length > 0 && selectedEmojis.length < 4 && 
            `Selecciona ${4 - selectedEmojis.length} emoji${4 - selectedEmojis.length === 1 ? '' : 's'} más`}
          {selectedEmojis.length === 4 && "¡Listo! Haz clic en 'Confirmar Ticket' para generar tu ticket"}
        </div>
      </div>
    </div>
  );
};