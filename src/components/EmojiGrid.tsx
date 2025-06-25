import React, { useState, useEffect } from 'react';
import { getEmojis, loadEmojisFromContract } from '../utils/emojiManager';
import { X } from 'lucide-react';

interface EmojiGridProps {
  selectedEmojis: string[];
  onEmojiSelect: (emoji: string) => void;
  onEmojiDeselect: (index: number) => void;
  maxSelections: number;
}

export const EmojiGrid: React.FC<EmojiGridProps> = ({ 
  selectedEmojis, 
  onEmojiSelect, 
  onEmojiDeselect,
  maxSelections 
}) => {
  const [emojis, setEmojis] = useState<string[]>(getEmojis());
  const [isLoading, setIsLoading] = useState(false);
  
  const canSelect = selectedEmojis.length < maxSelections;

  useEffect(() => {
    const updateEmojis = async () => {
      setIsLoading(true);
      try {
        const contractEmojis = await loadEmojisFromContract();
        setEmojis(contractEmojis);
      } catch (error) {
        console.error('Error cargando emojis:', error);
        setEmojis(getEmojis()); // Fallback
      } finally {
        setIsLoading(false);
      }
    };

    updateEmojis();
  }, []);

  // Ensure we always have exactly 25 emojis for a perfect 5x5 grid
  const gridEmojis = emojis.slice(0, 25);
  while (gridEmojis.length < 25) {
    gridEmojis.push('🎵'); // Fill with default emoji if needed
  }

  return (
    <div className="p-6 bg-white/90 rounded-xl backdrop-blur-sm shadow-lg">
      <div className="mb-4 text-center text-gray-700 font-medium">
        Select {maxSelections} emojis ({selectedEmojis.length} selected)
      </div>
      
      {/* Selected emojis display */}
      {selectedEmojis.length > 0 && (
        <div className="flex gap-3 mb-6 justify-center flex-wrap">
          {selectedEmojis.map((emoji, index) => (
            <div key={`selected-${index}`} 
                 className="relative inline-block">
              <span className="text-3xl bg-purple-200 p-3 rounded-xl shadow-sm border border-purple-300">{emoji}</span>
              <button
                onClick={() => onEmojiDeselect(index)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 
                         text-white transition-all duration-200 shadow-lg hover:scale-110"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent mx-auto"></div>
          <div className="text-sm text-gray-600 mt-3 font-medium">Loading emojis from contract...</div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
          {gridEmojis.map((emoji, index) => {
            const isSelected = selectedEmojis.includes(emoji);
            return (
              <button
                key={`${emoji}-${index}`}
                onClick={() => canSelect && onEmojiSelect(emoji)}
                className={`
                  aspect-square text-2xl p-3 rounded-xl transition-all duration-200 
                  font-medium shadow-sm border-2
                  ${canSelect 
                    ? isSelected
                      ? 'bg-gradient-to-br from-purple-400 to-purple-500 border-purple-600 text-white scale-110 shadow-lg'
                      : 'bg-white border-gray-200 hover:bg-gradient-to-br hover:from-purple-100 hover:to-purple-200 hover:border-purple-300 hover:scale-105 hover:shadow-md'
                    : 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'}
                `}
                disabled={!canSelect}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Grid info */}
      <div className="mt-4 text-center">
        <div className="text-xs text-gray-500">
          5×5 Emoji Grid • Consistent on all devices
        </div>
      </div>
    </div>
  );
};