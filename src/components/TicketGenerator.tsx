import React, { useState, useEffect } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { generateRandomEmojis } from '../utils/gameLogic';
import { useWallet } from '../contexts/WalletContext';
import { WalletIcon, CheckCircle, Coins } from 'lucide-react';
import { TokenDisplay } from './TokenDisplay';

interface TicketGeneratorProps {
  onGenerateTicket: (numbers: string[]) => void;
  disabled: boolean;
  ticketCount: number;
  maxTickets: number;
  userTokens: number;
  tokensUsed?: number;
  queueStatus?: {
    isProcessing: boolean;
    queueLength: number;
    currentTicket: any;
    totalProcessed: number;
    errors: number;
  };
  rateLimitStatus?: {
    isBlocked: boolean;
    remainingTime: number;
  };
}

export const TicketGenerator: React.FC<TicketGeneratorProps> = ({
  onGenerateTicket,
  disabled,
  ticketCount,
  maxTickets,
  userTokens,
  tokensUsed = 0,
  queueStatus,
  rateLimitStatus
}) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<string[] | null>(null);
  const { user, isConnected, connect, isConnecting } = useWallet();

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
    console.log('[TicketGenerator] Current state - isConnected:', isConnected, 'user:', user, 'tokens:', userTokens);
    
    // Verificar rate limiting
    if (rateLimitStatus?.isBlocked) {
      console.warn('[TicketGenerator] Rate limited, remaining time:', rateLimitStatus.remainingTime);
      return;
    }
    
    // Verificar si hay tokens suficientes
    if (userTokens < 1) {
      console.log('[TicketGenerator] Insufficient tokens');
      return;
    }
    
    // Si no hay wallet conectada, mostrar prompt y guardar el ticket pendiente
    if (!isConnected || !user?.walletAddress) {
      console.log('[TicketGenerator] No wallet connected, showing prompt');
      setPendingTicket(numbers);
      setShowWalletPrompt(true);
      return;
    }
    
    // Si hay wallet y tokens, generar ticket
    console.log('[TicketGenerator] Wallet connected and tokens available, generating ticket');
    const result = await onGenerateTicket(numbers);
    
    // Solo limpiar si la generación fue exitosa
    if (!result || !result.error) {
      setSelectedEmojis([]); // Reset selection after generating ticket
      setPendingTicket(null);
      setShowWalletPrompt(false);
    }
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
    if (disabled || userTokens < 1) return;
    
    const newSelection = [...selectedEmojis, emoji];
    setSelectedEmojis(newSelection);
    
    // Ya no generamos automáticamente cuando llegamos a 4
    // El usuario debe hacer clic en el botón de confirmación
  };

  const handleEmojiDeselect = (index: number) => {
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  };

  const handleRandomGenerate = () => {
    if (disabled || userTokens < 1) return;
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

  const canGenerateTicket = userTokens >= 1 && !disabled && !rateLimitStatus?.isBlocked;
  const isOutOfTokens = userTokens === 0;
  const isRateLimited = rateLimitStatus?.isBlocked || false;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col gap-4">
        {/* Token Display */}
        <TokenDisplay 
          tokensAvailable={userTokens}
          tokensUsed={tokensUsed}
          totalDailyTokens={10}
        />

        {/* Queue Status */}
        {queueStatus && (queueStatus.isProcessing || queueStatus.queueLength > 0) && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-200">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                {queueStatus.isProcessing ? 'Procesando ticket...' : `${queueStatus.queueLength} tickets en cola`}
              </span>
            </div>
            {queueStatus.totalProcessed > 0 && (
              <div className="text-xs text-blue-300 mt-1">
                ✅ {queueStatus.totalProcessed} procesados
                {queueStatus.errors > 0 && ` • ❌ ${queueStatus.errors} errores`}
              </div>
            )}
          </div>
        )}

        {/* Rate Limit Warning */}
        {isRateLimited && rateLimitStatus && (
          <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-200">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-sm font-medium">
                Muy rápido! Espera {rateLimitStatus.remainingTime} segundos
              </span>
            </div>
            <div className="text-xs text-orange-300 mt-1">
              Espera 2 segundos entre tickets para evitar errores
            </div>
          </div>
        )}
        
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
            disabled={!canGenerateTicket}
            className={`w-full font-bold py-3 px-6 rounded-xl shadow-lg transform transition hover:scale-105 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
                     ${canGenerateTicket ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-500 text-gray-300'}`}
          >
            <CheckCircle size={20} />
            {isOutOfTokens ? 'No Tokens Available' : 
             isRateLimited ? `Espera ${rateLimitStatus?.remainingTime}s` :
             'Confirm Ticket (1 Token)'}
          </button>
        )}
        
        <button
          onClick={handleRandomGenerate}
          disabled={!canGenerateTicket}
          className={`w-full font-bold py-3 px-6 rounded-xl shadow-lg transform transition hover:scale-105 
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
                   ${canGenerateTicket ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-500 text-gray-300'}`}
        >
          <Coins size={20} />
          {isOutOfTokens ? 'No Tokens Available' : 
           isRateLimited ? `Espera ${rateLimitStatus?.remainingTime}s` :
           'Generate Random Ticket (1 Token)'}
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