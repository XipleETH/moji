import React from 'react';
import { usePrizePool, formatTimeUntilDistribution, formatPoolPercentage, getPoolDisplayName } from '../hooks/usePrizePool';

interface PrizePoolDisplayProps {
  className?: string;
  showDetailedBreakdown?: boolean;
  showDebugControls?: boolean;
}

export const PrizePoolDisplay: React.FC<PrizePoolDisplayProps> = ({ 
  className = '',
  showDetailedBreakdown = false,
  showDebugControls = false
}) => {
  const { 
    pool, 
    totalParticipants, 
    totalTicketsSold, 
    averageTokensPerParticipant,
    timeUntilDistribution,
    canDistribute,
    isLoading, 
    error,
    triggerDistribution,
    refreshStats
  } = usePrizePool();

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded mb-3"></div>
          <div className="h-8 bg-white/20 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-white/20 rounded w-3/4"></div>
            <div className="h-3 bg-white/20 rounded w-1/2"></div>
            <div className="h-3 bg-white/20 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-red-900 to-purple-900 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-400 text-sm mb-2">Error en Pool de Premios</div>
          <div className="text-red-300 text-xs">{error}</div>
          <button 
            onClick={refreshStats}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className={`bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <div className="text-sm">Pool de Premios</div>
          <div className="text-xs mt-2">No disponible</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg p-6 text-white ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🏆</span>
          <h3 className="text-lg font-bold">Pool de Premios</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">
            {pool.totalTokensCollected.toLocaleString()}
          </div>
          <div className="text-xs text-gray-300">Tokens del Día</div>
          {pool.accumulatedFromPreviousDays.totalDaysAccumulated > 0 && (
            <div className="mt-1">
              <div className="text-lg font-semibold text-orange-400">
                +{(pool.accumulatedFromPreviousDays.firstPrize + pool.accumulatedFromPreviousDays.secondPrize + pool.accumulatedFromPreviousDays.thirdPrize).toLocaleString()}
              </div>
              <div className="text-xs text-orange-300">
                Acumulado {pool.accumulatedFromPreviousDays.totalDaysAccumulated} día{pool.accumulatedFromPreviousDays.totalDaysAccumulated > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas Básicas */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-300">{totalParticipants}</div>
          <div className="text-xs text-gray-300">Participantes</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-300">{totalTicketsSold}</div>
          <div className="text-xs text-gray-300">Tickets Vendidos</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-orange-300">
            {averageTokensPerParticipant.toFixed(1)}
          </div>
          <div className="text-xs text-gray-300">Promedio/Usuario</div>
        </div>
      </div>

      {/* Estado de Distribución */}
      <div className="mb-4">
        {pool.poolsDistributed ? (
          <div className="flex items-center justify-center space-x-2 p-3 bg-green-600/30 rounded-lg">
            <span className="text-green-400">✓</span>
            <span className="text-sm">Pool distribuida en premios específicos</span>
          </div>
        ) : timeUntilDistribution !== null ? (
          <div className="flex items-center justify-center space-x-2 p-3 bg-yellow-600/30 rounded-lg">
            <span className="text-yellow-400">⏰</span>
            <span className="text-sm">{formatTimeUntilDistribution(timeUntilDistribution)}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2 p-3 bg-red-600/30 rounded-lg">
            <span className="text-red-400">🔒</span>
            <span className="text-sm">Pool cerrada para distribución</span>
          </div>
        )}
      </div>

      {/* Distribución Detallada (opcional) */}
      {showDetailedBreakdown && pool.poolsDistributed && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-300 mb-3">Distribución por Premios:</div>
          
          {/* Premios principales */}
          {['firstPrize', 'secondPrize', 'thirdPrize'].map((prizeType) => {
            const prizeAmount = pool.pools[prizeType as keyof typeof pool.pools] || 0;
            
            return (
              <div key={prizeType} className="py-2 px-3 bg-white/10 rounded">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getPoolDisplayName(prizeType as keyof typeof pool.pools)}</span>
                    <span className="text-xs text-gray-400">
                      ({formatPoolPercentage(prizeType as keyof typeof pool.pools)})
                    </span>
                  </div>
                  <div className="text-sm font-medium">
                    {prizeAmount.toLocaleString()} tokens
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Pool de desarrollo */}
          <div className="py-2 px-3 bg-white/10 rounded">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Desarrollo</span>
                <span className="text-xs text-gray-400">(5%)</span>
              </div>
              <div className="text-sm font-medium">
                {pool.pools.development.toLocaleString()} tokens
              </div>
            </div>
          </div>
          
          {/* Reservas Activadas */}
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="text-xs text-gray-400 mb-2">Reservas Activadas:</div>
            <div className="flex space-x-4 text-xs">
              <span className={`px-2 py-1 rounded ${pool.reserves.firstPrizeActivated ? 'bg-green-600/30 text-green-300' : 'bg-gray-600/30 text-gray-400'}`}>
                1er Premio {pool.reserves.firstPrizeActivated ? '✓' : '✗'}
              </span>
              <span className={`px-2 py-1 rounded ${pool.reserves.secondPrizeActivated ? 'bg-green-600/30 text-green-300' : 'bg-gray-600/30 text-gray-400'}`}>
                2do Premio {pool.reserves.secondPrizeActivated ? '✓' : '✗'}
              </span>
              <span className={`px-2 py-1 rounded ${pool.reserves.thirdPrizeActivated ? 'bg-green-600/30 text-green-300' : 'bg-gray-600/30 text-gray-400'}`}>
                3er Premio {pool.reserves.thirdPrizeActivated ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controles de Debug (solo para desarrollo) */}
      {showDebugControls && import.meta.env.DEV && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-xs text-gray-400 mb-2">Controles de Desarrollo:</div>
          <div className="flex space-x-2">
            <button
              onClick={refreshStats}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              Refrescar
            </button>
            {canDistribute && (
              <button
                onClick={triggerDistribution}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
              >
                Forzar Distribución
              </button>
            )}
            <button
              onClick={() => console.log('Pool State:', pool)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
            >
              Log Estado
            </button>
          </div>
        </div>
      )}

      {/* Información del Día */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Día de Juego: {pool.gameDay}</span>
          <span>Última actualización: {new Date(pool.lastUpdated).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

// Componente compacto para mostrar solo información básica
export const PrizePoolSummary: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { pool, totalParticipants, isLoading } = usePrizePool();

  if (isLoading || !pool) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <span className="text-lg">🏆</span>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <span className="text-lg">🏆</span>
      <div>
        <div className="font-semibold text-yellow-600">
          {pool.totalTokensCollected.toLocaleString()} tokens
        </div>
        <div className="text-xs text-gray-500">
          {totalParticipants} participantes
        </div>
      </div>
    </div>
  );
}; 