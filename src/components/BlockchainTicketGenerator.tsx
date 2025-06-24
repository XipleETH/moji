import React, { useState, useEffect } from 'react';
import { useBlockchainTickets } from '../hooks/useBlockchainTickets';
import { getEmojis, loadEmojisFromContract } from '../utils/emojiManager';
import { GAME_CONFIG } from '../utils/contractAddresses';
import { formatUnits } from 'viem';
import { CheckCircle, Coins, X, Dice1 } from 'lucide-react';

interface BlockchainTicketGeneratorProps {
  onTicketPurchased?: (txHash: string) => void;
  className?: string;
}

export const BlockchainTicketGenerator: React.FC<BlockchainTicketGeneratorProps> = ({
  onTicketPurchased,
  className = ''
}) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [isConfirmingTicket, setIsConfirmingTicket] = useState(false);
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false);
  
  const {
    userData,
    userAddress,
    purchaseState,
    buyTicket,
    resetPurchaseState
  } = useBlockchainTickets();
  
  const [emojis, setEmojis] = useState<string[]>(getEmojis());
  const [emojisLoading, setEmojisLoading] = useState(false);
  const [emojisError, setEmojisError] = useState<string | null>(null);

  // Load emojis from contract on mount
  useEffect(() => {
    const updateEmojis = async () => {
      setEmojisLoading(true);
      setEmojisError(null);
      try {
        const contractEmojis = await loadEmojisFromContract();
        setEmojis(contractEmojis);
      } catch (error: any) {
        console.error('Error loading emojis:', error);
        setEmojisError(error.message || 'Error loading contract emojis');
        setEmojis(getEmojis()); // Fallback
      } finally {
        setEmojisLoading(false);
      }
    };

    updateEmojis();
  }, []);

  useEffect(() => {
    if (purchaseState.step === 'success' && purchaseState.txHash) {
      if (onTicketPurchased) {
        onTicketPurchased(purchaseState.txHash);
      }
      setSelectedEmojis([]);
      setTimeout(() => {
        resetPurchaseState();
      }, 3000);
    }
  }, [purchaseState.step, purchaseState.txHash]);

  const handleEmojiSelect = (emoji: string) => {
    if (purchaseState.isLoading || selectedEmojis.length >= 4 || !userData.canBuyTicket) return;
    
    const newSelection = [...selectedEmojis, emoji];
    setSelectedEmojis(newSelection);
  };

  const handleEmojiDeselect = (index: number) => {
    if (purchaseState.isLoading) return;
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  };

  const generateRandomTicket = async () => {
    if (!userData.canBuyTicket || purchaseState.isLoading || !emojis || emojis.length === 0) return;
    
    setIsGeneratingRandom(true);
    
    try {
      const shuffled = [...emojis].sort(() => 0.5 - Math.random());
      const randomEmojis = shuffled.slice(0, 4);
      await buyTicket(randomEmojis);
    } catch (error) {
      console.error('Error buying random ticket:', error);
    } finally {
      setTimeout(() => {
        setIsGeneratingRandom(false);
      }, 500);
    }
  };

  const handleConfirmSelectedTicket = async () => {
    if (selectedEmojis.length !== 4 || isConfirmingTicket || !userData.canBuyTicket) return;
    
    setIsConfirmingTicket(true);
    
    try {
      await buyTicket(selectedEmojis);
    } catch (error) {
      console.error('Error buying selected ticket:', error);
    } finally {
      setTimeout(() => {
        setIsConfirmingTicket(false);
        setSelectedEmojis([]);
      }, 500);
    }
  };

  const getStepMessage = () => {
    switch (purchaseState.step) {
      case 'checking-balance': return '🔍 Checking balance...';
      case 'approving': return '📝 Approving USDC...';
      case 'buying': return '🎫 Buying ticket...';
      case 'confirming': return '⏳ Confirming...';
      case 'success': return '✅ Success!';
      default: return '';
    }
  };

  const formatUSDC = (amount: bigint) => formatUnits(amount, 6);

  const canBuyTicket = userData.canBuyTicket && !purchaseState.isLoading && userAddress;
  const isAnyButtonProcessing = isGeneratingRandom || isConfirmingTicket || purchaseState.isLoading;

  if (!userAddress) {
    return (
      <div className={`bg-red-900/50 rounded-lg p-6 text-white text-center ${className}`}>
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-bold mb-2">Connect Your Wallet</h3>
        <p className="text-red-300">You need a Coinbase Wallet to buy tickets</p>
      </div>
    );
  }

  return (
    <div className={`mb-8 space-y-4 ${className}`}>
      <div className="flex flex-col gap-4">
        {/* Header with balance and ticket info */}
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🎫</span>
              <div>
                <h3 className="text-xl font-bold text-white">Buy Ticket</h3>
                <div className="text-sm text-gray-300">
                  💰 {formatUSDC(userData.ticketPrice)} USDC
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-400">
                {formatUSDC(userData.usdcBalance)}
              </div>
              <div className="text-sm text-gray-300">USDC</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="text-blue-300">Next Draw</div>
              <div className="text-white font-medium">
                {userData.timeUntilNextDraw > 0n ? 
                  new Date(Number(userData.timeUntilNextDraw) * 1000).toLocaleTimeString() : 
                  'Draw in progress'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-blue-300">Your Tickets</div>
              <div className="text-white font-bold text-center">{userData.ticketsOwned.toString()}</div>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        {purchaseState.isLoading && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-200">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">{getStepMessage()}</span>
            </div>
          </div>
        )}

        {/* Error Status */}
        {purchaseState.error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
            <div className="text-red-300">❌ {purchaseState.error}</div>
          </div>
        )}

        {/* Success Status */}
        {purchaseState.step === 'success' && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-3">
            <div className="text-green-300">✅ Ticket purchased!</div>
            {purchaseState.txHash && (
              <a 
                href={`https://sepolia.basescan.org/tx/${purchaseState.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-300 hover:text-blue-200 mt-2 block"
              >
                View on BaseScan 🔍
              </a>
            )}
          </div>
        )}

        {/* Emoji Selection Grid */}
        <div className="p-4 bg-white/80 rounded-xl backdrop-blur-sm shadow-lg">
          <div className="mb-3 text-center text-gray-700">
            Select 4 emojis ({selectedEmojis.length}/4)
          </div>
          
          {/* Random button */}
          <div className="flex justify-end mb-3">
            <button
              onClick={generateRandomTicket}
              disabled={!canBuyTicket || isAnyButtonProcessing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${isGeneratingRandom 
                  ? 'bg-purple-600 scale-95 shadow-2xl animate-pulse ring-4 ring-purple-400/50 text-white' 
                  : canBuyTicket && !isAnyButtonProcessing
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white hover:scale-105'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                }`}
            >
              <Dice1 size={16} className={isGeneratingRandom ? 'animate-spin' : ''} />
              🎲 Random
            </button>
          </div>
          
          {/* Selected emojis display */}
          <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-white/50 rounded-lg">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="relative">
                <div className="aspect-square bg-white/70 rounded-lg flex items-center justify-center text-xl border-2 border-dashed border-gray-300">
                  {selectedEmojis[i] || '?'}
                </div>
                {selectedEmojis[i] && (
                  <button
                    onClick={() => handleEmojiDeselect(i)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 
                             text-white hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Emoji grid */}
          {emojisLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              <div className="text-sm text-gray-600 mt-2">Loading contract emojis...</div>
            </div>
          ) : emojisError ? (
            <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-3 mb-4">
              <div className="text-orange-700 text-sm">
                ⚠️ {emojisError}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`
                    text-2xl p-2 rounded-lg transition-all duration-200
                    ${canBuyTicket && !isAnyButtonProcessing && selectedEmojis.length < 4
                      ? 'bg-white/50 hover:bg-white shadow hover:scale-105'
                      : 'opacity-50 cursor-not-allowed'}
                  `}
                  disabled={!canBuyTicket || isAnyButtonProcessing || selectedEmojis.length >= 4}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Selected Ticket Button */}
        {(selectedEmojis.length === 4 || isConfirmingTicket) && (
          <button
            onClick={handleConfirmSelectedTicket}
            disabled={!canBuyTicket || isAnyButtonProcessing || selectedEmojis.length !== 4}
            className={`w-full font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-300 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
                     ${isConfirmingTicket 
                       ? 'bg-green-600 scale-95 shadow-2xl animate-pulse ring-4 ring-green-400/50 text-white' 
                       : canBuyTicket && selectedEmojis.length === 4
                         ? 'bg-green-500 hover:bg-green-600 hover:scale-105 hover:shadow-xl active:scale-95 text-white' 
                         : 'bg-gray-500 text-gray-300'
                     }`}
          >
            <CheckCircle size={20} className={isConfirmingTicket ? 'animate-spin' : ''} />
            {isConfirmingTicket ? 'Processing ticket...' :
             !userData.canBuyTicket ? 'Insufficient USDC' :
             selectedEmojis.length !== 4 ? `Select ${4 - selectedEmojis.length} more` :
             'Confirm Ticket (2 USDC)'}
          </button>
        )}

        {/* Status messages */}
        <div className="text-center space-y-2">
          <div className="text-white/80">
            Tickets owned: {userData.ticketsOwned.toString()}
          </div>
          
          <div className="text-white/70 text-sm">
            {selectedEmojis.length === 0 && "Select 4 emojis to create a custom ticket"}
            {selectedEmojis.length > 0 && selectedEmojis.length < 4 && `Select ${4 - selectedEmojis.length} more emoji${4 - selectedEmojis.length !== 1 ? 's' : ''}`}
            {selectedEmojis.length === 4 && "Ready! Click 'Confirm Ticket' to buy your ticket"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainTicketGenerator; 