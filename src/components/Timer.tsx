import React from 'react';
import { getLotteryTimeString } from '../config/lottery';

interface TimerProps {
  seconds: number;
}

export const Timer: React.FC<TimerProps> = ({ seconds }) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-white p-4 rounded-xl bg-purple-600/80 backdrop-blur-sm shadow-lg">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
      </div>
      <div className="mt-2 text-sm text-white/80 bg-purple-500/50 rounded-lg px-3 py-1 backdrop-blur-sm">
        📅 Próximo sorteo todos los días a las {getLotteryTimeString()}
      </div>
    </div>
  );
};