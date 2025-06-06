import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';

export const USDCApprovalButton: React.FC = () => {
  const { address, chainId } = useAccount();
  const [isApproving, setIsApproving] = useState(false);
  
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const LOTTO_ADDRESS = "0x089Cc443794c25CEb744A07EB1372A5977d0D230";

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: [
      {
        "inputs": [
          {"internalType": "address", "name": "owner", "type": "address"},
          {"internalType": "address", "name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'allowance',
    args: address ? [address, LOTTO_ADDRESS] : undefined,
    query: {
      enabled: !!address && chainId === 84532,
    }
  });

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: [
      {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && chainId === 84532,
    }
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  React.useEffect(() => {
    if (isPending || isConfirming) {
      setIsApproving(true);
    } else {
      setIsApproving(false);
    }
  }, [isPending, isConfirming]);

  React.useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        refetchAllowance();
      }, 2000);
    }
  }, [isConfirmed, refetchAllowance]);

  const handleApprove = async () => {
    if (!address || chainId !== 84532) {
      alert('Please connect to Base Sepolia network');
      return;
    }

    try {
      writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: [
          {
            "inputs": [
              {"internalType": "address", "name": "spender", "type": "address"},
              {"internalType": "uint256", "name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'approve',
        args: [LOTTO_ADDRESS, 2000000n],
        gas: 100000n,
      });

    } catch (error: any) {
      console.error('Error approving USDC:', error);
      alert(`Error: ${error.message}`);
      setIsApproving(false);
    }
  };

  if (!address || chainId !== 84532) {
    return null;
  }

  const currentAllowance = allowance ? Number(allowance) / 1e6 : 0;
  const currentBalance = balance ? Number(balance) / 1e6 : 0;
  const needsApproval = currentAllowance < 2;

  return (
    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-yellow-300 font-bold text-lg">💵 USDC Approval</h3>
        <div className="text-right text-sm">
          <div className="text-white">Balance: {currentBalance.toFixed(2)} USDC</div>
          <div className="text-yellow-200">Allowance: {currentAllowance.toFixed(2)} USDC</div>
        </div>
      </div>

      {currentBalance < 2 && (
        <div className="bg-red-500/20 border border-red-500 p-3 rounded">
          <p className="text-red-300 text-sm">
            ❌ You need at least 2 USDC to buy a ticket.
          </p>
        </div>
      )}

      {currentBalance >= 2 && needsApproval && (
        <div className="space-y-2">
          <p className="text-yellow-200 text-sm">
            ⚠️ Before buying with USDC, you need to approve the contract to spend your tokens.
          </p>
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isApproving ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isPending ? 'Confirming...' : 'Processing...'}
              </span>
            ) : (
              'Approve USDC Spending (2 USDC)'
            )}
          </button>
        </div>
      )}

      {currentBalance >= 2 && !needsApproval && (
        <div className="bg-green-500/20 border border-green-500 p-3 rounded">
          <p className="text-green-300 text-sm flex items-center">
            ✅ USDC approved! You can now buy tickets with USDC.
          </p>
        </div>
      )}

      {isConfirmed && (
        <div className="bg-blue-500/20 border border-blue-500 p-3 rounded">
          <p className="text-blue-300 text-sm">
            🎉 Approval successful! The page will update in a moment.
          </p>
        </div>
      )}
    </div>
  );
}; 