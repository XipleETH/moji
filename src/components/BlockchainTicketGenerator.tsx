import React, { useState, useEffect } from 'react';
import { useBlockchainTickets } from '../hooks/useBlockchainTickets';
import { getEmojis, loadEmojisFromContract } from '../utils/emojiManager';
import { GAME_CONFIG } from '../utils/contractAddresses';
import { formatUnits } from 'viem';

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
    resetPurchaseState
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

  const formatUSDC = (amount: bigint) => formatUnits(amount, 6);

  const canBuyTicket = selectedEmojis.length === 4 && 
                      userData.canBuyTicket && 
                      !purchaseState.isLoading && 
                      userAddress;

  const timeUntilDraw = userData.timeUntilNextDraw > 0n ? 
    new Date(Number(userData.timeUntilNextDraw) * 1000).toLocaleTimeString() : 
    'Próximo sorteo en proceso';

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

      {/* Info del próximo sorteo */}
      <div className="bg-blue-600/20 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-300">Próximo Sorteo</div>
            <div className="text-lg font-bold">{timeUntilDraw}</div>
          </div>
          <div>
            <div className="text-sm text-blue-300">Tus Tickets</div>
            <div className="text-lg font-bold text-center">{userData.ticketsOwned.toString()}</div>
          </div>
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
          {purchaseState.txHash && (
            <a 
              href={`https://sepolia.basescan.org/tx/${purchaseState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-300 hover:text-blue-200 mt-2 block"
            >
              Ver en BaseScan 🔍
            </a>
          )}
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
              ⚠️ {emojisError}
              <button
                onClick={refreshEmojis}
                className="text-blue-300 hover:text-blue-200 ml-2"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => selectEmoji(emoji)}
                className={`aspect-square text-xl rounded ${
                  selectedEmojis.includes(emoji)
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                disabled={purchaseState.isLoading || (selectedEmojis.length >= 4 && !selectedEmojis.includes(emoji))}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botón de compra */}
      <button
        onClick={handleBuyTicket}
        disabled={!canBuyTicket}
        className={`w-full py-3 rounded-lg text-lg font-bold ${
          canBuyTicket
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-gray-600 cursor-not-allowed'
        }`}
      >
        {!userAddress ? '🔒 Conecta tu Wallet' :
         !userData.canBuyTicket ? '❌ USDC Insuficiente' :
         selectedEmojis.length < 4 ? `🎯 Selecciona ${4 - selectedEmojis.length} más` :
         purchaseState.isLoading ? '⏳ Procesando...' :
         '💫 Comprar Ticket'}
      </button>
    </div>
  );
};

export default BlockchainTicketGenerator; 