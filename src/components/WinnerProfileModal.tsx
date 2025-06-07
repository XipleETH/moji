import React, { useState, useEffect, memo } from 'react';
import { X, Trophy, Award, Medal, Ticket as TicketIcon, Wallet, Coins, Calendar, User } from 'lucide-react';
import { Ticket, WalletProvider } from '../types';
import { useUserStatistics } from '../hooks/useUserStatistics';

type PrizeCategory = 'first' | 'second' | 'third' | 'free';

interface WinnerInfo {
  userId: string;
  username: string;
  walletAddress: string;
  walletProvider?: WalletProvider;
  chainId?: number;
  tickets: Ticket[];
  profit: number;
}

interface WinnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeCategory: PrizeCategory;
  winners: Ticket[];
  gameDate: string;
}

const getPrizeInfo = (category: PrizeCategory) => {
  switch (category) {
    case 'first':
      return {
        title: 'First Prize Winners',
        description: '4 exact matches in order',
        icon: Trophy,
        bgColor: 'bg-yellow-50',
        iconColor: 'text-yellow-600',
        borderColor: 'border-yellow-400',
        gradientFrom: 'from-yellow-400',
        gradientTo: 'to-yellow-600',
        profit: 250 // tokens
      };
    case 'second':
      return {
        title: 'Second Prize Winners',
        description: '4 matches in any order',
        icon: Award,
        bgColor: 'bg-gray-50',
        iconColor: 'text-gray-600',
        borderColor: 'border-gray-400',
        gradientFrom: 'from-gray-400',
        gradientTo: 'to-gray-600',
        profit: 100 // tokens
      };
    case 'third':
      return {
        title: 'Third Prize Winners',
        description: '3 exact matches in order',
        icon: Medal,
        bgColor: 'bg-orange-50',
        iconColor: 'text-orange-600',
        borderColor: 'border-orange-400',
        gradientFrom: 'from-orange-400',
        gradientTo: 'to-orange-600',
        profit: 25 // tokens
      };
    case 'free':
      return {
        title: 'Free Ticket Winners',
        description: '3 matches in any order',
        icon: TicketIcon,
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-400',
        gradientFrom: 'from-blue-400',
        gradientTo: 'to-blue-600',
        profit: 0 // free ticket, no token value
      };
  }
};

const getWalletProviderName = (provider?: WalletProvider) => {
  switch (provider) {
    case 'coinbase':
      return 'Coinbase Wallet';
    case 'metamask':
      return 'MetaMask';
    case 'injected':
      return 'Browser Wallet';
    default:
      return 'Unknown Wallet';
  }
};

const getNetworkName = (chainId?: number) => {
  switch (chainId) {
    case 8453:
      return 'Base';
    case 10:
      return 'Optimism';
    case 1:
      return 'Ethereum';
    default:
      return `Chain ${chainId}`;
  }
};

