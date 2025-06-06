import React from 'react';
import { useReadContract } from 'wagmi';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { getContractAddresses } from '../contracts/addresses';
import LottoMojiPrizePoolABI from '../contracts/abis/LottoMojiPrizePool.json';

export const DebugEthPrice: React.FC = () => {
  const { chainId, address, isConnected } = useAccount();
  const contracts = chainId ? getContractAddresses(chainId) : null;
  
  const { data: ethPrice, error: ethPriceError, isLoading: ethPriceLoading } = useReadContract({
    address: contracts?.LottoMojiPrizePool as `0x${string}`,
    abi: LottoMojiPrizePoolABI.abi,
    functionName: 'getETHPrice',
    query: {
      enabled: !!contracts?.LottoMojiPrizePool && chainId === 84532,
    }
  });
  
  const { data: ethAmount, error: ethAmountError, isLoading: ethAmountLoading } = useReadContract({
    address: contracts?.LottoMojiPrizePool as `0x${string}`,
    abi: LottoMojiPrizePoolABI.abi,
    functionName: 'getETHAmountForTicket',
    query: {
      enabled: !!contracts?.LottoMojiPrizePool && chainId === 84532,
    }
  });
  
  if (!isConnected) return <div className="text-red-400">Wallet not connected</div>;
  if (chainId !== 84532) return <div className="text-yellow-400">Wrong network</div>;
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-bold mb-4">🔍 ETH Price Debug</h3>
      
      <div className="space-y-2">
        <div>
          ETH Price: {ethPriceLoading ? 'Loading...' : ethPriceError ? `Error: ${ethPriceError.message}` : ethPrice ? `$${(Number(ethPrice) / 1e6).toFixed(2)}` : 'No data'}
        </div>
        
        <div>
          ETH Amount: {ethAmountLoading ? 'Loading...' : ethAmountError ? `Error: ${ethAmountError.message}` : ethAmount ? `${formatEther(ethAmount as bigint)} ETH` : 'No data'}
        </div>
      </div>
    </div>
  );
}; 