import React from 'react';
import { X, Trophy, Award, Medal, Ticket, Users, Target, Wallet } from 'lucide-react';
import { useUserStatistics } from '../hooks/useUserStatistics';
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
  const { statistics, loading, error } = useUserStatistics(user.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Wallet Profile</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
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
            {user.chainId && (
                <div className="text-xs text-white/70">
                Network: {user.chainId === 8453 ? 'Base' : user.chainId === 10 ? 'Optimism' : `Chain ${user.chainId}`}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <div className="text-gray-500 mt-2">Loading statistics...</div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-red-500">Error loading statistics</div>
              <div className="text-sm text-gray-500 mt-1">{error}</div>
            </div>
          )}

          {statistics && (
            <div className="space-y-6">
              {/* Tickets Overview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Ticket className="mr-2 text-blue-600" size={20} />
                  Tickets Overview
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{statistics.totalTickets}</div>
                    <div className="text-xs text-blue-700">Total Tickets</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{statistics.paidTickets}</div>
                    <div className="text-xs text-green-700">Purchased</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{statistics.freeTickets}</div>
                    <div className="text-xs text-purple-700">Free Tickets</div>
                  </div>
                </div>
              </div>

              {/* Prizes Won */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Target className="mr-2 text-yellow-600" size={20} />
                  Prizes Won
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <Trophy className="text-yellow-600 mr-3" size={20} />
                      <span className="font-medium">First Prize</span>
                    </div>
                    <span className="text-xl font-bold text-yellow-600">{statistics.wins.firstPrize}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Award className="text-gray-600 mr-3" size={20} />
                      <span className="font-medium">Second Prize</span>
                    </div>
                    <span className="text-xl font-bold text-gray-600">{statistics.wins.secondPrize}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center">
                      <Medal className="text-orange-600 mr-3" size={20} />
                      <span className="font-medium">Third Prize</span>
                    </div>
                    <span className="text-xl font-bold text-orange-600">{statistics.wins.thirdPrize}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <Ticket className="text-green-600 mr-3" size={20} />
                      <span className="font-medium">Free Tickets Won</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">{statistics.wins.freePrize}</span>
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-6">
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