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

  // Auto-hide wallet prompt when wallet gets connected
  useEffect(() => {
    if (isConnected && user?.walletAddress && showWalletPrompt) {
      console.log('[TicketGenerator] Wallet connected, hiding prompt');
      setShowWalletPrompt(false);
      
      // Si tenemos un ticket pendiente, generarlo automáticamente
      if (pendingTicket) {
        console.log('[TicketGenerator] Generating pending ticket:', pendingTicket);
        onGenerateTicket(pendingTicket);
        setPendingTicket(null);
        setSelectedEmojis([]);
      }
    }
  }, [isConnected, user?.walletAddress, showWalletPrompt, pendingTicket, onGenerateTicket]);

  const handleGenerateTicket = async (numbers: string[]) => {
    console.log('[TicketGenerator] Attempting to generate ticket with numbers:', numbers);
    console.log('[TicketGenerator] Current state - isConnected:', isConnected, 'user:', user);
    
    // Si no hay wallet conectada, mostrar prompt y guardar el ticket pendiente
    if (!isConnected || !user?.walletAddress) {
      console.log('[TicketGenerator] No wallet connected, showing prompt');
      setPendingTicket(numbers);
      setShowWalletPrompt(true);
      return;
    }
    
    // Si hay wallet, generar ticket
    console.log('[TicketGenerator] Wallet connected, generating ticket');
    onGenerateTicket(numbers);
    setSelectedEmojis([]); // Reset selection after generating ticket
    setPendingTicket(null);
    setShowWalletPrompt(false);
  };

  const handleWalletConnect = async () => {
    console.log('[TicketGenerator] Connecting wallet...');
    try {
      await connect();
      // No need to handle the rest here, the useEffect will take care of it
    } catch (error) {
      console.error('[TicketGenerator] Error connecting wallet:', error);
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
            {pendingTicket && (
              <div className="text-red-200 text-sm mt-2">
                Ticket with emojis: {pendingTicket.join(' ')}
              </div>
            )}
            <div className="flex gap-2 mt-4 justify-center">
              <button
                onClick={handleCancelWalletPrompt}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleWalletConnect}
                disabled={isConnecting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        )}

        {/* Debug info (only in development) */}
        {import.meta.env.DEV && (
          <div className="bg-black/20 p-2 rounded text-xs text-white/60 font-mono">
            <div>Connected: {isConnected ? 'YES' : 'NO'}</div>
            <div>User: {user?.walletAddress ? `${user.walletAddress.substring(0, 8)}...` : 'None'}</div>
            <div>Connecting: {isConnecting ? 'YES' : 'NO'}</div>
            <div>Show Prompt: {showWalletPrompt ? 'YES' : 'NO'}</div>
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