import React from 'react';
import { useAccount } from 'wagmi';
import { getContractAddresses } from '../contracts/addresses';

export const USDCVerification: React.FC = () => {
  const { chainId } = useAccount();
  const contracts = chainId ? getContractAddresses(chainId) : null;

  if (!chainId || chainId !== 84532) {
    return null;
  }

  return (
    <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 space-y-2">
      <h3 className="text-blue-300 font-bold">🔍 Contract Verification</h3>
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-300">Network:</span>
          <span className="text-white">Base Sepolia (84532)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">USDC Address:</span>
          <span className="text-white font-mono text-xs break-all">
            {contracts?.USDC || 'Not found'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Expected USDC:</span>
          <span className="text-green-300 font-mono text-xs break-all">
            0x036CbD53842c5426634e7929541eC2318f3dCF7e
          </span>
        </div>
        <div className="mt-2 p-2 bg-green-500/20 border border-green-500 rounded">
          <p className="text-green-300 text-xs">
            {contracts?.USDC === "0x036CbD53842c5426634e7929541eC2318f3dCF7e" 
              ? "✅ USDC address matches Base Sepolia testnet" 
              : "❌ USDC address mismatch!"}
          </p>
        </div>
      </div>
    </div>
  );
}; 