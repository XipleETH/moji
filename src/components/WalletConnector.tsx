import React, { useState } from 'react';
import { WalletIcon } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { UserMenu } from './UserMenu';

export const WalletConnector: React.FC = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleWalletClick = () => {
    if (isConnected && address) {
      setIsMenuOpen(true);
    } else {
      // Connect specifically with Coinbase Wallet
      const coinbaseConnector = connectors.find(c => c.name === 'Coinbase Wallet');
      if (coinbaseConnector) {
        connect({ connector: coinbaseConnector });
      } else {
        alert('Please install Coinbase Wallet extension to play LottoMoji');
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsMenuOpen(false);
  };

  // Create user object for UserMenu compatibility
  const user = isConnected && address ? {
    id: address,
    username: `${address.slice(0, 6)}...${address.slice(-4)}`,
    walletAddress: address,
    isFarcasterUser: false,
    chainId
  } : null;

  return (
    <>
      <button
        onClick={handleWalletClick}
        disabled={isPending}
        className={`
          relative p-3 rounded-full transition-all duration-200 
          ${isConnected 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg' 
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
          }
          ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          disabled:opacity-50 shadow-md hover:shadow-lg
        `}
      >
        <WalletIcon 
          className={`text-white ${isPending ? 'animate-pulse' : ''}`} 
          size={24} 
        />
        
        {/* Indicator dot when connected */}
        {isConnected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
        )}
        
        {/* Loading indicator */}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </button>

      {/* Connection status */}
      {isConnected && address && (
        <div className="absolute top-full mt-2 right-0 bg-green-500/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          Coinbase Wallet - {chainId === 84532 ? 'Base Sepolia' : chainId === 8453 ? 'Base Mainnet' : 'Unknown Network'}
        </div>
      )}

      {/* Coinbase Wallet required message */}
      {!isConnected && (
        <div className="absolute top-full mt-2 right-0 bg-blue-500/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs">
          Coinbase Wallet Required
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
    </>
  );
}; 