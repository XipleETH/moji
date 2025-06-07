import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Wallet, ChevronRight } from 'lucide-react';
import { WalletInfo, WalletProvider } from '../types';
import { getSupportedWallets } from '../utils/wallets';

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (walletId: WalletProvider) => void;
  isConnecting?: boolean;
  connectingWallet?: WalletProvider | null;
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({
  isOpen,
  onClose,
  onWalletSelect,
  isConnecting = false,
  connectingWallet = null
}) => {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWallets(getSupportedWallets());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleWalletClick = (wallet: WalletInfo) => {
    if (wallet.isAvailable) {
      onWalletSelect(wallet.id);
    } else {
      // Si no está disponible, abrir la URL de descarga
      if (wallet.downloadUrl) {
        window.open(wallet.downloadUrl, '_blank');
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Wallet className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Connect Wallet</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 text-sm mb-6">
            Choose your preferred wallet to connect to LottoMoji
          </p>

          {/* Wallet List */}
          <div className="space-y-3">
            {wallets.map((wallet) => {
              const isCurrentlyConnecting = isConnecting && connectingWallet === wallet.id;
              
              return (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletClick(wallet)}
                  disabled={isCurrentlyConnecting}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all duration-200
                    ${wallet.isAvailable 
                      ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 active:scale-[0.98]' 
                      : 'border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100'
                    }
                    ${isCurrentlyConnecting ? 'border-purple-500 bg-purple-50' : ''}
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-between
                  `}
                >
                  <div className="flex items-center gap-4">
                    {/* Wallet Icon */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                      {wallet.icon}
                    </div>
                    
                    {/* Wallet Info */}
                    <div className="text-left">
                      <div className="font-semibold text-gray-800 flex items-center gap-2">
                        {wallet.name}
                        {!wallet.isAvailable && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                            Not installed
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {wallet.description}
                      </div>
                    </div>
                  </div>

                  {/* Action Icon */}
                  <div className="flex items-center">
                    {isCurrentlyConnecting ? (
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    ) : wallet.isAvailable ? (
                      <ChevronRight className="text-gray-400" size={20} />
                    ) : (
                      <Download className="text-gray-400" size={20} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p className="mb-2">
                🔒 We do not store any personal information
              </p>
              <p>
                New to wallets?{' '}
                <button 
                  onClick={() => window.open('https://ethereum.org/wallets/', '_blank')}
                  className="text-purple-600 hover:text-purple-700 underline inline-flex items-center gap-1"
                >
                  Learn more <ExternalLink size={12} />
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 