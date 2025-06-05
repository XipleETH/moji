import React, { useState } from 'react';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

export const WalletTroubleshooting: React.FC = () => {
  const [showTips, setShowTips] = useState(false);

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-blue-400" size={20} />
          <span className="text-blue-200 font-medium">Wallet Issues?</span>
        </div>
        <button
          onClick={() => setShowTips(!showTips)}
          className="text-blue-300 hover:text-blue-100 text-sm"
        >
          {showTips ? 'Hide Tips' : 'Show Tips'}
        </button>
      </div>
      
      {showTips && (
        <div className="mt-4 space-y-3 text-sm text-blue-100">
          <div className="border-l-2 border-blue-400 pl-3">
            <h4 className="font-medium mb-1">🔄 "Funds Protected" Error?</h4>
            <p className="text-blue-200">
              This usually means you need to update Coinbase Wallet or switch to Base Sepolia network.
            </p>
            <div className="mt-2 space-y-1">
              <div>1. Open Coinbase Wallet settings</div>
              <div>2. Switch to "Base Sepolia" network</div>
              <div>3. Make sure you have ETH for gas fees</div>
            </div>
          </div>

          <div className="border-l-2 border-blue-400 pl-3">
            <h4 className="font-medium mb-1">💰 Need Test ETH?</h4>
            <p className="text-blue-200">
              Get free Base Sepolia ETH from these faucets:
            </p>
            <div className="mt-2 space-y-1">
              <a 
                href="https://www.alchemy.com/faucets/base-sepolia" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-300 hover:text-blue-100"
              >
                Alchemy Base Sepolia Faucet <ExternalLink size={12} />
              </a>
              <a 
                href="https://sepolia.basescan.org/faucet" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-300 hover:text-blue-100"
              >
                Base Sepolia Official Faucet <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="border-l-2 border-blue-400 pl-3">
            <h4 className="font-medium mb-1">🔧 Quick Fixes</h4>
            <div className="space-y-1 text-blue-200">
              <div>• Refresh the page and reconnect wallet</div>
              <div>• Make sure you're on Base Sepolia (Chain ID: 84532)</div>
              <div>• Check you have at least 0.001 ETH for gas</div>
              <div>• Update Coinbase Wallet to latest version</div>
              <div>• Try disconnecting and reconnecting wallet</div>
            </div>
          </div>

          <div className="border-l-2 border-blue-400 pl-3">
            <h4 className="font-medium mb-1">📱 Mobile Users</h4>
            <p className="text-blue-200">
              For best experience, use Coinbase Wallet mobile browser or desktop with Coinbase Wallet extension.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 