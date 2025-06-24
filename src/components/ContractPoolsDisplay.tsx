import React from 'react';
import { useContractPools } from '../hooks/useContractPools';

const formatUSDC = (amount: string) => {
  const num = parseFloat(amount);
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(num < 1 ? 2 : 0)}`;
};

const formatTime = (seconds: number) => {
  if (seconds <= 0) return 'Drawing...';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const ContractPoolsDisplay: React.FC = () => {
  const {
    mainPools,
    reserves,
    dailyPool,
    timeToNextDraw,
    automationActive,
    gameActive,
    upkeepNeeded,
    totalUSDC,
    reserveTotalUSDC,
    loading,
    error
  } = useContractPools();

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/20">
        <div className="animate-pulse">
          <div className="h-6 bg-purple-500/20 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-purple-500/20 rounded w-3/4"></div>
            <div className="h-4 bg-purple-500/20 rounded w-1/2"></div>
            <div className="h-4 bg-purple-500/20 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 rounded-xl p-6 border border-red-500/20">
        <h3 className="text-red-400 font-bold mb-2">⚠️ Connection Error</h3>
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  // Calcular totales de premios (acumulado + diario)
  const totalFirstPrize = parseFloat(mainPools.firstPrizeAccumulated) + parseFloat(dailyPool.firstPrizeDaily);
  const totalSecondPrize = parseFloat(mainPools.secondPrizeAccumulated) + parseFloat(dailyPool.secondPrizeDaily);
  const totalThirdPrize = parseFloat(mainPools.thirdPrizeAccumulated) + parseFloat(dailyPool.thirdPrizeDaily);
  const totalDevelopment = parseFloat(mainPools.developmentAccumulated) + parseFloat(dailyPool.developmentDaily);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🏆 Enhanced Pool System
            </h2>
            <p className="text-purple-300 text-sm">🔗 Chainlink Automation + Reserves</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{formatUSDC(totalUSDC)}</div>
            <div className="text-purple-300 text-sm">USDC Total</div>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4 text-sm">
          <div className={`flex items-center gap-1 ${gameActive ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${gameActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {gameActive ? 'Active' : 'Paused'}
          </div>
          <div className={`flex items-center gap-1 ${automationActive ? 'text-blue-400' : 'text-gray-400'}`}>
            ⛓️ Chainlink {automationActive ? 'ON' : 'OFF'}
          </div>
          <div className="text-yellow-400">
            🕒 {formatTime(timeToNextDraw)}
          </div>
          {upkeepNeeded && (
            <div className="text-orange-400 animate-pulse">
              🔄 Upkeep Ready
            </div>
          )}
        </div>
      </div>

      {/* Main Pools */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-xl p-4 border border-yellow-500/20">
          <div className="text-yellow-400 text-2xl mb-2">🥇</div>
          <div className="text-yellow-100 text-sm mb-1">80% 1st Prize</div>
          <div className="text-white text-xl font-bold">{formatUSDC(totalFirstPrize.toString())}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-xl p-4 border border-gray-500/20">
          <div className="text-gray-300 text-2xl mb-2">🥈</div>
          <div className="text-gray-200 text-sm mb-1">10% 2nd Prize</div>
          <div className="text-white text-xl font-bold">{formatUSDC(totalSecondPrize.toString())}</div>
        </div>

        <div className="bg-gradient-to-br from-amber-800/30 to-yellow-800/30 rounded-xl p-4 border border-amber-500/20">
          <div className="text-amber-400 text-2xl mb-2">🥉</div>
          <div className="text-amber-200 text-sm mb-1">5% 3rd Prize</div>
          <div className="text-white text-xl font-bold">{formatUSDC(totalThirdPrize.toString())}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-800/30 to-indigo-800/30 rounded-xl p-4 border border-purple-500/20">
          <div className="text-purple-400 text-2xl mb-2">🛠️</div>
          <div className="text-purple-200 text-sm mb-1">5% Development</div>
          <div className="text-white text-xl font-bold">{formatUSDC(totalDevelopment.toString())}</div>
        </div>
      </div>

      {/* Reserve Pools */}
      <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-xl p-6 border border-blue-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Reserve Pools (20% daily) <span className="bg-blue-500 text-xs px-2 py-1 rounded-full">NEW</span>
            </h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{formatUSDC(reserveTotalUSDC)} USDC</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-blue-800/20 rounded-lg p-4 border border-blue-400/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-blue-400 text-xl">🛡️</div>
              <div className="text-green-400 text-sm font-bold">+20%</div>
            </div>
            <div className="text-blue-200 text-sm mb-1">Reserve Pool 1</div>
            <div className="text-white text-lg font-bold mb-1">{formatUSDC(reserves.firstPrizeReserve1)}</div>
            <div className="text-blue-300 text-xs">1st Prize Backup</div>
          </div>

          <div className="bg-blue-800/20 rounded-lg p-4 border border-blue-400/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-blue-400 text-xl">🛡️</div>
              <div className="text-green-400 text-sm font-bold">+20%</div>
            </div>
            <div className="text-blue-200 text-sm mb-1">Reserve Pool 2</div>
            <div className="text-white text-lg font-bold mb-1">{formatUSDC(reserves.secondPrizeReserve2)}</div>
            <div className="text-blue-300 text-xs">2nd Prize Backup</div>
          </div>

          <div className="bg-blue-800/20 rounded-lg p-4 border border-blue-400/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-blue-400 text-xl">🛡️</div>
              <div className="text-green-400 text-sm font-bold">+20%</div>
            </div>
            <div className="text-blue-200 text-sm mb-1">Reserve Pool 3</div>
            <div className="text-white text-lg font-bold mb-1">{formatUSDC(reserves.thirdPrizeReserve3)}</div>
            <div className="text-blue-300 text-xs">3rd Prize Backup</div>
          </div>
        </div>
      </div>

      {/* Daily Pool Info */}
      <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-500/20">
        <h4 className="text-green-400 font-bold mb-2">📅 Today's Pool</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-green-300">Collected</div>
            <div className="text-white font-bold">{formatUSDC(dailyPool.totalCollected)}</div>
          </div>
          <div>
            <div className="text-green-300">Main (80%)</div>
            <div className="text-white font-bold">{formatUSDC(dailyPool.mainPoolPortion)}</div>
          </div>
          <div>
            <div className="text-green-300">Reserve (20%)</div>
            <div className="text-white font-bold">{formatUSDC(dailyPool.reservePortion)}</div>
          </div>
          <div>
            <div className="text-green-300">Status</div>
            <div className={`font-bold ${dailyPool.drawn ? 'text-blue-400' : 'text-yellow-400'}`}>
              {dailyPool.drawn ? 'Drawn' : 'Active'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 