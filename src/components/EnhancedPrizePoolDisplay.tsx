import React from 'react';
import { useBlockchainPools, formatUSDCCompact } from '../hooks/useBlockchainPools';

interface EnhancedPrizePoolDisplayProps {
  className?: string;
  showReserves?: boolean;
  showAccumulated?: boolean;
  compact?: boolean;
}

/**
 * Componente mejorado que muestra el sistema completo de pools con reservas
 * Integra Chainlink Automation + Firebase + Sistema de Reservas Mejorado
 */
export const EnhancedPrizePoolDisplay: React.FC<EnhancedPrizePoolDisplayProps> = ({
  className = '',
  showReserves = true,
  showAccumulated = true,
  compact = false
}) => {
  const {
    mainPools,
    reserves,
    accumulated,
    isLoading,
    error,
    lastUpdated,
    refreshPools
  } = useBlockchainPools();

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded mb-3"></div>
          <div className="h-8 bg-white/20 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-red-900 to-purple-900 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-400 text-sm mb-2">⚠️ Error Blockchain</div>
          <div className="text-red-300 text-xs mb-3">{error}</div>
          <button onClick={refreshPools} className="px-4 py-2 bg-red-600 text-white text-xs rounded">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const totalMainPools = mainPools.firstPrize + mainPools.secondPrize + mainPools.thirdPrize;
  const totalReserves = reserves.firstPrizeReserve + reserves.secondPrizeReserve + reserves.thirdPrizeReserve;
  const grandTotal = totalMainPools + totalReserves;

  return (
    <div className={`bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg p-6 text-white ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🏆</span>
          <div>
            <h3 className="text-xl font-bold">Sistema de Pools Mejorado</h3>
            <div className="text-sm text-gray-300">🔗 Chainlink Automation + Reservas</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-yellow-400">
            {formatUSDCCompact(grandTotal)}
          </div>
          <div className="text-sm text-gray-300">USDC Total</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">🥇</span>
            <span className="text-xs text-white/80">80%</span>
          </div>
          <div className="text-sm font-medium">1er Premio</div>
          <div className="text-lg font-bold">{formatUSDCCompact(mainPools.firstPrize)}</div>
        </div>

        <div className="bg-gradient-to-r from-gray-400 to-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">🥈</span>
            <span className="text-xs text-white/80">10%</span>
          </div>
          <div className="text-sm font-medium">2do Premio</div>
          <div className="text-lg font-bold">{formatUSDCCompact(mainPools.secondPrize)}</div>
        </div>

        <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">🥉</span>
            <span className="text-xs text-white/80">5%</span>
          </div>
          <div className="text-sm font-medium">3er Premio</div>
          <div className="text-lg font-bold">{formatUSDCCompact(mainPools.thirdPrize)}</div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">🛠️</span>
            <span className="text-xs text-white/80">5%</span>
          </div>
          <div className="text-sm font-medium">Desarrollo</div>
          <div className="text-lg font-bold">{formatUSDCCompact(mainPools.development)}</div>
        </div>
      </div>

      {showReserves && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h4 className="text-lg font-semibold">Reserve Pools (20% diario)</h4>
              <span className="px-2 py-1 bg-green-600/30 text-green-300 text-xs rounded">NUEVO</span>
            </div>
            <div className="text-green-400 font-semibold">{formatUSDCCompact(totalReserves)} USDC</div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">🛡️</span>
                <span className="text-xs text-green-300">+20%</span>
              </div>
              <div className="text-sm font-medium text-green-300">Reserve Pool 1</div>
              <div className="text-lg font-bold">{formatUSDCCompact(reserves.firstPrizeReserve)}</div>
              <div className="text-xs text-green-400 mt-1">Respaldo 1er Premio</div>
            </div>

            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">🛡️</span>
                <span className="text-xs text-green-300">+20%</span>
              </div>
              <div className="text-sm font-medium text-green-300">Reserve Pool 2</div>
              <div className="text-lg font-bold">{formatUSDCCompact(reserves.secondPrizeReserve)}</div>
              <div className="text-xs text-green-400 mt-1">Respaldo 2do Premio</div>
            </div>

            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">🛡️</span>
                <span className="text-xs text-green-300">+20%</span>
              </div>
              <div className="text-sm font-medium text-green-300">Reserve Pool 3</div>
              <div className="text-lg font-bold">{formatUSDCCompact(reserves.thirdPrizeReserve)}</div>
              <div className="text-xs text-green-400 mt-1">Respaldo 3er Premio</div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-white/20 pt-4">
        <div className="flex items-center justify-between text-sm text-gray-300">
          <div className="flex items-center space-x-4">
            <span>🔄 Auto: 2min</span>
            <span>⛓️ Chainlink</span>
            <span>🕒 03:00 SP</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Actualizado: {new Date(lastUpdated).toLocaleTimeString()}</span>
            <button onClick={refreshPools} className="text-blue-400 hover:text-blue-300">🔄</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPrizePoolDisplay;

export default EnhancedPrizePoolDisplay; 