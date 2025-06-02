import React, { useState, useEffect } from 'react';
import { Ticket } from '../types';
import { Trophy, Award, Medal, Ticket as TicketIcon, X } from 'lucide-react';

interface WinnerAnnouncementProps {
  winningNumbers: string[];
  firstPrize: Ticket[];
  secondPrize: Ticket[];
  thirdPrize: Ticket[];
  freePrize?: Ticket[];
  currentUserId?: string;
}

type PrizeCategory = 'first' | 'second' | 'third' | 'free';

export const WinnerAnnouncement: React.FC<WinnerAnnouncementProps> = ({
  winningNumbers,
  firstPrize,
  secondPrize,
  thirdPrize,
  freePrize = [],
  currentUserId
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<PrizeCategory | null>(null);
  
  // Verificar si el usuario actual tiene un ticket ganador
  const userWonFirstPrize = currentUserId && firstPrize.some(ticket => ticket.userId === currentUserId);
  const userWonSecondPrize = currentUserId && secondPrize.some(ticket => ticket.userId === currentUserId);
  const userWonThirdPrize = currentUserId && thirdPrize.some(ticket => ticket.userId === currentUserId);
  const userWonFreePrize = currentUserId && freePrize.some(ticket => ticket.userId === currentUserId);
  
  // Mostrar confeti si el usuario ha ganado
  useEffect(() => {
    if (userWonFirstPrize || userWonSecondPrize || userWonThirdPrize || userWonFreePrize) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [userWonFirstPrize, userWonSecondPrize, userWonThirdPrize, userWonFreePrize]);

  // Obtener datos del premio seleccionado
  const getPrizeData = (category: PrizeCategory) => {
    switch (category) {
      case 'first':
        return {
          title: 'First Prize Winners',
          description: '4 exact matches in order',
          tickets: firstPrize,
          icon: Trophy,
          bgColor: 'bg-yellow-50',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-400'
        };
      case 'second':
        return {
          title: 'Second Prize Winners',
          description: '4 matches in any order',
          tickets: secondPrize,
          icon: Award,
          bgColor: 'bg-gray-50',
          iconColor: 'text-gray-600',
          borderColor: 'border-gray-400'
        };
      case 'third':
        return {
          title: 'Third Prize Winners',
          description: '3 exact matches in order',
          tickets: thirdPrize,
          icon: Medal,
          bgColor: 'bg-orange-50',
          iconColor: 'text-orange-600',
          borderColor: 'border-orange-400'
        };
      case 'free':
        return {
          title: 'Free Ticket Winners',
          description: '3 matches in any order',
          tickets: freePrize,
          icon: TicketIcon,
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-400'
        };
    }
  };

  // Verificar si hay ganadores
  const hasWinners = firstPrize.length > 0 || secondPrize.length > 0 || thirdPrize.length > 0 || freePrize.length > 0;

  return (
    <div className="mb-6 p-4 bg-white/90 rounded-xl backdrop-blur-sm shadow-lg">
      <h2 className="text-xl font-bold mb-3 flex items-center justify-center">
        <Trophy className="mr-2" size={20} /> Latest Results
      </h2>
      
      {/* Winning Numbers */}
      <div className="text-center mb-4">
        <div className="text-sm font-medium mb-2 text-gray-700">Winning Numbers:</div>
        <div className="flex justify-center items-center gap-2 mb-3">
          {winningNumbers && winningNumbers.length > 0 ? (
            winningNumbers.map((emoji, index) => (
              <span key={index} className="text-2xl bg-purple-100 p-2 rounded-lg shadow-sm">{emoji}</span>
            ))
          ) : (
            <span className="text-gray-500 text-sm">Waiting for next draw...</span>
          )}
        </div>
      </div>
      
      {/* Prize Buttons */}
      {hasWinners && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {/* First Prize Button */}
          {firstPrize.length > 0 && (
            <button
              onClick={() => setSelectedPrize('first')}
              className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                userWonFirstPrize ? 'bg-yellow-100 border-yellow-400 animate-pulse' : 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
              }`}
            >
              <div className="flex flex-col items-center">
                <Trophy className="text-yellow-600 mb-1" size={20} />
                <span className="text-xs font-medium text-gray-700">1st Prize</span>
                <span className="text-lg font-bold text-yellow-600">{firstPrize.length}</span>
              </div>
            </button>
          )}
          
          {/* Second Prize Button */}
          {secondPrize.length > 0 && (
            <button
              onClick={() => setSelectedPrize('second')}
              className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                userWonSecondPrize ? 'bg-gray-100 border-gray-400 animate-pulse' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center">
                <Award className="text-gray-600 mb-1" size={20} />
                <span className="text-xs font-medium text-gray-700">2nd Prize</span>
                <span className="text-lg font-bold text-gray-600">{secondPrize.length}</span>
              </div>
            </button>
          )}
          
          {/* Third Prize Button */}
          {thirdPrize.length > 0 && (
            <button
              onClick={() => setSelectedPrize('third')}
              className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                userWonThirdPrize ? 'bg-orange-100 border-orange-400 animate-pulse' : 'bg-orange-50 border-orange-200 hover:border-orange-300'
              }`}
            >
              <div className="flex flex-col items-center">
                <Medal className="text-orange-600 mb-1" size={20} />
                <span className="text-xs font-medium text-gray-700">3rd Prize</span>
                <span className="text-lg font-bold text-orange-600">{thirdPrize.length}</span>
              </div>
            </button>
          )}
          
          {/* Free Ticket Button */}
          {freePrize.length > 0 && (
            <button
              onClick={() => setSelectedPrize('free')}
              className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                userWonFreePrize ? 'bg-blue-100 border-blue-400 animate-pulse' : 'bg-blue-50 border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="flex flex-col items-center">
                <TicketIcon className="text-blue-600 mb-1" size={20} />
                <span className="text-xs font-medium text-gray-700">Free Ticket</span>
                <span className="text-lg font-bold text-blue-600">{freePrize.length}</span>
              </div>
            </button>
          )}
        </div>
      )}
      
      {/* No Winners Message */}
      {!hasWinners && (
        <div className="text-center text-gray-600 text-sm py-2">
          No winners this round. Try your luck in the next draw! 🍀
        </div>
      )}
      
      {/* Winners Modal */}
      {selectedPrize && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            {(() => {
              const prizeData = getPrizeData(selectedPrize);
              const Icon = prizeData.icon;
              
              return (
                <>
                  <div className={`${prizeData.bgColor} p-4 rounded-t-xl border-b-2 ${prizeData.borderColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon className={`${prizeData.iconColor} mr-2`} size={24} />
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{prizeData.title}</h3>
                          <p className="text-sm text-gray-600">{prizeData.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedPrize(null)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-2">
                      {prizeData.tickets.map((ticket, index) => (
                        <div 
                          key={ticket.id || index}
                          className={`p-3 rounded-lg border-2 ${
                            ticket.userId === currentUserId 
                              ? `bg-green-100 ${prizeData.borderColor} animate-pulse` 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex gap-1">
                              {ticket.numbers?.map((emoji, i) => (
                                <span key={i} className="text-xl">{emoji}</span>
                              )) || <span className="text-gray-500">No numbers</span>}
                            </div>
                            {ticket.userId === currentUserId && (
                              <span className="text-green-600 font-bold text-sm">YOU! 🎉</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl animate-bounce">🎉🎊🎉🎊🎉</div>
          </div>
        </div>
      )}
    </div>
  );
}; 