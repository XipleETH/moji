import React from 'react';
import { X, Clock, Database } from 'lucide-react';
import { useContractGameHistory } from '../hooks/useContractGameHistory';

interface ContractGameHistoryModalProps {
  onClose: () => void;
}

export const ContractGameHistoryModal: React.FC<ContractGameHistoryModalProps> = ({ onClose }) => {
  const { history, loading, error } = useContractGameHistory();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (item: any) => {
    if (!item.drawn) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending Draw
        </span>
      );
    } else if (item.drawn && !item.distributed) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Database className="w-3 h-3 mr-1" />
          Processing
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Completed
        </span>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Game History</h2>
            <p className="text-sm text-white/80">Blockchain-powered results</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-4rem)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">Loading blockchain history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Error loading history: {error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Database className="mx-auto w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No draws recorded yet</p>
              <p className="text-gray-400 text-sm mt-2">History will appear after the first draw</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((game, index) => (
                <div 
                  key={`${game.gameDay}-${index}`} 
                  className="bg-white rounded-lg p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  {/* Header with date and status */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        {formatDate(game.lastDrawTime)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Game Day: {game.gameDay}
                      </p>
                    </div>
                    {getStatusBadge(game)}
                  </div>
                  
                  {/* Winning Numbers */}
                  <div className="mb-4">
                    <span className="text-sm font-semibold text-gray-700 block mb-2">
                      Winning Numbers:
                    </span>
                    <div className="flex gap-2 justify-center">
                      {game.winningEmojis.map((emoji, i) => (
                        <span 
                          key={i} 
                          className="text-2xl bg-purple-100 p-2 rounded-lg shadow-sm border border-purple-200"
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pool Information */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pool Total:</span>
                      <span className="font-semibold text-gray-800">
                        ${parseFloat(game.totalCollected).toFixed(1)} USDC
                      </span>
                    </div>
                  </div>

                  {/* Winners Status */}
                  <div className="mt-3 text-center">
                    {game.hasWinners ? (
                      <div className="text-green-600 text-sm font-medium">
                        🎉 Winners found! Prizes distributed.
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        No winners
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with contract info */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Data sourced directly from blockchain contract • Updates every 60 seconds
          </p>
        </div>
      </div>
    </div>
  );
}; 