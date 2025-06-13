import React, { useEffect, useState } from 'react';
import { Coins, Clock, Trophy } from 'lucide-react';
import { getUserTokenTransactions } from '../firebase/tokens';
import { getCurrentUser } from '../firebase/auth';
import { formatNumber } from '../utils/format';

interface TokenDisplayProps {
  tokensAvailable: number;
  tokensUsed?: number;
  totalDailyTokens?: number;
  className?: string;
}

export function TokenDisplay({ 
  tokensAvailable, 
  tokensUsed = 0, 
  totalDailyTokens = 1000,
  className = "" 
}: TokenDisplayProps) {
  const [totalWonTokens, setTotalWonTokens] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWonTokens = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        const transactions = await getUserTokenTransactions(user.id);
        const wonTokens = transactions
          .filter(tx => tx.type === 'PRIZE_WIN')
          .reduce((total, tx) => total + tx.amount, 0);
        
        setTotalWonTokens(wonTokens);
      } catch (error) {
        console.error('Error loading won tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWonTokens();
  }, []);

  const tokensUsedToday = tokensUsed;
  const isLowTokens = tokensAvailable <= 2;
  const isOutOfTokens = tokensAvailable === 0;

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Coins className={`w-5 h-5 ${isOutOfTokens ? 'text-red-400' : isLowTokens ? 'text-yellow-400' : 'text-green-400'}`} />
          <span className="font-semibold">Daily Tokens</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-white/70">
          <Clock className="w-4 h-4" />
          <span>Resets daily</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-white/80">Available:</span>
          <span className={`text-xl font-bold ${isOutOfTokens ? 'text-red-400' : isLowTokens ? 'text-yellow-400' : 'text-green-400'}`}>
            {tokensAvailable}
          </span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/60">Used today:</span>
          <span className="text-white/80">{tokensUsedToday}</span>
        </div>

        {/* Nueva sección de Tokens Ganados */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-white/60">Tokens Won:</span>
          </div>
          <span className="text-yellow-400 font-medium">
            {isLoading ? '...' : formatNumber(totalWonTokens)}
          </span>
        </div>
        
        {/* Barra de progreso */}
        <div className="w-full bg-white/20 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isOutOfTokens ? 'bg-red-500' : 
              isLowTokens ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}
            style={{ width: `${(tokensAvailable / totalDailyTokens) * 100}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-white/60 text-center">
          {isOutOfTokens ? (
            "No tokens left! Wait for daily reset."
          ) : isLowTokens ? (
            "Running low on tokens!"
          ) : (
            `${tokensAvailable} tickets remaining for today`
          )}
        </div>
      </div>
    </div>
  );
} 