// Función para extraer información del usuario a partir de userId
const getUserInfoFromId = (userId: string) => {
  if (userId.startsWith('wallet-')) {
    const address = userId.replace('wallet-', '');
    return {
      username: `User-${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
      walletAddress: address,
      isWalletUser: true
    };
  }
  return {
    username: userId,
    walletAddress: '',
    isWalletUser: false
  };
};

interface WinnerCardProps {
  winner: WinnerInfo;
  prizeInfo: ReturnType<typeof getPrizeInfo>;
  index: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const WinnerCard: React.FC<WinnerCardProps> = memo(({
  winner,
  prizeInfo,
  index,
  isExpanded,
  onToggleExpanded
}) => {
  // Solo cargar estadísticas cuando esté expandido para mejorar rendimiento
  const { statistics, loading } = useUserStatistics(isExpanded ? winner.userId : null);

  return (
    <div className="space-y-2">
      {/* Mostrar cada ticket ganador con el estilo original */}
      {winner.tickets.map((ticket, ticketIndex) => (
        <div 
          key={ticket.id || ticketIndex}
          className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
            isExpanded 
              ? `bg-green-100 ${prizeInfo.borderColor}` 
              : `bg-gray-50 border-gray-200 hover:${prizeInfo.bgColor} hover:${prizeInfo.borderColor}`
          }`}
          onClick={onToggleExpanded}
          title={`Click to ${isExpanded ? 'hide' : 'show'} user profile and stats`}
        >
          <div className="flex justify-between items-center">
            {/* Emojis del ticket (estilo original) */}
            <div className="flex gap-1">
              {ticket.numbers?.map((emoji, i) => (
                <span key={i} className="text-xl">{emoji}</span>
              )) || <span className="text-gray-500">No numbers</span>}
            </div>
            
            {/* Información del usuario al lado */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold text-gray-800 text-sm">{winner.username}</div>
                <div className="text-xs text-gray-600">
                  {winner.walletAddress.substring(0, 6)}...{winner.walletAddress.substring(winner.walletAddress.length - 4)}
                </div>
              </div>
              
              {/* Ganancias */}
              {winner.profit > 0 ? (
                <div className="text-center">
                  <div className="text-sm font-bold text-green-600">+{prizeInfo.profit}</div>
                  <div className="text-xs text-gray-500">tokens</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-sm font-bold text-blue-600">Free</div>
                  <div className="text-xs text-gray-500">ticket</div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      
      {/* Expanded Details - Solo se muestra una vez por usuario */}
      {isExpanded && (
        <div className={`mt-3 p-4 rounded-lg border-2 ${prizeInfo.borderColor} ${prizeInfo.bgColor}`}>
          <div className="space-y-4">
            {/* Header del usuario */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${prizeInfo.gradientFrom} ${prizeInfo.gradientTo} flex items-center justify-center text-white font-bold text-sm mr-3`}>
                  {index}
                </div>
                <div>
                  <div className="font-bold text-gray-800">{winner.username}</div>
                  <div className="text-sm text-gray-600">
                    {winner.walletAddress.substring(0, 6)}...{winner.walletAddress.substring(winner.walletAddress.length - 4)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-lg font-bold ${prizeInfo.iconColor}`}>
                  {winner.tickets.length} ticket{winner.tickets.length !== 1 ? 's' : ''}
                </div>
                {winner.profit > 0 && (
                  <div className="text-sm font-bold text-green-600">
                    Total: +{winner.profit} tokens
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Info */}
            <div className="flex items-center justify-between text-sm bg-white/50 p-2 rounded">
              <div className="flex items-center text-gray-600">
                <Wallet size={14} className="mr-2" />
                <span>{getWalletProviderName(winner.walletProvider)}</span>
              </div>
              {winner.chainId && (
                <span className="text-gray-500">{getNetworkName(winner.chainId)}</span>
              )}
            </div>

            {/* User Statistics */}
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                <div className="text-gray-500 text-sm mt-1">Loading stats...</div>
              </div>
            ) : statistics ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/70 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-blue-600">{statistics.totalTickets}</div>
                  <div className="text-xs text-gray-600">Total Tickets</div>
                </div>
                <div className="bg-white/70 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-600">{statistics.totalWins}</div>
                  <div className="text-xs text-gray-600">Total Wins</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <div className="text-xs text-gray-500 bg-white/50 px-3 py-1 rounded-full">
                  Expand to load detailed statistics
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export const WinnerProfileModal: React.FC<WinnerProfileModalProps> = memo(({
  isOpen,
  onClose,
  prizeCategory,
  winners,
  gameDate
}) => {
  const [expandedWinner, setExpandedWinner] = useState<string | null>(null);
  const [showAllWinners, setShowAllWinners] = useState(false);
  const MAX_INITIAL_WINNERS = 10;
  
  if (!isOpen) return null;

  const prizeInfo = getPrizeInfo(prizeCategory);
  const Icon = prizeInfo.icon;

  // Agrupar tickets por usuario
  const winnerGroups: { [userId: string]: WinnerInfo } = {};
  
  winners.forEach(ticket => {
    if (ticket.userId) {
      const userInfo = getUserInfoFromId(ticket.userId);
      
      if (!winnerGroups[ticket.userId]) {
        winnerGroups[ticket.userId] = {
          userId: ticket.userId,
          username: userInfo.username,
          walletAddress: userInfo.walletAddress,
          walletProvider: undefined, // Se podría obtener de otra fuente si está disponible
          chainId: undefined,
          tickets: [],
          profit: 0
        };
      }
      
      winnerGroups[ticket.userId].tickets.push(ticket);
      winnerGroups[ticket.userId].profit += prizeInfo.profit;
    }
  });

  const winnersList = Object.values(winnerGroups);
  const displayedWinners = showAllWinners ? winnersList : winnersList.slice(0, MAX_INITIAL_WINNERS);
  const hasMoreWinners = winnersList.length > MAX_INITIAL_WINNERS;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r ${prizeInfo.gradientFrom} ${prizeInfo.gradientTo} text-white p-6 rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Icon size={28} className="mr-3" />
              <div>
                <h2 className="text-xl font-bold">{prizeInfo.title}</h2>
                <p className="text-white/90 text-sm">{prizeInfo.description}</p>
                <p className="text-white/80 text-xs mt-1 flex items-center">
                  <Calendar size={12} className="mr-1" />
                  {gameDate}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Prize Summary */}
          <div className="mt-4 flex items-center justify-between bg-white/10 rounded-lg p-3">
            <div className="flex items-center">
              <User className="mr-2" size={16} />
              <span className="text-sm font-medium">
                {winnersList.length} Winner{winnersList.length !== 1 ? 's' : ''} • {winners.length} Ticket{winners.length !== 1 ? 's' : ''}
              </span>
            </div>
            {prizeInfo.profit > 0 && (
              <div className="flex items-center">
                <Coins className="mr-2" size={16} />
                <span className="text-sm font-medium">
                  {prizeInfo.profit} tokens per ticket
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Winners List */}
        <div className="p-6">
          {winnersList.length > 0 ? (
            <>
              <div className="space-y-4">
                {displayedWinners.map((winner, index) => (
                  <WinnerCard
                    key={winner.userId}
                    winner={winner}
                    prizeInfo={prizeInfo}
                    index={index + 1}
                    isExpanded={expandedWinner === winner.userId}
                    onToggleExpanded={() => 
                      setExpandedWinner(expandedWinner === winner.userId ? null : winner.userId)
                    }
                  />
                ))}
              </div>
              
              {hasMoreWinners && !showAllWinners && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowAllWinners(true)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Show {winnersList.length - MAX_INITIAL_WINNERS} more winners
                  </button>
                </div>
              )}
              
              {/* Texto explicativo */}
              <div className="text-center mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  Each ticket shows winning emojis and user info • Click any ticket to view detailed user statistics
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No winners found for this prize category
            </div>
          )}
        </div>
      </div>
    </div>
  );
}); 