import React, { useState, useEffect } from 'react';
import { X, Trophy, Award, Medal, Ticket as TicketIcon, Copy, Check, Wallet } from 'lucide-react';
import { User } from '../types';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserStats {
  totalTickets: number;
  firstPrizes: number;
  secondPrizes: number;
  thirdPrizes: number;
  freePrizes: number;
}

export const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, disconnect } = useWalletAuth();
  const [stats, setStats] = useState<UserStats>({
    totalTickets: 0,
    firstPrizes: 0,
    secondPrizes: 0,
    thirdPrizes: 0,
    freePrizes: 0
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch user statistics
  useEffect(() => {
    if (!user?.id || !isOpen) return;

    const fetchUserStats = async () => {
      setLoading(true);
      try {
        console.log('[UserProfile] Fetching stats for user:', user.id);
        
        // Get all user tickets
        const ticketsQuery = query(
          collection(db, 'player_tickets'),
          where('userId', '==', user.id)
        );
        
        const ticketsSnapshot = await getDocs(ticketsQuery);
        console.log('[UserProfile] Found tickets:', ticketsSnapshot.size);
        
        // Get all game results to calculate prizes
        const resultsQuery = query(collection(db, 'game_results'));
        const resultsSnapshot = await getDocs(resultsQuery);
        console.log('[UserProfile] Found game results:', resultsSnapshot.size);
        
        let firstPrizes = 0;
        let secondPrizes = 0;
        let thirdPrizes = 0;
        let freePrizes = 0;
        
        // Count prizes by checking all game results
        resultsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Check first prizes
          if (Array.isArray(data.firstPrize)) {
            firstPrizes += data.firstPrize.filter((ticket: any) => 
              ticket.userId === user.id
            ).length;
          }
          
          // Check second prizes
          if (Array.isArray(data.secondPrize)) {
            secondPrizes += data.secondPrize.filter((ticket: any) => 
              ticket.userId === user.id
            ).length;
          }
          
          // Check third prizes
          if (Array.isArray(data.thirdPrize)) {
            thirdPrizes += data.thirdPrize.filter((ticket: any) => 
              ticket.userId === user.id
            ).length;
          }
          
          // Check free prizes
          if (Array.isArray(data.freePrize)) {
            freePrizes += data.freePrize.filter((ticket: any) => 
              ticket.userId === user.id
            ).length;
          }
        });
        
        setStats({
          totalTickets: ticketsSnapshot.size,
          firstPrizes,
          secondPrizes,
          thirdPrizes,
          freePrizes
        });
        
        console.log('[UserProfile] User stats:', {
          totalTickets: ticketsSnapshot.size,
          firstPrizes,
          secondPrizes,
          thirdPrizes,
          freePrizes
        });
        
      } catch (error) {
        console.error('[UserProfile] Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user?.id, isOpen]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 8453: return 'Base';
      case 10: return 'Optimism';
      case 1: return 'Ethereum';
      default: return `Chain ${chainId}`;
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">User Profile</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="mt-4 flex items-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet size={32} />
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold">{user.username}</h3>
              <p className="text-white/80 text-sm">
                {user.isFarcasterUser ? 'Farcaster User' : 'Wallet User'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Wallet Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 border-b pb-2">Wallet Information</h4>
            
            {user.walletAddress && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-mono text-sm">{formatAddress(user.walletAddress)}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(user.walletAddress!)}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                    title="Copy address"
                  >
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}
            
            {user.chainId && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Network</p>
                <p className="font-semibold">{getNetworkName(user.chainId)}</p>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 border-b pb-2">Statistics</h4>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-gray-600">Loading stats...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Total Tickets */}
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <TicketIcon className="mx-auto mb-2 text-blue-600" size={24} />
                  <p className="text-2xl font-bold text-blue-800">{stats.totalTickets}</p>
                  <p className="text-xs text-blue-600">Total Tickets</p>
                </div>
                
                {/* First Prizes */}
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <Trophy className="mx-auto mb-2 text-yellow-600" size={24} />
                  <p className="text-2xl font-bold text-yellow-800">{stats.firstPrizes}</p>
                  <p className="text-xs text-yellow-600">First Prizes</p>
                </div>
                
                {/* Second Prizes */}
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <Award className="mx-auto mb-2 text-gray-600" size={24} />
                  <p className="text-2xl font-bold text-gray-800">{stats.secondPrizes}</p>
                  <p className="text-xs text-gray-600">Second Prizes</p>
                </div>
                
                {/* Third Prizes */}
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <Medal className="mx-auto mb-2 text-orange-600" size={24} />
                  <p className="text-2xl font-bold text-orange-800">{stats.thirdPrizes}</p>
                  <p className="text-xs text-orange-600">Third Prizes</p>
                </div>
                
                {/* Free Tickets Won */}
                <div className="bg-green-50 rounded-lg p-3 text-center col-span-2">
                  <TicketIcon className="mx-auto mb-2 text-green-600" size={24} />
                  <p className="text-2xl font-bold text-green-800">{stats.freePrizes}</p>
                  <p className="text-xs text-green-600">Free Tickets Won</p>
                </div>
              </div>
            )}
          </div>

          {/* Success Rate */}
          {!loading && stats.totalTickets > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 border-b pb-2">Success Rate</h4>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {(((stats.firstPrizes + stats.secondPrizes + stats.thirdPrizes + stats.freePrizes) / stats.totalTickets) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-purple-600">Winning Rate</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats.firstPrizes + stats.secondPrizes + stats.thirdPrizes + stats.freePrizes} wins out of {stats.totalTickets} tickets
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <button
            onClick={disconnect}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}; 