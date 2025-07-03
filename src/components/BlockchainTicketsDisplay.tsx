import React, { useState, useRef, useEffect } from 'react';
import { TicketIcon, History, Clock, CheckCircle, X, RefreshCw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useBlockchainTicketsV4 } from '../hooks/useBlockchainTicketsV4';
import { formatUnits } from 'viem';

interface BlockchainTicketsDisplayProps {
  onViewHistory: () => void;
}

interface TicketModalProps {
  tickets: any[];
  isOpen: boolean;
  onClose: () => void;
  formatDate: (timestamp: number) => string;
  formatGameDay: (gameDay: string) => string;
  getStatusIcon: (isActive: boolean, matches?: number) => React.ReactNode;
  getStatusText: (isActive: boolean, matches?: number) => string;
}

const TicketModal: React.FC<TicketModalProps> = ({
  tickets,
  isOpen,
  onClose,
  formatDate,
  formatGameDay,
  getStatusIcon,
  getStatusText
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const ticketsPerPage = 10;
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);
  
  const getCurrentPageTickets = () => {
    const start = currentPage * ticketsPerPage;
    return tickets.slice(start, start + ticketsPerPage);
  };

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const endX = e.changedTouches[0].clientX;
    const diffX = startX - endX;

    if (Math.abs(diffX) > 50) { // Minimum swipe distance
      if (diffX > 0 && currentPage < totalPages - 1) {
        // Swipe left - next page
        setCurrentPage(prev => prev + 1);
      } else if (diffX < 0 && currentPage > 0) {
        // Swipe right - previous page
        setCurrentPage(prev => prev - 1);
      }
    }
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const endX = e.clientX;
    const diffX = startX - endX;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0 && currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
      } else if (diffX < 0 && currentPage > 0) {
        setCurrentPage(prev => prev - 1);
      }
    }
  };

  // Reset page when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentPage, totalPages, onClose]);

  if (!isOpen) return null;

  const currentTickets = getCurrentPageTickets();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TicketIcon className="text-purple-400" size={24} />
            <h2 className="text-xl font-bold text-white">
              Today's Tickets ({tickets.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-white/70 text-sm">
            Page {currentPage + 1} of {totalPages} • Showing {currentTickets.length} of {tickets.length} tickets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} className="text-white" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Tickets Container with Swipe */}
        <div
          className="space-y-3 select-none cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDragging(false)}
        >
          {currentTickets.map((ticket) => (
            <div
              key={`modal-${ticket.tokenId}`}
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
              
              <div className="flex items-center justify-center gap-2 bg-purple-900/30 rounded-lg p-3">
                {ticket.emojis.map((emoji: string, index: number) => (
                  <span 
                    key={index} 
                    className="text-3xl bg-purple-100 border border-purple-200 rounded-lg w-12 h-12 flex items-center justify-center shadow-sm"
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
        </div>

        {/* Page Indicators */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentPage ? 'bg-purple-400' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="text-center mt-4">
          <div className="text-xs text-white/50">
            ← → Swipe or use arrow keys to navigate • ESC to close
          </div>
        </div>
      </div>
    </div>
  );
};

export const BlockchainTicketsDisplay: React.FC<BlockchainTicketsDisplayProps> = ({ 
  onViewHistory 
}) => {
  const { userData, isConnected, userAddress, refreshData, isLoadingTickets } = useBlockchainTicketsV4();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
  useEffect(() => {
    if (isConnected && userData.ticketsOwned > 0n && userData.userTickets.length === 0) {
      const timer = setTimeout(() => {
        console.log('[BlockchainTicketsDisplay] Loading timeout reached');
        setLoadingTimeout(true);
      }, 15000);

      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isConnected, userData.ticketsOwned, userData.userTickets.length]);

  const handleRefresh = async () => {
    console.log('[BlockchainTicketsDisplay] Manual refresh initiated');
    setIsRefreshing(true);
    setLoadingTimeout(false);
    try {
      await refreshData();
    } catch (error) {
      console.error('[BlockchainTicketsDisplay] Error during refresh:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
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
  const latestTicket = todayTickets[0]; // Get the latest ticket (first in array since they're sorted by purchase time desc)

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
    <>
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
            {/* Show only the latest ticket */}
            {latestTicket && (
              <div
                onClick={() => setShowModal(true)}
                className="bg-white/10 rounded-lg p-4 border border-white/20 cursor-pointer hover:bg-white/15 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm">#{latestTicket.tokenId}</span>
                    <span className="text-white/60 text-sm">{formatGameDay(latestTicket.gameDay)}</span>
                    {getStatusIcon(latestTicket.isActive, latestTicket.matches)}
                    <span className="text-white/80 text-sm">
                      {getStatusText(latestTicket.isActive, latestTicket.matches)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm">
                      {formatDate(latestTicket.purchaseTime)}
                    </span>
                    <Eye className="text-white/40 group-hover:text-white/60 transition-colors" size={16} />
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 bg-purple-900/30 rounded-lg p-3">
                  {latestTicket.emojis.map((emoji: string, index: number) => (
                    <span 
                      key={index} 
                      className="text-3xl bg-purple-100 border border-purple-200 rounded-lg w-12 h-12 flex items-center justify-center shadow-sm"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
                
                {latestTicket.matches !== undefined && latestTicket.matches > 0 && (
                  <div className="mt-3 text-center">
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      latestTicket.matches >= 4 ? 'bg-yellow-500/20 text-yellow-300' :
                      latestTicket.matches >= 3 ? 'bg-blue-500/20 text-blue-300' :
                      latestTicket.matches >= 2 ? 'bg-green-500/20 text-green-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {latestTicket.matches} match{latestTicket.matches !== 1 ? 'es' : ''}
                      {latestTicket.matches >= 2 ? ' - Prize available!' : ''}
                    </span>
                  </div>
                )}

                {/* Click indicator */}
                <div className="mt-3 text-center">
                  <span className="text-purple-400 group-hover:text-purple-300 text-sm flex items-center justify-center gap-1">
                    <Eye size={14} />
                    {todayTickets.length > 1 
                      ? `Tap to view all ${todayTickets.length} tickets today`
                      : 'Latest ticket'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for showing all today's tickets */}
      <TicketModal
        tickets={todayTickets}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        formatDate={formatDate}
        formatGameDay={formatGameDay}
        getStatusIcon={getStatusIcon}
        getStatusText={getStatusText}
      />
    </>
  );
}; 