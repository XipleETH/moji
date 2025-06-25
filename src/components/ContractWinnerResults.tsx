import React from 'react';
import { Trophy } from 'lucide-react';
import { useContractDrawResults } from '../hooks/useContractDrawResults';

export const ContractWinnerResults: React.FC = () => {
  const { latestResult, loading, error } = useContractDrawResults();

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-white/90 rounded-xl backdrop-blur-sm shadow-lg">
        <h2 className="text-xl font-bold mb-3 flex items-center justify-center">
          <Trophy className="mr-2" size={20} /> Latest Results
        </h2>
        <div className="text-center py-4">
          <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading latest results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-4 bg-white/90 rounded-xl backdrop-blur-sm shadow-lg">
        <h2 className="text-xl font-bold mb-3 flex items-center justify-center">
          <Trophy className="mr-2" size={20} /> Latest Results
        </h2>
        <div className="text-center py-4">
          <p className="text-red-600 text-sm">Error loading results: {error}</p>
        </div>
      </div>
    );
  }

  // Si no hay resultados o no se ha ejecutado ningún sorteo
  if (!latestResult || latestResult.totalDrawsExecuted === 0) {
    return (
      <div className="mb-6 p-4 bg-white/90 rounded-xl backdrop-blur-sm shadow-lg">
        <h2 className="text-xl font-bold mb-3 flex items-center justify-center">
          <Trophy className="mr-2" size={20} /> Latest Results
        </h2>
        <div className="text-center mb-4">
          <div className="text-sm font-medium mb-2 text-gray-700">Winning Numbers:</div>
          <div className="flex justify-center items-center gap-2 mb-3">
            <span className="text-gray-500 text-sm">Waiting for first draw...</span>
          </div>
        </div>
        <div className="text-center text-gray-600 text-sm py-2">
          No draws executed yet. Try your luck in the first draw! 🍀
        </div>
      </div>
    );
  }

  // Si hay resultados pero el sorteo no se ha ejecutado para el último período
  if (!latestResult.drawn) {
    return (
      <div className="mb-6 p-4 bg-white/90 rounded-xl backdrop-blur-sm shadow-lg">
        <h2 className="text-xl font-bold mb-3 flex items-center justify-center">
          <Trophy className="mr-2" size={20} /> Latest Results
        </h2>
        <div className="text-center mb-4">
          <div className="text-sm font-medium mb-2 text-gray-700">Winning Numbers:</div>
          <div className="flex justify-center items-center gap-2 mb-3">
            {latestResult.winningEmojis.length > 0 ? (
              latestResult.winningEmojis.map((emoji, index) => (
                <span key={index} className="text-2xl bg-purple-100 p-2 rounded-lg shadow-sm">{emoji}</span>
              ))
            ) : (
              <span className="text-gray-500 text-sm">Waiting for next draw...</span>
            )}
          </div>
        </div>
        <div className="text-center text-gray-600 text-sm py-2">
          {latestResult.totalDrawsExecuted > 0 ? (
            <>Results from previous draw. Next draw coming soon! 🎲</>
          ) : (
            <>Waiting for first draw... 🍀</>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-white/90 rounded-xl backdrop-blur-sm shadow-lg">
      <h2 className="text-xl font-bold mb-3 flex items-center justify-center">
        <Trophy className="mr-2" size={20} /> Latest Results
      </h2>
      
      {/* Winning Numbers */}
      <div className="text-center mb-4">
        <div className="text-sm font-medium mb-2 text-gray-700">Winning Numbers:</div>
        <div className="flex justify-center items-center gap-2 mb-3">
          {latestResult.winningEmojis.map((emoji, index) => (
            <span key={index} className="text-2xl bg-purple-100 p-2 rounded-lg shadow-sm">{emoji}</span>
          ))}
        </div>
        
        {/* Draw Info */}
        <div className="text-xs text-gray-500 mb-3">
          Game Day: {latestResult.gameDay} • Total Draws: {latestResult.totalDrawsExecuted}
        </div>
      </div>
      
      {/* Status Message */}
      <div className="text-center text-gray-600 text-sm py-2">
        {latestResult.distributed ? (
          <>Draw completed and prizes distributed! 🎉</>
        ) : (
          <>Draw completed, processing winners... ⏳</>
        )}
      </div>
    </div>
  );
}; 