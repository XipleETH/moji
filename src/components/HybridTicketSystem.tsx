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