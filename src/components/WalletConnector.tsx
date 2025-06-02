import React from 'react';
import { WalletIcon } from 'lucide-react';
import { useWalletAuth } from '../hooks/useWalletAuth';

export const WalletConnector: React.FC = () => {
  const { user, isConnected, isConnecting, error, connect, disconnect } = useWalletAuth();

  if (isConnected && user) {
    return (
      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <WalletIcon className="mr-2" size={18} />
            <div>
              <div className="font-medium">Connected Wallet</div>
              <div className="text-sm text-white/70">
                {user.walletAddress?.substring(0, 6)}...{user.walletAddress?.substring(user.walletAddress.length - 4)}
              </div>
            </div>
          </div>
          <button
            onClick={disconnect}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-1 rounded text-sm transition-colors"
          >
            Disconnect
          </button>
        </div>
        {user.chainId && (
          <div className="mt-2 text-xs text-white/60">
            Network: {user.chainId === 8453 ? 'Base' : user.chainId === 10 ? 'Optimism' : `Chain ${user.chainId}`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-white">
      {error && (
        <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-sm">
          {error}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <WalletIcon className="mr-2" size={18} />
          <div>
            <div className="font-medium">Connect Wallet</div>
            <div className="text-sm text-white/70">
              Coinbase Wallet or MetaMask
            </div>
          </div>
        </div>
        <button
          onClick={connect}
          disabled={isConnecting}
          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 px-4 py-2 rounded transition-colors disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      </div>
      
      <div className="mt-3 text-xs text-white/60">
        You need a wallet to generate tickets and participate in the lottery
      </div>
    </div>
  );
}; 