import React from 'react';
import { useContractGame } from '../hooks/useContractGame';
import { formatEther } from 'viem';
import { DebugEthPrice } from './DebugEthPrice';

interface PaymentMethodSelectorProps {
  paymentMethod: 'ETH' | 'USDC';
  onPaymentMethodChange: (method: 'ETH' | 'USDC') => void;
  disabled?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  disabled = false
}) => {
  const {
    ethPrice,
    usdcBalance,
    usdcAllowance,
    needsUsdcApproval,
    approveUSDC,
    isTransactionPending
  } = useContractGame();

  const handleApproveUSDC = async () => {
    try {
      await approveUSDC();
    } catch (error: any) {
      console.error('Error approving USDC:', error);
      alert(`Error approving USDC: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector de método de pago */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-3">💳 Payment Method</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* ETH Option */}
          <button
            onClick={() => onPaymentMethodChange('ETH')}
            disabled={disabled}
            className={`p-3 rounded-lg border-2 transition-colors ${
              paymentMethod === 'ETH'
                ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="text-center">
              <div className="text-lg font-bold">🔷 ETH</div>
              <div className="text-sm">
                {ethPrice ? `~${ethPrice} ETH` : 'Loading...'}
              </div>
              <div className="text-xs text-gray-400">≈ $2.00 USD</div>
            </div>
          </button>

          {/* USDC Option */}
          <button
            onClick={() => onPaymentMethodChange('USDC')}
            disabled={disabled}
            className={`p-3 rounded-lg border-2 transition-colors ${
              paymentMethod === 'USDC'
                ? 'border-green-500 bg-green-500/20 text-green-400'
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="text-center">
              <div className="text-lg font-bold">💵 USDC</div>
              <div className="text-sm">2.00 USDC</div>
              <div className="text-xs text-gray-400">Fixed price</div>
            </div>
          </button>
        </div>
      </div>

      {/* USDC Status y Aprobación */}
      {paymentMethod === 'USDC' && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
          <h4 className="text-green-400 font-semibold">💵 USDC Status</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Balance:</span>
              <span className="text-white">{usdcBalance.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Allowance:</span>
              <span className="text-white">{usdcAllowance.toFixed(2)} USDC</span>
            </div>
          </div>

          {usdcBalance < 2 && (
            <div className="bg-red-500/20 border border-red-500 p-3 rounded">
              <p className="text-red-300 text-sm">
                ❌ Insufficient USDC balance. You need at least 2 USDC.
              </p>
              <p className="text-red-400 text-xs mt-1">
                Get USDC on Base Sepolia from a faucet or bridge from mainnet.
              </p>
            </div>
          )}

          {usdcBalance >= 2 && needsUsdcApproval && (
            <div className="bg-yellow-500/20 border border-yellow-500 p-3 rounded">
              <p className="text-yellow-300 text-sm mb-3">
                ⚠️ You need to approve USDC spending first.
              </p>
              <button
                onClick={handleApproveUSDC}
                disabled={isTransactionPending}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTransactionPending ? 'Approving...' : 'Approve USDC'}
              </button>
            </div>
          )}

          {usdcBalance >= 2 && !needsUsdcApproval && (
            <div className="bg-green-500/20 border border-green-500 p-3 rounded">
              <p className="text-green-300 text-sm">
                ✅ USDC approved and ready to use!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Debug ETH Price (solo en desarrollo y cuando ETH está seleccionado) */}
      {import.meta.env.DEV && paymentMethod === 'ETH' && (
        <DebugEthPrice />
      )}
    </div>
  );
}; 