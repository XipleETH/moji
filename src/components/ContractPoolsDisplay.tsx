import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  const [currentPool, setCurrentPool] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pools = [
    { id: 'main', name: 'Main Pool', icon: '🏆', emoji: '💰', percentage: '80%' },
    { id: 'reserve', name: 'Reserve Pool', icon: '🛡️', emoji: '💰', percentage: '20%' },
    { id: 'today', name: "Today's Pool", icon: '📅', emoji: '💰', percentage: 'Daily' }
  ];

  // Navegación con teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentPool(prev => (prev - 1 + pools.length) % pools.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentPool(prev => (prev + 1) % pools.length);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pools.length]);

  // Touch handlers para swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const endX = e.changedTouches[0].clientX;
    const diffX = startX - endX;

    if (Math.abs(diffX) > 50) { // Mínimo swipe distance
      if (diffX > 0) {
        // Swipe left - next pool
        setCurrentPool(prev => (prev + 1) % pools.length);
      } else {
        // Swipe right - previous pool
        setCurrentPool(prev => (prev - 1 + pools.length) % pools.length);
      }
    }
  };

  // Mouse handlers para desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const endX = e.clientX;
    const diffX = startX - endX;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        setCurrentPool(prev => (prev + 1) % pools.length);
      } else {
        setCurrentPool(prev => (prev - 1 + pools.length) % pools.length);
      }
    }
  };

  // Solo mostrar loading inicial, no en cada update
  if (loading && totalUSDC === '0') {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-4 border border-purple-500/20">
        <div className="animate-pulse">
          <div className="h-4 bg-purple-500/20 rounded mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-purple-500/20 rounded w-3/4"></div>
            <div className="h-3 bg-purple-500/20 rounded w-1/2"></div>
            <div className="h-3 bg-purple-500/20 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 rounded-xl p-4 border border-red-500/20">
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

  const renderMainPool = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 min-h-[80px]">
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-lg p-2 border border-yellow-500/20 text-center">
          <div className="flex items-center justify-between mb-1">
            <div className="text-yellow-400 text-xl">🥇</div>
            <div className="text-yellow-100 text-xs">80%</div>
          </div>
          <div className="text-white text-base font-bold">{formatUSDC(totalFirstPrize.toString())}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-lg p-2 border border-gray-500/20 text-center">
          <div className="flex items-center justify-between mb-1">
            <div className="text-gray-300 text-xl">🥈</div>
            <div className="text-gray-200 text-xs">10%</div>
          </div>
          <div className="text-white text-base font-bold">{formatUSDC(totalSecondPrize.toString())}</div>
        </div>

        <div className="bg-gradient-to-br from-amber-800/30 to-yellow-800/30 rounded-lg p-2 border border-amber-500/20 text-center">
          <div className="flex items-center justify-between mb-1">
            <div className="text-amber-400 text-xl">🥉</div>
            <div className="text-amber-200 text-xs">5%</div>
          </div>
          <div className="text-white text-base font-bold">{formatUSDC(totalThirdPrize.toString())}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-800/30 to-indigo-800/30 rounded-lg p-2 border border-purple-500/20 text-center">
          <div className="flex items-center justify-between mb-1">
            <div className="text-purple-400 text-xl">🛠️</div>
            <div className="text-purple-200 text-xs">5%</div>
          </div>
          <div className="text-white text-base font-bold">{formatUSDC(totalDevelopment.toString())}</div>
        </div>
      </div>
    </div>
  );

  const renderReservePool = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 min-h-[80px]">
        <div className="bg-blue-800/20 rounded-lg p-2 border border-blue-400/20 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-yellow-400 text-base">🥇</span>
            <span className="text-blue-400 text-base">🛡️</span>
          </div>
          <div className="text-white text-base font-bold">
            {formatUSDC(reserves.firstPrizeReserve1)}
          </div>
          {parseFloat(reserves.firstPrizeReserve1) === 0 && parseFloat(dailyPool.reservePortion) > 0 && (
            <div className="text-xs text-yellow-400 mt-1">⏳ Pending</div>
          )}
        </div>

        <div className="bg-blue-800/20 rounded-lg p-2 border border-blue-400/20 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-gray-300 text-base">🥈</span>
            <span className="text-blue-400 text-base">🛡️</span>
          </div>
          <div className="text-white text-base font-bold">
            {formatUSDC(reserves.secondPrizeReserve2)}
          </div>
          {parseFloat(reserves.secondPrizeReserve2) === 0 && parseFloat(dailyPool.reservePortion) > 0 && (
            <div className="text-xs text-yellow-400 mt-1">⏳ Pending</div>
          )}
        </div>

        <div className="bg-blue-800/20 rounded-lg p-2 border border-blue-400/20 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-amber-400 text-base">🥉</span>
            <span className="text-blue-400 text-base">🛡️</span>
          </div>
          <div className="text-white text-base font-bold">
            {formatUSDC(reserves.thirdPrizeReserve3)}
          </div>
          {parseFloat(reserves.thirdPrizeReserve3) === 0 && parseFloat(dailyPool.reservePortion) > 0 && (
            <div className="text-xs text-yellow-400 mt-1">⏳ Pending</div>
          )}
        </div>
      </div>
      
      {parseFloat(reserveTotalUSDC) === 0 && parseFloat(dailyPool.reservePortion) > 0 && (
        <div className="text-center">
          <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded-lg p-2">
            + {formatUSDC(dailyPool.reservePortion)} pending distribution
          </div>
        </div>
      )}
    </div>
  );

  const renderTodayPool = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 min-h-[80px]">
        <div className="bg-green-800/20 rounded-lg p-2 border border-green-400/20 text-center">
          <div className="text-green-300 text-xs mb-1">Collected</div>
          <div className="text-white font-bold text-base">{formatUSDC(dailyPool.totalCollected)}</div>
        </div>
        <div className="bg-purple-800/20 rounded-lg p-2 border border-purple-400/20 text-center">
          <div className="text-purple-300 text-xs mb-1">Main (80%)</div>
          <div className="text-white font-bold text-base">{formatUSDC(dailyPool.mainPoolPortion)}</div>
        </div>
        <div className="bg-blue-800/20 rounded-lg p-2 border border-blue-400/20 text-center">
          <div className="text-blue-300 text-xs mb-1">Reserve (20%)</div>
          <div className="text-white font-bold text-base">{formatUSDC(dailyPool.reservePortion)}</div>
        </div>
        <div className="bg-gray-800/20 rounded-lg p-2 border border-gray-400/20 text-center">
          <div className="text-gray-300 text-xs mb-1">Status</div>
          <div className={`font-bold text-base ${dailyPool.drawn ? 'text-blue-400' : 'text-yellow-400'}`}>
            {dailyPool.drawn ? 'Drawn' : 'Active'}
          </div>
        </div>
      </div>
    </div>
  );

  const getTotalValue = () => {
    switch (currentPool) {
      case 0: return totalUSDC;
      case 1: return reserveTotalUSDC;
      case 2: return dailyPool.totalCollected;
      default: return '0';
    }
  };

  const getGradientClass = () => {
    switch (currentPool) {
      case 0: return 'from-purple-900/30 to-blue-900/30 border-purple-500/20';
      case 1: return 'from-blue-900/30 to-indigo-900/30 border-blue-500/20';
      case 2: return 'from-green-900/30 to-emerald-900/30 border-green-500/20';
      default: return 'from-gray-900/30 to-gray-800/30 border-gray-500/20';
    }
  };

  return (
    <div className={`bg-gradient-to-br ${getGradientClass()} rounded-xl p-3 border transition-all duration-300`}>
      {/* Header con navegación más compacto */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{pools[currentPool].icon}</span>
          <span className="text-white font-semibold text-sm">{pools[currentPool].name}</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl">{pools[currentPool].emoji}</span>
            <span className="text-purple-300 font-semibold text-sm">{pools[currentPool].percentage}</span>
          </div>
          {loading && (
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{formatUSDC(getTotalValue())}</div>
        </div>
      </div>

      {/* Navegación por tabs más compacta */}
      <div className="flex items-center justify-center mb-3 gap-2">
        <button
          onClick={() => setCurrentPool(prev => (prev - 1 + pools.length) % pools.length)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Previous pool"
        >
          <ChevronLeft size={14} className="text-white" />
        </button>
        
        <div className="flex gap-1">
          {pools.map((pool, index) => (
            <button
              key={pool.id}
              onClick={() => setCurrentPool(index)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                index === currentPool
                  ? 'bg-white/30 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {pool.icon} {pool.name.split(' ')[0]}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentPool(prev => (prev + 1) % pools.length)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Next pool"
        >
          <ChevronRight size={14} className="text-white" />
        </button>
      </div>

      {/* Contenido del pool con swipe */}
      <div
        ref={containerRef}
        className="select-none cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
      >
        {currentPool === 0 && renderMainPool()}
        {currentPool === 1 && renderReservePool()}
        {currentPool === 2 && renderTodayPool()}
      </div>

      {/* Indicadores de navegación más compactos */}
      <div className="flex justify-center mt-3 gap-1">
        {pools.map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              index === currentPool ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Instrucciones de uso más pequeñas */}
      <div className="text-center mt-2">
        <div className="text-xs text-white/40">
          ← → Swipe or use arrow keys
        </div>
      </div>
    </div>
  );
}; 