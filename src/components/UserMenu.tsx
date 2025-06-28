import React from 'react';
import { X, Trophy, Award, Medal, Ticket, Users, Target, Wallet, RefreshCw, Activity, Clock, DollarSign, Gift } from 'lucide-react';
import { useUserStatistics } from '../hooks/useUserStatistics';
import { usePrizeClaims } from '../hooks/usePrizeClaims';
import { WalletProvider } from '../types';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    walletAddress: string;
    id: string;
    chainId?: number;
    walletProvider?: WalletProvider;
  };
  onDisconnect: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onDisconnect 
}) => {
  const { statistics, loading, error, refreshStats, lastUpdated } = useUserStatistics(user.id);
  const { 
    claimableTickets, 
    claimedTickets, 
    totalPrizeValue, 
    claimState, 
    isLoadingWinners,
    claimPrize,
    claimMultiplePrizes,
    resetClaimState 
  } = usePrizeClaims();
  
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshStats();
    } catch (error) {
      console.error('Error refreshing stats:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleClaimPrize = async (ticketId: string) => {
    try {
      const hash = await claimPrize(ticketId);
      if (hash) {
        console.log(`Prize claimed successfully! TX: ${hash}`);
      }
    } catch (error) {
      console.error('Error claiming prize:', error);
    }
  };

  const handleClaimAllPrizes = async () => {
    if (claimableTickets.length === 0) return;
    
    try {
      const ticketIds = claimableTickets.map(t => t.tokenId);
      const hashes = await claimMultiplePrizes(ticketIds);
      console.log(`Claimed ${hashes.length} prizes successfully!`);
    } catch (error) {
      console.error('Error claiming multiple prizes:', error);
    }
  };

  // Separar tickets por tipo de premio
  const usdcPrizes = claimableTickets.filter(t => t.prizeType !== 'free');
  const freeTicketPrizes = claimableTickets.filter(t => t.prizeType === 'free');

  const formatLastUpdated = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNetworkName = (chainId?: number) => {
    switch (chainId) {
      case 8453: return 'Base';
      case 10: return 'Optimism';
      case 1: return 'Ethereum';
      case 84532: return 'Base Sepolia';
      case 11155420: return 'Sepolia';
      default: return chainId ? `Chain ${chainId}` : 'Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Wallet Profile</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            </div>
          </div>
          <div className="mt-4">
            <div className="font-medium">{user.username}</div>
            <div className="text-sm text-white/80">
              {user.walletAddress?.substring(0, 6)}...{user.walletAddress?.substring(user.walletAddress.length - 4)}
            </div>
            <div className="flex items-center gap-3 mt-2">
              {user.walletProvider && (
                <div className="flex items-center text-xs text-white/70">
                  <Wallet size={12} className="mr-1" />
                  {user.walletProvider === 'coinbase' && 'Coinbase Wallet'}
                  {user.walletProvider === 'metamask' && 'MetaMask'}
                  {user.walletProvider === 'injected' && 'Browser Wallet'}
                </div>
              )}
                <div className="text-xs text-white/70">
                Network: {getNetworkName(user.chainId)}
              </div>
            </div>
            {/* Status indicator */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center text-xs text-white/70">
                <Activity size={12} className="mr-1" />
                {loading || isRefreshing ? 'Updating...' : 'Live data'}
              </div>
              {lastUpdated > 0 && (
                <div className="flex items-center text-xs text-white/70">
                  <Clock size={12} className="mr-1" />
                  {formatLastUpdated(lastUpdated)}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="p-6">
          {loading && !statistics && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <div className="text-gray-500 mt-2">Loading statistics...</div>
            </div>
          )}

          {error && !statistics && (
            <div className="text-center py-8">
              <div className="text-red-500">Error loading statistics</div>
              <div className="text-sm text-gray-500 mt-1">{error}</div>
              <button
                onClick={handleRefresh}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {statistics && (
            <div className="space-y-6">
              {/* Tickets Overview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Ticket className="mr-2 text-blue-600" size={20} />
                  Tickets Overview (Blockchain)
                  {statistics.isLoading && (
                    <div className="ml-2 w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{statistics.totalTickets}</div>
                    <div className="text-xs text-blue-700">Total Tickets</div>
                    <div className="text-xs text-blue-500 mt-1">
                      On-chain (USDC)
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{statistics.paidTickets}</div>
                    <div className="text-xs text-green-700">Purchased</div>
                    <div className="text-xs text-green-500 mt-1">
                      Blockchain paid
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{statistics.recentTickets}</div>
                    <div className="text-xs text-purple-700">Recent (3 days)</div>
                    <div className="text-xs text-purple-500 mt-1">
                      Latest activity
                    </div>
                  </div>
                </div>
              </div>

              {/* Prizes Won */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Trophy className="mr-2 text-yellow-600" size={20} />
                  Prizes Won (From Blockchain)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-yellow-50 p-3 rounded-lg text-center border border-yellow-200">
                    <div className="text-yellow-600 text-xs mb-1">🥇 First Prize</div>
                    <div className="text-yellow-600 text-xs mb-1">4 in exact order</div>
                    <div className="text-2xl font-bold text-yellow-700">{statistics.wins.firstPrize}</div>
                    </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-200">
                    <div className="text-gray-600 text-xs mb-1">🥈 Second Prize</div>
                    <div className="text-gray-600 text-xs mb-1">4 in any order</div>
                    <div className="text-2xl font-bold text-gray-700">{statistics.wins.secondPrize}</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center border border-orange-200">
                    <div className="text-orange-600 text-xs mb-1">🥉 Third Prize</div>
                    <div className="text-orange-600 text-xs mb-1">3 in exact order</div>
                    <div className="text-2xl font-bold text-orange-700">{statistics.wins.thirdPrize}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-200">
                    <div className="text-blue-600 text-xs mb-1">🎫 Free Ticket</div>
                    <div className="text-blue-600 text-xs mb-1">3 in any order</div>
                    <div className="text-2xl font-bold text-blue-700">{statistics.wins.freePrize}</div>
                  </div>
                    </div>
                <div className="mt-3 text-center">
                  <div className="text-2xl font-bold text-gray-800">{statistics.totalWins}</div>
                  <div className="text-xs text-gray-600">Total Wins</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {statistics.totalTickets > 0 
                      ? `${((statistics.totalWins / statistics.totalTickets) * 100).toFixed(1)}% win rate`
                      : '0.0% win rate'
                    }
                  </div>
                </div>
              </div>

              {/* Total Wins Summary */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-700">{statistics.totalWins}</div>
                  <div className="text-purple-600 font-medium">Total Wins</div>
                  <div className="text-sm text-purple-500 mt-1">
                    {statistics.totalTickets > 0 
                      ? `${((statistics.totalWins / statistics.totalTickets) * 100).toFixed(1)}% win rate`
                      : 'No tickets yet'
                    }
                  </div>
                  {/* Data source indicator */}
                  <div className="text-xs text-purple-400 mt-2">
                    🔗 Live Blockchain Data Only
                  </div>
                </div>
              </div>

              {/* Prize Claims Section - ALWAYS SHOW */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Trophy className="mr-2 text-yellow-600" size={20} />
                  Reclamación de Premios
                  {isLoadingWinners && (
                    <div className="ml-2 w-4 h-4 border-2 border-yellow-300 border-t-yellow-600 rounded-full animate-spin"></div>
                  )}
                </h3>
                
                {/* Claimable Prizes Summary - SHOW WHEN AVAILABLE */}
                {claimableTickets.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 mb-4">
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-green-700">{claimableTickets.length}</div>
                      <div className="text-green-600 font-medium">Premios Disponibles</div>
                      {totalPrizeValue > 0 && (
                        <div className="text-sm text-green-500 mt-1">
                          💰 {totalPrizeValue.toFixed(3)} USDC + {freeTicketPrizes.length} tickets gratis
                        </div>
                      )}
                    </div>

                    {/* Prize Breakdown */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {usdcPrizes.length > 0 && (
                        <div className="bg-white/50 p-2 rounded text-center">
                          <div className="text-xs text-green-600 mb-1">💰 Premios USDC</div>
                          <div className="font-bold text-green-700">{usdcPrizes.length}</div>
                          <div className="text-xs text-green-500">
                            {usdcPrizes.reduce((sum, t) => sum + parseFloat(t.prizeAmount || '0'), 0).toFixed(3)} USDC
                          </div>
                        </div>
                      )}
                      {freeTicketPrizes.length > 0 && (
                        <div className="bg-white/50 p-2 rounded text-center">
                          <div className="text-xs text-blue-600 mb-1">🎫 Tickets Gratis</div>
                          <div className="font-bold text-blue-700">{freeTicketPrizes.length}</div>
                          <div className="text-xs text-blue-500">Para próximos sorteos</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Claim Buttons - ALWAYS SHOW */}
                <div className="space-y-2 mb-4">
                  <button
                    onClick={handleClaimAllPrizes}
                    disabled={claimState.isLoading || usdcPrizes.length === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claimState.isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        {claimState.step === 'checking' && 'Verificando...'}
                        {claimState.step === 'claiming' && 'Reclamando...'}
                        {claimState.step === 'confirming' && 'Confirmando...'}
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-2" size={18} />
                        Reclamar Premios USDC ({usdcPrizes.length})
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const freeTicketIds = freeTicketPrizes.map(t => t.tokenId);
                      claimMultiplePrizes(freeTicketIds);
                    }}
                    disabled={claimState.isLoading || freeTicketPrizes.length === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Gift className="mr-2" size={18} />
                    Reclamar Tickets Gratis ({freeTicketPrizes.length})
                  </button>
                </div>

                {/* Status Messages */}
                {claimState.error && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded mb-4">
                    {claimState.error}
                  </div>
                )}

                {claimState.step === 'success' && (
                  <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded mb-4">
                    ✅ Premio reclamado exitosamente!
                    {claimState.txHash && (
                      <div className="mt-1">
                        <a 
                          href={`https://sepolia.basescan.org/tx/${claimState.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 underline text-xs"
                        >
                          Ver transacción ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Info */}
                {claimedTickets.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <div className="text-sm text-gray-600 text-center">
                      🏆 Has reclamado {claimedTickets.length} premios anteriormente
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-1">
                      Revisa tu historial de transacciones en BaseScan
                    </div>
                  </div>
                )}

                {/* Info Message */}
                {claimableTickets.length === 0 && claimedTickets.length === 0 && !isLoadingWinners && (
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-blue-600 text-sm">
                      🎯 No tienes premios disponibles actualmente
                    </div>
                    <div className="text-blue-500 text-xs mt-1">
                      ¡Sigue jugando para ganar premios increíbles!
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Conecta a Base Sepolia para ver premios del contrato
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-6">
          {claimState.error && (
            <button
              onClick={resetClaimState}
              className="w-full mb-3 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Reintentar Reclamación
            </button>
          )}
          
          <button
            onClick={onDisconnect}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <Users className="mr-2" size={18} />
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}; 