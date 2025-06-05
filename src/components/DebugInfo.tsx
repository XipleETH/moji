import React from 'react';
import { useAccount } from 'wagmi';
import { useContractGame } from '../hooks/useContractGame';
import { getContractAddresses } from '../contracts/addresses';

export const DebugInfo: React.FC = () => {
  const { address, isConnected, chainId } = useAccount();
  const { gameState, ethPrice, error } = useContractGame();
  const contracts = chainId ? getContractAddresses(chainId) : null;

  if (!import.meta.env.DEV) return null; // Solo en desarrollo

  return (
    <div className="bg-black/40 text-white text-xs font-mono p-4 rounded-lg mb-4 max-w-4xl mx-auto">
      <h3 className="text-yellow-300 font-bold mb-2">🐛 Debug Info (Development Only)</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-blue-300 font-semibold">Wallet Status</h4>
          <div>Connected: {isConnected ? '✅ Yes' : '❌ No'}</div>
          <div>Address: {address ? `${address.substring(0, 10)}...` : 'None'}</div>
          <div>Chain ID: {chainId || 'Unknown'}</div>
          <div>Valid Chain: {chainId === 84532 ? '✅ Base Sepolia' : '❌ Wrong Network'}</div>
        </div>

        <div>
          <h4 className="text-blue-300 font-semibold">Contract Status</h4>
          <div>Contracts Available: {contracts ? '✅ Yes' : '❌ No'}</div>
          {contracts && (
            <>
              <div>Core: {contracts.LottoMojiCore ? '✅' : '❌'}</div>
              <div>Tickets: {contracts.LottoMojiTickets ? '✅' : '❌'}</div>
              <div>PrizePool: {contracts.LottoMojiPrizePool ? '✅' : '❌'}</div>
            </>
          )}
        </div>

        <div>
          <h4 className="text-blue-300 font-semibold">Game State</h4>
          <div>Loading: {gameState.isLoading ? '⏳ Yes' : '✅ No'}</div>
          <div>Current Round: {gameState.currentRound ? `#${gameState.currentRound.id}` : 'None'}</div>
          <div>Round Active: {gameState.currentRound?.isActive ? '✅ Yes' : '❌ No'}</div>
          <div>ETH Price: {ethPrice || 'Not loaded'}</div>
          <div>User Tickets: {gameState.tickets.length}</div>
        </div>

        <div>
          <h4 className="text-blue-300 font-semibold">Error Status</h4>
          <div>Has Error: {error ? '❌ Yes' : '✅ No'}</div>
          {error && (
            <div className="text-red-300 text-wrap break-words">
              Error: {error.message || 'Unknown'}
            </div>
          )}
        </div>
      </div>

      {contracts && (
        <div className="mt-4">
          <h4 className="text-blue-300 font-semibold">Contract Addresses</h4>
          <div className="text-xs">
            <div>Core: {contracts.LottoMojiCore}</div>
            <div>Tickets: {contracts.LottoMojiTickets}</div>
            <div>PrizePool: {contracts.LottoMojiPrizePool}</div>
          </div>
        </div>
      )}

      <div className="mt-2 text-gray-400">
        💡 This debug info only appears in development mode
      </div>
    </div>
  );
}; 