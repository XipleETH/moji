import React from 'react';
import { formatTimeSaoPaulo } from '../utils/timezone';

interface TimerProps {
  seconds: number;
}

export const Timer: React.FC<TimerProps> = ({ seconds }) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-white p-4 rounded-xl bg-purple-600/80 backdrop-blur-sm shadow-lg mb-2">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
      </div>
      <div className="text-white/70 text-sm">
        🇧🇷 Next draw at midnight São Paulo time
      </div>
      <div className="text-white/60 text-xs mt-1">
        {formatTimeSaoPaulo(new Date()).split(',')[0]} • SP Time
      </div>
    </div>
  );
};