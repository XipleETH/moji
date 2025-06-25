import React, { useState } from 'react';
import { WalletIcon } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { UserMenu } from './UserMenu';
import { WalletSelector } from './WalletSelector';
import { WalletProvider } from '../types';

export const WalletConnector: React.FC = () => {
  const { user, isConnected, isConnecting, connectingWallet, error, connect, disconnect } = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);

  const handleWalletClick = () => {
    if (isConnected && user) {
      setIsMenuOpen(true);
    } else {
      setIsWalletSelectorOpen(true);
    }
  };

  const handleWalletSelect = (walletId: WalletProvider) => {
    setIsWalletSelectorOpen(false);
    connect(walletId);
  };

  const handleDisconnect = () => {
    disconnect();
    setIsMenuOpen(false);
  };

  return (
    <>
      <button
        onClick={handleWalletClick}
        disabled={isConnecting}
        className={`
          relative p-3 rounded-full transition-all duration-200 
          ${isConnected 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg' 
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          disabled:opacity-50 shadow-md hover:shadow-lg
        `}
      >
        <WalletIcon 
          className={`text-white ${isConnecting ? 'animate-pulse' : ''}`} 
          size={24} 
        />
        
        {/* Indicator dot when connected */}
        {isConnected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
        )}
        
        {/* Loading indicator */}
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </button>

      {/* Error message */}
      {error && (
        <div className="absolute top-full mt-2 right-0 bg-red-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs">
          {error}
        </div>
      )}

      {/* User Menu Modal */}
      {user && (
        <UserMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          user={user}
          onDisconnect={handleDisconnect}
        />
      )}

      {/* Wallet Selector Modal */}
      <WalletSelector
        isOpen={isWalletSelectorOpen}
        onClose={() => setIsWalletSelectorOpen(false)}
        onWalletSelect={handleWalletSelect}
        isConnecting={isConnecting}
        connectingWallet={connectingWallet}
      />
    </>
  );
}; 