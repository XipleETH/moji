import React, { useState, useEffect } from 'react';
import { getEmojis, loadEmojisFromContract } from '../utils/emojiManager';
import { GAME_CONFIG } from '../utils/contractAddresses';
import { formatUnits } from 'viem';
import { CheckCircle, Coins, X, Dice1 } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useBlockchainTickets } from '../hooks/useBlockchainTickets';

// Debug system
const createDebugLogger = () => {
  const logs: string[] = [];
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    logs.push(logMessage);
    console.log(`🔍 [BlockchainTicketGenerator] ${logMessage}`);
    
    // Mantener solo los últimos 50 logs
    if (logs.length > 50) {
      logs.splice(0, logs.length - 50);
    }
  };
  
  const getLogs = () => logs.slice();
  const clearLogs = () => {
    logs.length = 0;
    console.log('🧹 Debug logs cleared');
  };
  
  return { log, getLogs, clearLogs };
};

const debugLogger = createDebugLogger();

// Hacer disponible globalmente para debug en consola
if (typeof window !== 'undefined') {
  (window as any).blockchainTicketDebug = {
    getLogs: debugLogger.getLogs,
    clearLogs: debugLogger.clearLogs,
    enableVerbose: () => {
      (window as any).verboseBlockchainDebug = true;
      console.log('🔊 Verbose blockchain debug enabled');
    },
    disableVerbose: () => {
      (window as any).verboseBlockchainDebug = false;
      console.log('🔇 Verbose blockchain debug disabled');
    }
  };
}

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
  
  const { user, isConnected } = useWallet();
  const {
    userData,
    purchaseState,
    buyTicket,
    resetPurchaseState,
    refreshData
  } = useBlockchainTickets();
  
  const [emojis, setEmojis] = useState<string[]>(getEmojis());
  const [emojisLoading, setEmojisLoading] = useState(false);
  const [emojisError, setEmojisError] = useState<string | null>(null);

  // Debug states
  useEffect(() => {
    debugLogger.log(`Component mounted - isConnected: ${isConnected}, user: ${!!user}`);
  }, []);

  useEffect(() => {
    debugLogger.log(`State change - isGeneratingRandom: ${isGeneratingRandom}, isConfirmingTicket: ${isConfirmingTicket}, purchaseState.step: ${purchaseState.step}, purchaseState.isLoading: ${purchaseState.isLoading}`);
  }, [isGeneratingRandom, isConfirmingTicket, purchaseState.step, purchaseState.isLoading]);

  // Load emojis from contract on mount
  useEffect(() => {
    const updateEmojis = async () => {
      debugLogger.log('Loading emojis from contract...');
      setEmojisLoading(true);
      setEmojisError(null);
      try {
        const contractEmojis = await loadEmojisFromContract();
        setEmojis(contractEmojis);
        debugLogger.log(`Emojis loaded successfully: ${contractEmojis.length} emojis`);
      } catch (error: any) {
        console.error('Error loading emojis:', error);
        setEmojisError(error.message || 'Error loading contract emojis');
        setEmojis(getEmojis()); // Fallback
        debugLogger.log(`Error loading emojis: ${error.message}`);
      } finally {
        setEmojisLoading(false);
      }
    };

    updateEmojis();
  }, []);

  useEffect(() => {
    debugLogger.log(`Purchase state change - step: ${purchaseState.step}, txHash: ${purchaseState.txHash}, error: ${purchaseState.error}`);
    
    if (purchaseState.step === 'success' && purchaseState.txHash) {
      debugLogger.log('Purchase successful, starting post-purchase process...');
      
      // Usar try-catch para todo el proceso post-compra
      const handlePostPurchase = async () => {
        try {
          if (onTicketPurchased) {
            debugLogger.log('Calling onTicketPurchased callback...');
            await onTicketPurchased(purchaseState.txHash);
            debugLogger.log('onTicketPurchased callback completed');
          }
          
          debugLogger.log('Clearing selected emojis...');
          setSelectedEmojis([]);
          
          // Resetear estados de botones cuando la compra es exitosa
          debugLogger.log('Resetting button states...');
          setIsGeneratingRandom(false);
          setIsConfirmingTicket(false);
          
        } catch (error) {
          debugLogger.log(`Error in post-purchase process: ${error}`);
          console.error('Error in post-purchase process:', error);
        }
      };
      
      // Ejecutar inmediatamente
      handlePostPurchase();
      
      // Programar refreshes con manejo de errores individual
      const scheduleRefresh = (delay: number, label: string) => {
        setTimeout(async () => {
          try {
            debugLogger.log(`Executing ${label}...`);
            await refreshData();
            debugLogger.log(`${label} completed`);
          } catch (error) {
            debugLogger.log(`Error in ${label}: ${error}`);
            console.error(`Error in ${label}:`, error);
          }
        }, delay);
      };
      
      // Programar reset con manejo de errores
      const scheduleReset = (delay: number) => {
        setTimeout(() => {
          try {
            debugLogger.log('Executing purchase state reset...');
            resetPurchaseState();
            debugLogger.log('Purchase state reset completed');
          } catch (error) {
            debugLogger.log(`Error in purchase state reset: ${error}`);
            console.error('Error in purchase state reset:', error);
          }
        }, delay);
      };
      
      scheduleRefresh(1000, 'first refresh');
      scheduleRefresh(3000, 'second refresh');
      scheduleReset(5000);
    }
  }, [purchaseState.step, purchaseState.txHash]); // Removemos dependencias que pueden causar loops

  // Resetear estados de botones cuando hay errores
  useEffect(() => {
    if (purchaseState.error) {
      debugLogger.log(`Purchase error detected: ${purchaseState.error}`);
      setIsGeneratingRandom(false);
      setIsConfirmingTicket(false);
    }
  }, [purchaseState.error]);

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
    debugLogger.log('generateRandomTicket called');
    debugLogger.log(`Conditions check - canBuyTicket: ${userData.canBuyTicket}, isLoading: ${purchaseState.isLoading}, emojis: ${emojis?.length}, isGeneratingRandom: ${isGeneratingRandom}`);
    
    if (!userData.canBuyTicket || purchaseState.isLoading || !emojis || emojis.length === 0 || isGeneratingRandom) {
      debugLogger.log('generateRandomTicket aborted - conditions not met');
      return;
    }
    
    debugLogger.log('Starting random ticket generation...');
    setIsGeneratingRandom(true);
    
    try {
      const shuffled = [...emojis].sort(() => 0.5 - Math.random());
      const randomEmojis = shuffled.slice(0, 4);
      debugLogger.log(`Random emojis selected: ${randomEmojis.join(', ')}`);
      
      debugLogger.log('Calling buyTicket...');
      await buyTicket(randomEmojis);
      debugLogger.log('buyTicket call completed');
    } catch (error) {
      debugLogger.log(`Error in generateRandomTicket: ${error}`);
      console.error('Error buying random ticket:', error);
      // Si hay error, resetear inmediatamente
      setIsGeneratingRandom(false);
    }
    
    // Timeout de respaldo para asegurar que el estado se resetee
    debugLogger.log('Setting safety timeout for random ticket generation...');
    setTimeout(() => {
      debugLogger.log('Safety timeout triggered for random ticket generation');
      setIsGeneratingRandom(false);
    }, 10000);
  };

  const handleConfirmSelectedTicket = async () => {
    debugLogger.log('handleConfirmSelectedTicket called');
    debugLogger.log(`Conditions check - selectedEmojis: ${selectedEmojis.length}, isConfirmingTicket: ${isConfirmingTicket}, canBuyTicket: ${userData.canBuyTicket}, isLoading: ${purchaseState.isLoading}`);
    
    if (selectedEmojis.length !== 4 || isConfirmingTicket || !userData.canBuyTicket || purchaseState.isLoading) {
      debugLogger.log('handleConfirmSelectedTicket aborted - conditions not met');
      return;
    }
    
    debugLogger.log('Starting selected ticket confirmation...');
    setIsConfirmingTicket(true);
    
    try {
      debugLogger.log(`Selected emojis: ${selectedEmojis.join(', ')}`);
      debugLogger.log('Calling buyTicket...');
      await buyTicket(selectedEmojis);
      debugLogger.log('buyTicket call completed');
    } catch (error) {
      debugLogger.log(`Error in handleConfirmSelectedTicket: ${error}`);
      console.error('Error buying selected ticket:', error);
      // Si hay error, resetear inmediatamente
      setIsConfirmingTicket(false);
    }
    
    // Timeout de respaldo para asegurar que el estado se resetee
    debugLogger.log('Setting safety timeout for selected ticket confirmation...');
    setTimeout(() => {
      debugLogger.log('Safety timeout triggered for selected ticket confirmation');
      setIsConfirmingTicket(false);
    }, 10000);
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

  const canBuyTicket = userData.canBuyTicket && !purchaseState.isLoading && isConnected && user;
  const isAnyButtonProcessing = isGeneratingRandom || isConfirmingTicket || purchaseState.isLoading;

  if (!isConnected || !user) {
    return (
      <div className={`bg-red-900/50 rounded-lg p-6 text-white text-center ${className}`}>
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-bold mb-2">Connect Your Wallet</h3>
        <p className="text-red-300">You need to connect your wallet to buy tickets</p>
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
          
          {/* Allowance info */}
          {userData.usdcAllowance < userData.ticketPrice && (
            <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
              <div className="text-yellow-300 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>First purchase requires USDC approval</span>
              </div>
            </div>
          )}
          
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
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                View transaction
              </a>
            )}
          </div>
        )}

        {/* Selection Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white">
            Select 4 emojis ({selectedEmojis.length}/4)
          </h4>
          <button
            onClick={generateRandomTicket}
            disabled={!canBuyTicket || isAnyButtonProcessing}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
              ${canBuyTicket && !isAnyButtonProcessing
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Dice1 size={18} className={isGeneratingRandom ? 'animate-spin' : ''} />
            {isGeneratingRandom ? 'Generating...' : '🎲 Random'}
          </button>
        </div>

        {/* Selected Emojis */}
        {selectedEmojis.length > 0 && (
          <div className="bg-black/20 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              {selectedEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiDeselect(index)}
                  className="relative group bg-white/10 hover:bg-red-500/20 rounded-lg p-3 transition-colors"
                  disabled={purchaseState.isLoading}
                >
                  <span className="text-3xl">{emoji}</span>
                  <X 
                    size={16} 
                    className="absolute -top-1 -right-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 rounded-full p-0.5"
                  />
                </button>
              ))}
              {Array.from({ length: 4 - selectedEmojis.length }).map((_, index) => (
                <div key={`empty-${index}`} className="bg-white/5 border-2 border-dashed border-white/20 rounded-lg w-14 h-14 flex items-center justify-center">
                  <span className="text-white/40 text-xl">?</span>
                </div>
              ))}
            </div>
            
                          {selectedEmojis.length === 4 && (
                <button
                  onClick={handleConfirmSelectedTicket}
                  disabled={!canBuyTicket || isConfirmingTicket}
                className={`
                  w-full py-3 px-4 rounded-lg font-bold transition-all
                  ${canBuyTicket && !isConfirmingTicket
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isConfirmingTicket ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Confirming...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle size={20} />
                    Buy Ticket • {formatUSDC(userData.ticketPrice)} USDC
                  </div>
                )}
              </button>
            )}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="bg-white/5 rounded-lg p-4">
          {emojisLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-white/70">Loading emojis from contract...</p>
            </div>
          ) : emojisError ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-2">⚠️ {emojisError}</p>
              <p className="text-white/70 text-sm">Using fallback emojis</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiSelect(emoji)}
                  disabled={selectedEmojis.length >= 4 || !canBuyTicket || purchaseState.isLoading}
                  className={`
                    aspect-square bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-all text-2xl
                    ${selectedEmojis.includes(emoji) 
                      ? 'bg-purple-500/30 border-2 border-purple-400' 
                      : 'border border-white/20'
                    }
                    ${!canBuyTicket || purchaseState.isLoading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-110 active:scale-95'
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockchainTicketGenerator; 