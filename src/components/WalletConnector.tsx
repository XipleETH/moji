import React from 'react';
import { WalletIcon } from 'lucide-react';
import { useWalletAuth } from '../hooks/useWalletAuth';

export const WalletConnector: React.FC = () => {
  const { user, isConnected, isConnecting, error, connect, disconnect } = useWalletAuth();

  if (isConnected && user) {
    return (
      <div className="bg-white/10 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <WalletIcon className="mr-2" size={18} />
            <div>
              <div className="font-medium">{user.username}</div>
              <div className="text-sm text-white/70">
                {user.walletAddress?.substring(0, 6)}...{user.walletAddress?.substring(user.walletAddress.length - 4)}
              </div>
            </div>
          </div>
          <button
            onClick={disconnect}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
          >
            Desconectar
          </button>
        </div>
        {user.chainId && (
          <div className="mt-2 text-xs text-white/60">
            Red: {user.chainId === 8453 ? 'Base' : user.chainId === 10 ? 'Optimism' : `Chain ${user.chainId}`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/10 rounded-lg p-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <WalletIcon className="mr-2" size={18} />
          <div>
            <div className="font-medium">Conectar Wallet</div>
            <div className="text-sm text-white/70">
              Coinbase Wallet o MetaMask
            </div>
          </div>
        </div>
        <button
          onClick={connect}
          disabled={isConnecting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isConnecting ? 'Conectando...' : 'Conectar'}
        </button>
      </div>
      
      {error && (
        <div className="mt-2 text-red-300 text-sm">
          {error}
        </div>
      )}
      
      <div className="mt-2 text-xs text-white/60">
        Necesitas una wallet para generar tickets y participar en la lotería
      </div>
    </div>
  );
}; 