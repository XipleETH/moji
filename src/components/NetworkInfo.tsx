import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { SUPPORTED_CHAINS } from '../contracts/addresses';

export const NetworkInfo: React.FC = () => {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return null;

  const isCorrectNetwork = SUPPORTED_CHAINS.includes(chainId as any);
  
  const getNetworkName = (id: number) => {
    switch (id) {
      case 84532: return 'Base Sepolia';
      case 8453: return 'Base Mainnet';
      default: return 'Unknown Network';
    }
  };

  const handleSwitchNetwork = () => {
    // Switch to Base Sepolia (testnet) for now
    switchChain({ chainId: 84532 });
  };

  if (isCorrectNetwork) {
    return (
      <div className="flex items-center gap-2 text-green-200 text-sm">
        <CheckCircle size={16} />
        Connected to {getNetworkName(chainId!)}
      </div>
    );
  }

  return (
    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 text-red-200 mb-3">
        <AlertCircle size={20} />
        <span className="font-medium">Wrong Network</span>
      </div>
      <p className="text-red-200 text-sm mb-3">
        You're connected to {getNetworkName(chainId!)}. Please switch to Base Sepolia to play LottoMoji.
      </p>
      <button
        onClick={handleSwitchNetwork}
        disabled={isPending}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
      >
        {isPending ? 'Switching...' : 'Switch to Base Sepolia'}
      </button>
    </div>
  );
}; 