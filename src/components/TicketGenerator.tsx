import React, { useState, useEffect } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { generateRandomEmojis } from '../utils/gameLogic';
import { useAccount, useConnect } from 'wagmi';
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
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();

  // Reset selected emojis when ticket count changes to 0
  useEffect(() => {
    if (ticketCount === 0) {
      setSelectedEmojis([]);
    }
  }, [ticketCount]);

  // Auto-hide wallet prompt when wallet gets connected
  useEffect(() => {
    if (isConnected && address && showWalletPrompt) {
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
  }, [isConnected, address, showWalletPrompt, pendingTicket, onGenerateTicket]);

  const handleGenerateTicket = async (numbers: string[]) => {
    console.log('=== TICKET GENERATOR START ===');
    console.log('[TicketGenerator] Attempting to generate ticket with numbers:', numbers);
    console.log('[TicketGenerator] Current state - isConnected:', isConnected, 'address:', address);
    console.log('[TicketGenerator] Chain ID:', chainId);
    console.log('[TicketGenerator] Disabled state:', disabled);
    
    // Check if wallet is connected and on correct network
    if (!isConnected || !address) {
      console.log('[TicketGenerator] ❌ No wallet connected, showing prompt');
      setPendingTicket(numbers);
      setShowWalletPrompt(true);
      return;
    }

    // Check if on supported network (Base Sepolia or Base Mainnet)
    if (chainId !== 84532 && chainId !== 8453) {
      console.log('[TicketGenerator] ❌ Wrong network:', chainId);
      alert('⚠️ Wrong Network!\n\nPlease switch to Base Sepolia (testnet) to play LottoMoji.\n\nYou can switch networks in your Coinbase Wallet settings.');
      return;
    }

    // Check if we have valid emojis
    if (!numbers || numbers.length !== 4) {
      console.log('[TicketGenerator] ❌ Invalid emoji selection:', numbers);
      alert('⚠️ Invalid Selection!\n\nPlease select exactly 4 emojis to create your ticket.');
      return;
    }
    
    try {
      console.log('[TicketGenerator] ✅ All checks passed, calling onGenerateTicket...');
      console.log('[TicketGenerator] Numbers to generate:', numbers);
      
      // Si hay wallet, generar ticket
      console.log('[TicketGenerator] Wallet connected, generating ticket');
      await onGenerateTicket(numbers);
      
      console.log('[TicketGenerator] ✅ Ticket generation successful!');
      setSelectedEmojis([]); // Reset selection after generating ticket
      setPendingTicket(null);
      setShowWalletPrompt(false);
      
    } catch (error: any) {
      console.error('=== TICKET GENERATOR ERROR ===');
      console.error('[TicketGenerator] Error type:', typeof error);
      console.error('[TicketGenerator] Error message:', error.message);
      console.error('[TicketGenerator] Error stack:', error.stack);
      console.error('[TicketGenerator] Full error object:', error);
      
      // Mostrar mensaje de error más amigable
      let errorMessage = 'Failed to generate ticket. Please try again.';
      
      if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient ETH')) {
        errorMessage = '💰 Insufficient Funds!\n\nYou need more ETH to buy a ticket. Please add funds to your wallet.';
      } else if (error.message?.includes('user rejected') || error.message?.includes('rejected')) {
        errorMessage = '❌ Transaction Cancelled\n\nYou cancelled the transaction. Try again when ready!';
      } else if (error.message?.includes('switch to Base Sepolia') || error.message?.includes('network')) {
        errorMessage = '🔄 Wrong Network!\n\nPlease switch to Base Sepolia network in your wallet to play LottoMoji.';
      } else if (error.message?.includes('execution reverted') || error.message?.includes('contract')) {
        errorMessage = '⚠️ Smart Contract Error!\n\nThe game contract rejected your transaction. Please check if the game is active and try again.';
      } else if (error.message?.includes('Wallet not connected')) {
        errorMessage = '🔐 Wallet Not Connected!\n\nPlease connect your Coinbase Wallet first.';
      } else if (error.message?.includes('gas')) {
        errorMessage = '⛽ Gas Error!\n\nTransaction failed due to gas issues. Please try again with more ETH for gas.';
      } else if (error.message && error.message !== 'Failed to generate ticket. Please try again.') {
        // Si tenemos un mensaje específico, úsalo
        errorMessage = `🚫 Error: ${error.message}`;
      }
      
      console.log('[TicketGenerator] Showing error to user:', errorMessage);
      alert(errorMessage);
    }
  };

  const handleWalletConnect = async () => {
    console.log('[TicketGenerator] Connecting Coinbase Wallet...');
    try {
      const coinbaseConnector = connectors.find(c => c.name === 'Coinbase Wallet');
      if (coinbaseConnector) {
        connect({ connector: coinbaseConnector });
      } else {
        alert('Please install Coinbase Wallet extension to play LottoMoji');
      }
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
          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 text-center">
            <WalletIcon className="mx-auto mb-2" size={32} />
            <div className="font-medium text-white">Coinbase Wallet Extension Required</div>
            <div className="text-blue-200 text-sm mt-1">
              You need to install and connect Coinbase Wallet browser extension to play LottoMoji
            </div>
            <div className="text-blue-200 text-xs mt-2">
              📌 Make sure to use the browser extension, not the mobile app or Smart Wallet
            </div>
            {pendingTicket && (
              <div className="text-blue-200 text-sm mt-2">
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Extension'}
              </button>
            </div>
          </div>
        )}

        {/* Debug info (only in development) */}
        {import.meta.env.DEV && (
          <div className="bg-black/20 p-2 rounded text-xs text-white/60 font-mono">
            <div>Connected: {isConnected ? 'YES' : 'NO'}</div>
            <div>Address: {address ? `${address.substring(0, 8)}...` : 'None'}</div>
            <div>Chain ID: {chainId || 'Unknown'}</div>
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