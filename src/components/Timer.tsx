import React from 'react';

interface TimerProps {
  seconds: number;
}

export const Timer: React.FC<TimerProps> = ({ seconds }) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return (
    <div className="text-4xl font-bold text-white text-center p-4 rounded-xl bg-purple-600/80 backdrop-blur-sm shadow-lg">
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
    </div>
  );
};