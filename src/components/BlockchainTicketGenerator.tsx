import React, { useState, useEffect } from 'react';
import { getEmojis, loadEmojisFromContract } from '../utils/emojiManager';
import { GAME_CONFIG } from '../utils/contractAddresses';
import { formatUnits } from 'viem';
import { CheckCircle, Coins, X, Dice1, Package, Zap } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useBlockchainTickets } from '../hooks/useBlockchainTickets';

// Debug system ultra-simplificado
if (typeof window !== 'undefined') {
  (window as any).btgDebug = () => {
    console.log('🔍 BlockchainTicketGenerator Debug Available');
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
  
  // Bulk purchase state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [customBulkCount, setCustomBulkCount] = useState('');
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, failed: 0 });
  
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

  // Bulk generation functions (definidas antes de los useEffect)
  const generateNextBulkTicket = async () => {
    if (!userData.canBuyTicket || !emojis || emojis.length === 0) {
      console.error('[BTG] Cannot generate bulk ticket - conditions not met');
      return;
    }
    
    try {
      const shuffled = [...emojis].sort(() => 0.5 - Math.random());
      const randomEmojis = shuffled.slice(0, 4);
      
      console.log(`[BTG] Generating bulk ticket ${bulkProgress.current + 1}/${bulkProgress.total}`);
      await buyTicket(randomEmojis);
    } catch (error) {
      console.error('Error buying bulk ticket:', error);
    }
  };

  const finishBulkGeneration = () => {
    console.log('[BTG] Bulk generation finished:', bulkProgress);
    setIsBulkGenerating(false);
    setBulkProgress({ current: 0, total: 0, failed: 0 });
    resetPurchaseState();
  };

  // Load emojis from contract on mount
  useEffect(() => {
    const updateEmojis = async () => {
      console.log('[BTG] Loading emojis...');
      setEmojisLoading(true);
      setEmojisError(null);
      try {
        const contractEmojis = await loadEmojisFromContract();
        setEmojis(contractEmojis);
        console.log('[BTG] Emojis loaded:', contractEmojis.length);
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

  // Manejo ultra-simple del éxito
  useEffect(() => {
    if (purchaseState.step === 'success' && purchaseState.txHash) {
      console.log('[BTG] Purchase successful, doing cleanup...');
      
      // Callback simple
      if (onTicketPurchased) {
        try {
          onTicketPurchased(purchaseState.txHash);
        } catch (error) {
          console.error('[BTG] Error in callback:', error);
        }
      }
      
      // Si estamos en modo bulk, actualizar progreso
      if (isBulkGenerating && bulkProgress.current < bulkProgress.total) {
        setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        
        // Si no hemos terminado, continuar con el siguiente ticket
        if (bulkProgress.current + 1 < bulkProgress.total) {
          // Reset purchase state y continuar
          setTimeout(() => {
            resetPurchaseState();
            generateNextBulkTicket();
          }, 1000);
          return;
        } else {
          // Bulk terminado
          setTimeout(() => {
            finishBulkGeneration();
          }, 2000);
          return;
        }
      }
      
      // Cleanup normal para tickets individuales
      setSelectedEmojis([]);
      setIsGeneratingRandom(false);
      setIsConfirmingTicket(false);
      
      // Reset después de un delay sin más refreshes
      setTimeout(() => {
        console.log('[BTG] Resetting purchase state...');
        resetPurchaseState();
      }, 2000);
    }
  }, [purchaseState.step, purchaseState.txHash, isBulkGenerating, bulkProgress]);

  // Reset en errores
  useEffect(() => {
    if (purchaseState.error) {
      console.log('[BTG] Error detected, resetting...');
      
      if (isBulkGenerating) {
        setBulkProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
        
        // Continuar con siguiente ticket si no hemos terminado
        if (bulkProgress.current + bulkProgress.failed < bulkProgress.total) {
          setTimeout(() => {
            resetPurchaseState();
            generateNextBulkTicket();
          }, 2000);
          return;
        } else {
          // Bulk terminado con errores
          setTimeout(() => {
            finishBulkGeneration();
          }, 2000);
          return;
        }
      }
      
      setIsGeneratingRandom(false);
      setIsConfirmingTicket(false);
    }
  }, [purchaseState.error, isBulkGenerating, bulkProgress]);

  const handleBulkGenerate = async (count: number) => {
    if (!userData.canBuyTicket || purchaseState.isLoading || !emojis || emojis.length === 0 || isBulkGenerating) {
      return;
    }

    console.log(`[BTG] Starting bulk generation of ${count} tickets`);
    setIsBulkGenerating(true);
    setBulkProgress({ current: 0, total: count, failed: 0 });
    
    // Generar primer ticket
    generateNextBulkTicket();
  };

  const handleEmojiSelect = (emoji: string) => {
    if (purchaseState.isLoading || selectedEmojis.length >= 4 || !userData.canBuyTicket || isBulkGenerating) return;
    
    const newSelection = [...selectedEmojis, emoji];
    setSelectedEmojis(newSelection);
  };

  const handleEmojiDeselect = (index: number) => {
    if (purchaseState.isLoading || isBulkGenerating) return;
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  };

  const generateRandomTicket = async () => {
    if (!userData.canBuyTicket || purchaseState.isLoading || !emojis || emojis.length === 0 || isGeneratingRandom || isBulkGenerating) {
      return;
    }
    
    setIsGeneratingRandom(true);
    
    try {
      const shuffled = [...emojis].sort(() => 0.5 - Math.random());
      const randomEmojis = shuffled.slice(0, 4);
      
      await buyTicket(randomEmojis);
    } catch (error) {
      console.error('Error buying random ticket:', error);
      setIsGeneratingRandom(false);
    }
    
    setTimeout(() => {
      setIsGeneratingRandom(false);
    }, 10000);
  };

  const handleConfirmSelectedTicket = async () => {
    if (selectedEmojis.length !== 4 || isConfirmingTicket || !userData.canBuyTicket || purchaseState.isLoading || isBulkGenerating) {
      return;
    }
    
    setIsConfirmingTicket(true);
    
    try {
      await buyTicket(selectedEmojis);
    } catch (error) {
      console.error('Error buying selected ticket:', error);
      setIsConfirmingTicket(false);
    }
    
    setTimeout(() => {
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

  const canBuyTicket = userData.canBuyTicket && !purchaseState.isLoading && isConnected && user && !isBulkGenerating;
  const isAnyButtonProcessing = isGeneratingRandom || isConfirmingTicket || purchaseState.isLoading || isBulkGenerating;

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

        {/* Mode Toggle */}
        <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBulkMode(false)}
              disabled={isAnyButtonProcessing}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${!isBulkMode ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}
              `}
            >
              Single Ticket
            </button>
            <button
              onClick={() => setIsBulkMode(true)}
              disabled={isAnyButtonProcessing}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                ${isBulkMode ? 'bg-purple-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}
              `}
            >
              <Package size={16} />
              Bulk Purchase
            </button>
          </div>
          
          {!isBulkMode && (
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
          )}
        </div>

        {/* Bulk Purchase Interface */}
        {isBulkMode && (
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={20} className="text-yellow-400" />
              Bulk Random Tickets - Testing Mode
            </h4>
            
            {isBulkGenerating && (
              <div className="mb-4 bg-blue-500/20 border border-blue-500 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-200 font-medium">Generating Tickets...</span>
                  <span className="text-white font-bold">
                    {bulkProgress.current}/{bulkProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-300">
                  {bulkProgress.failed > 0 && (
                    <span className="text-red-400">⚠️ {bulkProgress.failed} failed • </span>
                  )}
                  Est. time: ~{Math.ceil((bulkProgress.total - bulkProgress.current) * 3)}s
                </div>
              </div>
            )}
            
            {!isBulkGenerating && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[5, 10, 25, 50].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleBulkGenerate(count)}
                      disabled={!canBuyTicket}
                      className={`
                        py-3 px-4 rounded-lg font-bold transition-all text-center
                        ${canBuyTicket
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      <div className="text-lg">{count}</div>
                      <div className="text-xs opacity-80">
                        {formatUSDC(userData.ticketPrice * BigInt(count))} USDC
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customBulkCount}
                    onChange={(e) => setCustomBulkCount(e.target.value)}
                    placeholder="Custom amount"
                    min="1"
                    max="100"
                    disabled={!canBuyTicket}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      const count = parseInt(customBulkCount);
                      if (count > 0 && count <= 100) {
                        handleBulkGenerate(count);
                        setCustomBulkCount('');
                      }
                    }}
                    disabled={!canBuyTicket || !customBulkCount || parseInt(customBulkCount) <= 0 || parseInt(customBulkCount) > 100}
                    className={`
                      px-6 py-2 rounded-lg font-medium transition-all
                      ${canBuyTicket && customBulkCount && parseInt(customBulkCount) > 0 && parseInt(customBulkCount) <= 100
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    Generate
                  </button>
                </div>
                
                <div className="mt-3 text-xs text-gray-400 text-center">
                  💡 Perfect for testing! Each ticket is randomly generated. Max 100 per batch.
                </div>
              </>
            )}
          </div>
        )}

        {/* Single Ticket Selection */}
        {!isBulkMode && (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">
                Select 4 emojis ({selectedEmojis.length}/4)
              </h4>
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
          </>
        )}
      </div>
    </div>
  );
};

export default BlockchainTicketGenerator; 