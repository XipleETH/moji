import React from 'react';

interface TimerProps {
  seconds: number;
}

export const Timer: React.FC<TimerProps> = ({ seconds }) => {
  // Calcular horas, minutos y segundos para formato de 24 horas
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  // Función para formatear con ceros a la izquierda
  const formatNumber = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 bg-purple-600/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
        {/* Horas */}
        <div className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-white">
            {formatNumber(hours)}
          </div>
          <div className="text-xs text-purple-200 uppercase tracking-wide">
            Horas
          </div>
        </div>
        
        {/* Separador */}
        <div className="text-3xl md:text-4xl font-bold text-white/70">:</div>
        
        {/* Minutos */}
        <div className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-white">
            {formatNumber(minutes)}
          </div>
          <div className="text-xs text-purple-200 uppercase tracking-wide">
            Minutos
          </div>
        </div>
        
        {/* Separador */}
        <div className="text-3xl md:text-4xl font-bold text-white/70">:</div>
        
        {/* Segundos */}
        <div className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-white">
            {formatNumber(remainingSeconds)}
          </div>
          <div className="text-xs text-purple-200 uppercase tracking-wide">
            Segundos
          </div>
        </div>
      </div>
      
      {/* Texto adicional para contexto */}
      <div className="mt-3 text-sm text-white/70">
        ⏰ Sorteo diario a las 8:00 PM
      </div>
    </div>
  );
};