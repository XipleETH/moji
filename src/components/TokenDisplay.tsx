import React, { useState, useEffect } from 'react';
import { Coins, Clock, Trophy } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { getUserTokenTransactions } from '../firebase/tokens';

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
  const { user } = useWallet();
  const [tokensWon, setTokensWon] = useState<number>(0);
  const [isLoadingWon, setIsLoadingWon] = useState<boolean>(false);
  
  const tokensUsedToday = tokensUsed;
  const isLowTokens = tokensAvailable <= 2;
  const isOutOfTokens = tokensAvailable === 0;

  // Cargar tokens ganados del usuario
  useEffect(() => {
    const loadTokensWon = async () => {
      if (!user?.id) return;
      
      setIsLoadingWon(true);
      try {
        const transactions = await getUserTokenTransactions(user.id);
        const prizeTransactions = transactions.filter(t => 
          t.type === 'prize_first' || 
          t.type === 'prize_second' || 
          t.type === 'prize_third'
        );
        
        const totalWon = prizeTransactions.reduce((sum, t) => sum + t.amount, 0);
        setTokensWon(totalWon);
      } catch (error) {
        console.error('Error cargando tokens ganados:', error);
        setTokensWon(0);
      } finally {
        setIsLoadingWon(false);
      }
    };

    loadTokensWon();
  }, [user?.id]);

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
      
      <div className="space-y-2">
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
        
        {/* Tokens ganados */}
        <div className="flex justify-between items-center text-sm border-t border-white/20 pt-2">
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-white/60">Tokens won:</span>
          </div>
          <span className="text-yellow-400 font-semibold">
            {isLoadingWon ? '...' : tokensWon}
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