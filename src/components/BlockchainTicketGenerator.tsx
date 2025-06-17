import React, { useState, useEffect } from 'react';
import { useBlockchainTickets } from '../hooks/useBlockchainTickets';
import { getEmojis, loadEmojisFromContract } from '../utils/emojiManager';
import { GAME_CONFIG } from '../utils/contractAddresses';

interface BlockchainTicketGeneratorProps {
  onTicketPurchased?: (txHash: string) => void;
  className?: string;
}

export const BlockchainTicketGenerator: React.FC<BlockchainTicketGeneratorProps> = ({
  onTicketPurchased,
  className = ''
}) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const {
    userData,
    userAddress,
    purchaseState,
    buyTicket,
    resetPurchaseState,
    formatUSDC
  } = useBlockchainTickets();
  
  const [emojis, setEmojis] = useState<string[]>(getEmojis());
  const [emojisLoading, setEmojisLoading] = useState(false);
  const [emojisError, setEmojisError] = useState<string | null>(null);

  // Cargar emojis del contrato al montar el componente
  useEffect(() => {
    const updateEmojis = async () => {
      setEmojisLoading(true);
      setEmojisError(null);
      try {
        const contractEmojis = await loadEmojisFromContract();
        setEmojis(contractEmojis);
      } catch (error: any) {
        console.error('Error cargando emojis:', error);
        setEmojisError(error.message || 'Error cargando emojis del contrato');
        setEmojis(getEmojis()); // Fallback
      } finally {
        setEmojisLoading(false);
      }
    };

    updateEmojis();
  }, []);

  const refreshEmojis = async () => {
    setEmojisLoading(true);
    setEmojisError(null);
    try {
      const contractEmojis = await loadEmojisFromContract();
      setEmojis(contractEmojis);
    } catch (error: any) {
      setEmojisError(error.message || 'Error cargando emojis del contrato');
      setEmojis(getEmojis());
    } finally {
      setEmojisLoading(false);
    }
  };

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

  const selectEmoji = (emoji: string) => {
    if (selectedEmojis.includes(emoji)) {
      setSelectedEmojis(prev => prev.filter(e => e !== emoji));
    } else if (selectedEmojis.length < 4) {
      setSelectedEmojis(prev => [...prev, emoji]);
    }
  };

  const generateRandomTicket = () => {
    if (!emojis || !Array.isArray(emojis) || emojis.length === 0) {
      console.error('No hay emojis disponibles para seleccionar');
      return;
    }
    const shuffled = [...emojis].sort(() => 0.5 - Math.random());
    setSelectedEmojis(shuffled.slice(0, 4));
  };

  const handleBuyTicket = async () => {
    if (selectedEmojis.length !== 4) return;
    try {
      await buyTicket(selectedEmojis);
    } catch (error) {
      console.error('Error comprando ticket:', error);
    }
  };

  const getStepMessage = () => {
    switch (purchaseState.step) {
      case 'checking-balance': return '🔍 Verificando saldo...';
      case 'approving': return '📝 Aprobando USDC...';
      case 'buying': return '🎫 Comprando ticket...';
      case 'confirming': return '⏳ Confirmando...';
      case 'success': return '✅ ¡Éxito!';
      default: return '';
    }
  };

  const canBuyTicket = selectedEmojis.length === 4 && 
                      userData.canBuyTicket && 
                      !purchaseState.isLoading && 
                      userAddress;

  if (!userAddress) {
    return (
      <div className={`bg-red-900/50 rounded-lg p-6 text-white text-center ${className}`}>
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-bold mb-2">Conecta tu Wallet</h3>
        <p className="text-red-300">Necesitas Coinbase Wallet para comprar tickets</p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg p-6 text-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🎫</span>
          <div>
            <h3 className="text-xl font-bold">Comprar Ticket</h3>
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

      {/* Estados */}
      {purchaseState.isLoading && (
        <div className="bg-blue-600/20 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <span className="text-blue-300">{getStepMessage()}</span>
          </div>
        </div>
      )}

      {purchaseState.error && (
        <div className="bg-red-600/20 rounded-lg p-4 mb-4">
          <div className="text-red-300">❌ {purchaseState.error}</div>
        </div>
      )}

      {purchaseState.step === 'success' && (
        <div className="bg-green-600/20 rounded-lg p-4 mb-4">
          <div className="text-green-300">✅ ¡Ticket comprado!</div>
        </div>
      )}

      {/* Selección */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Selecciona 4 emojis ({selectedEmojis.length}/4)</h4>
          <button
            onClick={generateRandomTicket}
            className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm"
            disabled={purchaseState.isLoading}
          >
            🎲 Aleatorio
          </button>
        </div>

        {/* Seleccionados */}
        <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-white/10 rounded">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="aspect-square bg-white/20 rounded flex items-center justify-center text-xl">
              {selectedEmojis[i] || '?'}
            </div>
          ))}
        </div>

        {/* Grid de emojis */}
        {emojisLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
            <div className="text-sm text-gray-300 mt-2">Cargando emojis del contrato...</div>
          </div>
        ) : emojisError ? (
          <div className="bg-orange-600/20 rounded-lg p-3 mb-4">
            <div className="text-orange-300 text-sm">
              ⚠️ Error cargando emojis del contrato. Usando emojis predeterminados.
              <button 
                onClick={refreshEmojis}
                className="ml-2 text-blue-300 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : null}
        
        <div className="grid grid-cols-5 gap-2">
          {emojis.map((emoji, i) => (
            <button
              key={i}
              onClick={() => selectEmoji(emoji)}
              className={`aspect-square text-xl rounded transition-all ${
                selectedEmojis.includes(emoji) 
                  ? 'bg-yellow-500/30 border-2 border-yellow-400' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              disabled={purchaseState.isLoading || emojisLoading}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Warning saldo */}
      {!userData.canBuyTicket && (
        <div className="bg-orange-600/20 rounded-lg p-4 mb-4">
          <div className="text-orange-300 text-sm">
            ⚠️ Saldo insuficiente. Necesitas {formatUSDC(userData.ticketPrice)} USDC
          </div>
        </div>
      )}

      {/* Botón comprar */}
      <button
        onClick={handleBuyTicket}
        disabled={!canBuyTicket}
        className={`w-full py-3 rounded-lg font-bold transition-all ${
          canBuyTicket
            ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
      >
        💳 Comprar por {formatUSDC(userData.ticketPrice)} USDC
      </button>
    </div>
  );
};

export default BlockchainTicketGenerator; 