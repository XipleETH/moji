import React from 'react';
import { X, User, Wallet, Trophy, Medal, Award, Ticket as TicketIcon, Calendar, Star } from 'lucide-react';
import { WalletProvider } from '../types';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    walletAddress: string;
    walletProvider?: WalletProvider;
    chainId?: number;
    isFarcasterUser?: boolean;
    verifiedWallet?: boolean;
    connectedAt?: number;
  };
  winningTicket?: {
    numbers: string[];
    timestamp: number;
    prizeType: 'first' | 'second' | 'third' | 'free';
    gameDate: string;
  };
}

export const UserProfile: React.FC<UserProfileProps> = ({
  isOpen,
  onClose,
  user,
  winningTicket
}) => {
  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWalletProviderDisplay = (provider?: WalletProvider) => {
    switch (provider) {
      case 'coinbase':
        return { name: 'Coinbase Wallet', icon: '🟦' };
      case 'metamask':
        return { name: 'MetaMask', icon: '🦊' };
      case 'injected':
        return { name: 'Browser Wallet', icon: '🌐' };
      default:
        return { name: 'Unknown Wallet', icon: '💼' };
    }
  };

  const getNetworkName = (chainId?: number) => {
    switch (chainId) {
      case 8453:
        return 'Base';
      case 1:
        return 'Ethereum';
      case 10:
        return 'Optimism';
      case 137:
        return 'Polygon';
      default:
        return `Chain ${chainId}`;
    }
  };

  const getPrizeDisplay = (prizeType: string) => {
    switch (prizeType) {
      case 'first':
        return {
          name: '1st Prize',
          icon: Trophy,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-300',
          description: '4 exact matches in order'
        };
      case 'second':
        return {
          name: '2nd Prize',
          icon: Award,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-300',
          description: '4 matches in any order'
        };
      case 'third':
        return {
          name: '3rd Prize',
          icon: Medal,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-300',
          description: '3 exact matches in order'
        };
      case 'free':
        return {
          name: 'Free Ticket',
          icon: TicketIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-300',
          description: '3 matches in any order'
        };
      default:
        return {
          name: 'Prize',
          icon: Star,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-300',
          description: 'Winner'
        };
    }
  };

  const walletProvider = getWalletProviderDisplay(user.walletProvider);
  const prizeInfo = winningTicket ? getPrizeDisplay(winningTicket.prizeType) : null;
  const PrizeIcon = prizeInfo?.icon;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${prizeInfo?.bgColor || 'bg-gradient-to-r from-purple-600 to-pink-600'} ${prizeInfo ? 'text-gray-800' : 'text-white'} p-6 rounded-t-2xl relative`}>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${prizeInfo ? 'hover:bg-white/20 text-gray-600' : 'hover:bg-white/20 text-white'}`}
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-full ${prizeInfo?.bgColor || 'bg-white/20'} flex items-center justify-center`}>
              <User className={`${prizeInfo?.color || 'text-white'}`} size={32} />
            </div>
            
            <div className="flex-1">
              <h2 className={`text-xl font-bold ${prizeInfo?.color || 'text-white'}`}>{user.username}</h2>
              <p className={`text-sm ${prizeInfo ? 'text-gray-600' : 'text-white/80'}`}>
                {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}
              </p>
              
              {/* Winner Badge */}
              {winningTicket && prizeInfo && PrizeIcon && (
                <div className={`flex items-center gap-2 mt-2 px-3 py-1 rounded-full ${prizeInfo.bgColor} ${prizeInfo.borderColor} border`}>
                  <PrizeIcon className={prizeInfo.color} size={16} />
                  <span className={`text-sm font-semibold ${prizeInfo.color}`}>{prizeInfo.name} Winner</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Wallet Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Wallet className="text-blue-600" size={20} />
              Wallet Information
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Provider:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{walletProvider.icon}</span>
                  <span className="font-medium">{walletProvider.name}</span>
                </div>
              </div>
              
              {user.chainId && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Network:</span>
                  <span className="font-medium">{getNetworkName(user.chainId)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Verified:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.verifiedWallet ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.verifiedWallet ? 'Verified' : 'Unverified'}
                </span>
              </div>
              
              {user.connectedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Connected:</span>
                  <span className="text-sm font-medium">{formatDate(user.connectedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Winning Ticket Information */}
          {winningTicket && prizeInfo && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Trophy className="text-yellow-600" size={20} />
                Winning Ticket
              </h3>
              
              <div className={`${prizeInfo.bgColor} ${prizeInfo.borderColor} border-2 rounded-lg p-4`}>
                <div className="flex items-center gap-3 mb-3">
                  {PrizeIcon && <PrizeIcon className={prizeInfo.color} size={24} />}
                  <div>
                    <h4 className={`font-bold ${prizeInfo.color}`}>{prizeInfo.name}</h4>
                    <p className="text-sm text-gray-600">{prizeInfo.description}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700 block mb-2">Winning Numbers:</span>
                    <div className="flex gap-2 justify-center">
                      {winningTicket.numbers.map((emoji, i) => (
                        <span key={i} className="text-2xl bg-white/50 p-2 rounded-lg">{emoji}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>{winningTicket.gameDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TicketIcon size={16} />
                      <span>{formatDate(winningTicket.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Type Badge */}
          <div className="flex justify-center">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              user.isFarcasterUser 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {user.isFarcasterUser ? 'Farcaster User' : 'Wallet User'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};