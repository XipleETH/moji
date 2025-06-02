import React, { useState } from 'react';
import { Wallet, WifiOff } from 'lucide-react';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { UserProfile } from './UserProfile';

export const WalletButton: React.FC = () => {
  const { user, isConnected, isConnecting, connect } = useWalletAuth();
  const [showProfile, setShowProfile] = useState(false);

  const handleClick = async () => {
    if (isConnected && user) {
      // If connected, show profile
      setShowProfile(true);
    } else {
      // If not connected, connect wallet
      await connect();
    }
  };

  return (
    <>
      {/* Wallet Button - Fixed position top right */}
      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={`
          fixed top-4 right-4 z-40
          w-12 h-12 rounded-full
          flex items-center justify-center
          transition-all duration-300
          shadow-lg backdrop-blur-sm
          ${isConnected 
            ? 'bg-green-500/90 hover:bg-green-600/90 text-white' 
            : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
        `}
        title={isConnected ? 'View Profile' : 'Connect Wallet'}
      >
        {isConnecting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isConnected ? (
          <Wallet size={20} />
        ) : (
          <WifiOff size={20} />
        )}
      </button>

      {/* Connection Status Indicator */}
      {isConnected && user && (
        <div className="fixed top-16 right-4 z-30 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
          {user.walletAddress?.substring(0, 6)}...{user.walletAddress?.substring(user.walletAddress.length - 4)}
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </>
  );
}; 