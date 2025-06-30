import React from 'react';
import { formatTimeSaoPaulo } from '../utils/timezone';

interface TimerProps {
  seconds: number;
  isContractConnected?: boolean;
  currentGameDay?: number;
  nextDrawTime?: number;
  error?: string | null;
}

export const Timer: React.FC<TimerProps> = ({ 
  seconds, 
  isContractConnected = false,
  currentGameDay,
  nextDrawTime,
  error 
}) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-white p-4 rounded-xl bg-purple-600/80 backdrop-blur-sm shadow-lg mb-2">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
      </div>

      {/* Contract connection status */}
      <div className="mt-2 flex items-center justify-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isContractConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
        <span className={`text-xs ${isContractConnected ? 'text-green-300' : 'text-red-300'}`}>
          {isContractConnected ? 'Contract Synced' : 'Contract Offline'}
        </span>
      </div>

      {/* Game day information */}
      {isContractConnected && currentGameDay && (
        <div className="text-white/50 text-xs mt-1">
          Game Day #{currentGameDay}
        </div>
      )}

      {/* Show error if any */}
      {error && (
        <div className="text-red-400 text-xs mt-1">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};