import React from 'react';
import { TicketIcon, History, Clock, CheckCircle, X, RefreshCw } from 'lucide-react';
import { useBlockchainTickets } from '../hooks/useBlockchainTickets';
import { formatUnits } from 'viem';

interface BlockchainTicketsDisplayProps {
  onViewHistory: () => void;
}

export const BlockchainTicketsDisplay: React.FC<BlockchainTicketsDisplayProps> = ({ 
  onViewHistory 
}) => {
  const { userData, isConnected, userAddress, refreshData, isLoadingTickets } = useBlockchainTickets();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);

  // Debug logs for development
  if (process.env.NODE_ENV === 'development') {
    console.log('[BlockchainTicketsDisplay] Debug data:', {
      isConnected,
      userAddress,
      ticketsOwned: userData.ticketsOwned.toString(),
      userTicketsLength: userData.userTickets.length,
      userTickets: userData.userTickets,
      usdcBalance: userData.usdcBalance.toString(),
      loadingTimeout,
      isLoadingTickets
    });
  }

  // Set timeout for loading state to avoid infinite loading
  React.useEffect(() => {
    if (isConnected && userData.ticketsOwned > 0n && userData.userTickets.length === 0) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 seconds timeout

      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isConnected, userData.ticketsOwned, userData.userTickets.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLoadingTimeout(false);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatGameDay = (gameDay: string) => {
    const day = parseInt(gameDay);
    return `Game #${day}`;
  };

  const getStatusIcon = (isActive: boolean, matches?: number) => {
    if (!isActive) {
      return <CheckCircle className="text-green-400" size={16} />;
    }
    if (matches && matches >= 2) {
      return <CheckCircle className="text-yellow-400" size={16} />;
    }
    return <Clock className="text-blue-400" size={16} />;
  };

  const getStatusText = (isActive: boolean, matches?: number) => {
    if (!isActive) {
      return 'Claimed';
    }
    if (matches && matches >= 2) {
      return `Winner! ${matches} matches`;
    }
    return 'Active';
  };

  const getTodayTickets = () => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    
    return userData.userTickets.filter(ticket => 
      ticket.purchaseTime >= todayStart
    );
  };

  const todayTickets = getTodayTickets();

  // Show loading state if actively loading tickets or if connected but no data yet (but not if timeout reached)
  if (isConnected && (isLoadingTickets || (userData.ticketsOwned > 0n && userData.userTickets.length === 0 && !loadingTimeout))) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <TicketIcon className="mr-2" size={24} />
            My Blockchain Tickets
            <span className="ml-2 bg-purple-600 text-white text-sm px-2 py-1 rounded-full">
              {userData.ticketsOwned.toString()}
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onViewHistory}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <History size={16} />
              View History
            </button>
          </div>
        </div>

        <div className="text-center py-8 bg-white/10 rounded-lg">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading your tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <TicketIcon className="mr-2" size={24} />
          My Blockchain Tickets
          {userData.ticketsOwned > 0n && (
            <span className="ml-2 bg-purple-600 text-white text-sm px-2 py-1 rounded-full">
              {userData.ticketsOwned.toString()}
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onViewHistory}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <History size={16} />
            View History
          </button>
        </div>
      </div>

      {todayTickets.length === 0 ? (
        <div className="text-center py-8 bg-white/10 rounded-lg">
          <TicketIcon className="mx-auto text-white/40 mb-4" size={48} />
          <p className="text-white/70">Your blockchain tickets will appear here</p>
          <p className="text-white/50 text-sm mt-2">
            {userData.ticketsOwned > 0n 
              ? (loadingTimeout 
                  ? `You have ${userData.ticketsOwned.toString()} tickets total - they may be from previous days or having loading issues. Try refreshing!`
                  : `You have ${userData.ticketsOwned.toString()} tickets total - they may be from previous days. Try refreshing!`
                )
              : 'Buy your first USDC ticket above!'
            }
          </p>
          {userData.ticketsOwned > 0n && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {loadingTimeout ? 'Try Refresh Again' : 'Refresh Tickets'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-white/80 text-sm mb-3">
            Today's tickets ({todayTickets.length})
          </div>
          
          {todayTickets.map((ticket) => (
            <div
              key={ticket.tokenId}
              className="bg-white/10 rounded-lg p-4 border border-white/20"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm">#{ticket.tokenId}</span>
                  <span className="text-white/60 text-sm">{formatGameDay(ticket.gameDay)}</span>
                  {getStatusIcon(ticket.isActive, ticket.matches)}
                  <span className="text-white/80 text-sm">
                    {getStatusText(ticket.isActive, ticket.matches)}
                  </span>
                </div>
                <span className="text-white/60 text-sm">
                  {formatDate(ticket.purchaseTime)}
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-2 bg-black/20 rounded-lg p-3">
                {ticket.emojis.map((emoji, index) => (
                  <span 
                    key={index} 
                    className="text-3xl bg-white/10 rounded-lg w-12 h-12 flex items-center justify-center"
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              
              {ticket.matches !== undefined && ticket.matches > 0 && (
                <div className="mt-3 text-center">
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    ticket.matches >= 4 ? 'bg-yellow-500/20 text-yellow-300' :
                    ticket.matches >= 3 ? 'bg-blue-500/20 text-blue-300' :
                    ticket.matches >= 2 ? 'bg-green-500/20 text-green-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {ticket.matches} match{ticket.matches !== 1 ? 'es' : ''}
                    {ticket.matches >= 2 ? ' - Prize available!' : ''}
                  </span>
                </div>
              )}
            </div>
          ))}
          
          {userData.userTickets.length > todayTickets.length && (
            <div className="text-center py-3">
              <button
                onClick={onViewHistory}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 mx-auto"
              >
                <History size={14} />
                View {userData.userTickets.length - todayTickets.length} more tickets in history
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 