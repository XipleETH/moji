import React from 'react';
import { BlockchainTicketGenerator } from './BlockchainTicketGenerator';

interface HybridTicketSystemProps {
  onGenerateTicket?: (numbers: string[]) => Promise<void>;
  disabled?: boolean;
  ticketCount?: number;
  maxTickets?: number;
  userTokens?: number;
  tokensUsed?: number;
  queueStatus?: any;
  rateLimitStatus?: any;
  className?: string;
}

export const HybridTicketSystem: React.FC<HybridTicketSystemProps> = (props) => {
  const handleTicketPurchased = (txHash: string) => {
    console.log('✅ Blockchain ticket purchased:', txHash);
  };

  return (
    <div className={props.className}>
      {/* Header with blockchain info */}
      <div className="mb-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-2xl">🔗</span>
          <div>
            <h3 className="text-lg font-bold text-white">Blockchain Lottery System</h3>
            <div className="text-sm text-gray-300">
              Powered by Base Sepolia • Chainlink VRF & Automation
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-green-400">✅</span>
          <span className="text-gray-300">
            <strong>Real USDC tickets</strong> • NFT generation • Automated draws • Transparent results
          </span>
        </div>
      </div>

      {/* Blockchain ticket generator */}
      <BlockchainTicketGenerator 
        onTicketPurchased={handleTicketPurchased}
        className="w-full"
      />

      {/* Footer info */}
      <div className="mt-4 text-center text-xs text-gray-500">
        💡 All tickets are blockchain-based using USDC. Results are verifiably random using Chainlink VRF.
      </div>
    </div>
  );
}; 