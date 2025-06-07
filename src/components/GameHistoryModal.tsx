import React, { useState, useEffect } from 'react';
import { X, Trophy, Award, Medal, Ticket as TicketIcon } from 'lucide-react';
import { GameResult } from '../types';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface GameHistoryModalProps {
  onClose: () => void;
}

type PrizeCategory = 'firstPrize' | 'secondPrize' | 'thirdPrize' | 'freePrize';

interface SelectedPrize {
  gameId: string;
  category: PrizeCategory;
  gameDate: string;
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({ onClose }) => {
  const [history, setHistory] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrize, setSelectedPrize] = useState<SelectedPrize | null>(null);

  useEffect(() => {
    const fetchGameHistory = async () => {
      try {
        setLoading(true);
        console.log('Obteniendo historial de juegos desde Firestore...');
        
        const historyQuery = query(
          collection(db, 'game_results'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(historyQuery);
        console.log(`Se encontraron ${snapshot.docs.length} resultados en Firestore`);
        
        const results: GameResult[] = snapshot.docs.map(doc => {
          try {
            const data = doc.data();
            console.log(`Procesando documento ${doc.id}:`, data);
            
            // Función para extraer el timestamp en milisegundos
            const getTimestamp = (firestoreTimestamp: any): number => {
              if (firestoreTimestamp?.toMillis) {
                return firestoreTimestamp.toMillis();
              } else if (typeof firestoreTimestamp === 'string') {
                return new Date(firestoreTimestamp).getTime();
              } else if (firestoreTimestamp?.seconds) {
                // Manejar formato timestamp de Firestore {seconds, nanoseconds}
                return firestoreTimestamp.seconds * 1000 + (firestoreTimestamp.nanoseconds / 1000000);
              } else {
                return Date.now();
              }
            };
            
            // Validar que los datos tengan la estructura esperada
            return {
              id: doc.id,
              timestamp: getTimestamp(data.timestamp),
              winningNumbers: Array.isArray(data.winningNumbers) ? data.winningNumbers : [],
              firstPrize: Array.isArray(data.firstPrize) ? data.firstPrize : [],
              secondPrize: Array.isArray(data.secondPrize) ? data.secondPrize : [],
              thirdPrize: Array.isArray(data.thirdPrize) ? data.thirdPrize : [],
              freePrize: Array.isArray(data.freePrize) ? data.freePrize : []
            };
          } catch (error) {
            console.error('Error mapping document in GameHistoryModal:', error, doc.id);
            return null;
          }
        }).filter(result => result !== null) as GameResult[];
        
        console.log('Historial procesado correctamente:', results.length, 'resultados');
        setHistory(results);
      } catch (error) {
        console.error('Error fetching game history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGameHistory();
  }, []);

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

  const formatShortDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Obtener datos del premio seleccionado para el modal
  const getPrizeData = (category: PrizeCategory) => {
    switch (category) {
      case 'firstPrize':
        return {
          title: 'First Prize Winners',
          description: '4 exact matches in order',
          icon: Trophy,
          bgColor: 'bg-yellow-50',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-400'
        };
      case 'secondPrize':
        return {
          title: 'Second Prize Winners',
          description: '4 matches in any order',
          icon: Award,
          bgColor: 'bg-gray-50',
          iconColor: 'text-gray-600',
          borderColor: 'border-gray-400'
        };
      case 'thirdPrize':
        return {
          title: 'Third Prize Winners',
          description: '3 exact matches in order',
          icon: Medal,
          bgColor: 'bg-orange-50',
          iconColor: 'text-orange-600',
          borderColor: 'border-orange-400'
        };
      case 'freePrize':
        return {
          title: 'Free Ticket Winners',
          description: '3 matches in any order',
          icon: TicketIcon,
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-400'
        };
    }
  };

  const openPrizeModal = (gameId: string, category: PrizeCategory, gameDate: string) => {
    setSelectedPrize({ gameId, category, gameDate });
  };

  const getSelectedGameResult = () => {
    if (!selectedPrize) return null;
    return history.find(game => game.id === selectedPrize.gameId);
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/95 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white flex justify-between items-center">
            <h2 className="text-xl font-bold">Game History</h2>
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
                <p className="mt-2 text-gray-600">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No games recorded yet</p>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map(result => {
                  const hasWinners = result.firstPrize.length > 0 || result.secondPrize.length > 0 || 
                                   result.thirdPrize.length > 0 || result.freePrize.length > 0;
                  
                  return (
                    <div key={result.id} className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                      {/* Header with date */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-500 font-medium">
                        {formatDate(result.timestamp)}
                      </p>
                      </div>
                      
                      {/* Winning Numbers */}
                      <div className="mb-4">
                        <span className="text-sm font-semibold text-gray-700 block mb-2">Winning Numbers:</span>
                        <div className="flex gap-1 justify-center">
                          {result.winningNumbers?.map((emoji, i) => (
                            <span key={i} className="text-xl bg-purple-100 p-1 rounded">{emoji}</span>
                          )) || <span className="text-gray-400">No numbers</span>}
                        </div>
                      </div>

                      {/* Prize Buttons */}
                      {hasWinners ? (
                        <div className="grid grid-cols-2 gap-2">
                          {/* First Prize */}
                          {result.firstPrize.length > 0 && (
                            <button
                              onClick={() => openPrizeModal(result.id, 'firstPrize', formatShortDate(result.timestamp))}
                              className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 hover:border-yellow-300 transition-all hover:scale-105"
                            >
                              <div className="flex flex-col items-center">
                                <Trophy className="text-yellow-600 mb-1" size={16} />
                                <span className="text-xs font-medium text-gray-700">1st</span>
                                <span className="text-sm font-bold text-yellow-600">{result.firstPrize.length}</span>
                              </div>
                            </button>
                          )}
                          
                          {/* Second Prize */}
                          {result.secondPrize.length > 0 && (
                            <button
                              onClick={() => openPrizeModal(result.id, 'secondPrize', formatShortDate(result.timestamp))}
                              className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all hover:scale-105"
                            >
                              <div className="flex flex-col items-center">
                                <Award className="text-gray-600 mb-1" size={16} />
                                <span className="text-xs font-medium text-gray-700">2nd</span>
                                <span className="text-sm font-bold text-gray-600">{result.secondPrize.length}</span>
                              </div>
                            </button>
                          )}
                          
                          {/* Third Prize */}
                          {result.thirdPrize.length > 0 && (
                            <button
                              onClick={() => openPrizeModal(result.id, 'thirdPrize', formatShortDate(result.timestamp))}
                              className="p-2 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 hover:border-orange-300 transition-all hover:scale-105"
                            >
                              <div className="flex flex-col items-center">
                                <Medal className="text-orange-600 mb-1" size={16} />
                                <span className="text-xs font-medium text-gray-700">3rd</span>
                                <span className="text-sm font-bold text-orange-600">{result.thirdPrize.length}</span>
                              </div>
                            </button>
                          )}
                          
                          {/* Free Prize */}
                          {result.freePrize.length > 0 && (
                            <button
                              onClick={() => openPrizeModal(result.id, 'freePrize', formatShortDate(result.timestamp))}
                              className="p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all hover:scale-105"
                            >
                              <div className="flex flex-col items-center">
                                <TicketIcon className="text-blue-600 mb-1" size={16} />
                                <span className="text-xs font-medium text-gray-700">Free</span>
                                <span className="text-sm font-bold text-blue-600">{result.freePrize.length}</span>
                              </div>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <span className="text-xs text-gray-500">No winners</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prize Details Modal */}
      {selectedPrize && (() => {
        const gameResult = getSelectedGameResult();
        const prizeData = getPrizeData(selectedPrize.category);
        const tickets = gameResult?.[selectedPrize.category] || [];
        const Icon = prizeData.icon;

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className={`${prizeData.bgColor} p-4 rounded-t-xl border-b-2 ${prizeData.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Icon className={`${prizeData.iconColor} mr-2`} size={24} />
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{prizeData.title}</h3>
                      <p className="text-sm text-gray-600">{prizeData.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedPrize.gameDate}</p>
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
                  {tickets.length > 0 ? (
                    tickets.map((ticket, index) => (
                      <div 
                        key={ticket.id || index}
                        className="p-3 rounded-lg border-2 bg-gray-50 border-gray-200"
                      >
                        <div className="flex gap-1">
                          {ticket.numbers?.map((emoji, i) => (
                            <span key={i} className="text-xl">{emoji}</span>
                          )) || <span className="text-gray-500">No numbers</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No winners in this category
            </div>
          )}
        </div>
      </div>
    </div>
          </div>
        );
      })()}
    </>
  );
};