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
            Confirm Ticket with Selected Emojis
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
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-center">
            <WalletIcon className="mx-auto mb-2" size={32} />
            <div className="font-medium text-white">Wallet Connection Required</div>
            <div className="text-red-200 text-sm mt-1">
              You need to connect a wallet to generate tickets
            </div>
            <div className="text-red-200 text-sm mt-2">
              Ticket with emojis: {pendingTicket.join(' ')}
            </div>
          </div>
        )}

        {/* Mostrar información del ticket count sin límites */}
        <div className="text-center space-y-2">
          <div className="text-white/80">
            Tickets generated: {ticketCount}
          </div>
          
          <div className="text-white/70 text-sm">
            {selectedEmojis.length === 0 && "Select 4 emojis to create a custom ticket"}
            {selectedEmojis.length > 0 && selectedEmojis.length < 4 && `Select ${4 - selectedEmojis.length} more emoji${4 - selectedEmojis.length !== 1 ? 's' : ''}`}
            {selectedEmojis.length === 4 && "Ready! Click 'Confirm Ticket' to generate your ticket"}
          </div>
        </div>
      </div>
    </div>
  );
};