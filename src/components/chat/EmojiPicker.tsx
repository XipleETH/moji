import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { EMOJI_CATEGORIES } from '../../utils/emojiData';

interface EmojiPickerProps {
  onSend: (emojis: string[]) => Promise<boolean>;
  isLoading?: boolean;
  error?: string | null;
  clearError?: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  onSend, 
  isLoading = false, 
  error = null,
  clearError 
}) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [isSending, setIsSending] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Limpiar el estado cuando se desmonta el componente
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleEmojiClick = useCallback((emoji: string) => {
    console.log('[EmojiPicker] Emoji seleccionado:', emoji);
    
    // Evitar agregar emojis mientras se está enviando
    if (isSending || isLoading) {
      console.warn('[EmojiPicker] Ignorando click de emoji durante envío');
      return;
    }

    setSelectedEmojis(prev => {
      const newEmojis = [...prev, emoji];
      console.log('[EmojiPicker] Emojis actualizados:', newEmojis);
      return newEmojis;
    });
    
    // Limpiar errores al seleccionar nuevos emojis
    if (error && clearError) {
      clearError();
    }
  }, [isSending, isLoading, error, clearError]);

  const handleRemoveEmoji = useCallback((indexToRemove: number) => {
    console.log('[EmojiPicker] Removiendo emoji en índice:', indexToRemove);
    
    // Evitar remover emojis mientras se está enviando
    if (isSending || isLoading) {
      console.warn('[EmojiPicker] Ignorando remoción de emoji durante envío');
      return;
    }

    setSelectedEmojis(prev => {
      const newEmojis = prev.filter((_, i) => i !== indexToRemove);
      console.log('[EmojiPicker] Emojis después de remoción:', newEmojis);
      return newEmojis;
    });
  }, [isSending, isLoading]);

  const handleSend = useCallback(async () => {
    console.log('[EmojiPicker] Iniciando envío con emojis:', selectedEmojis);
    
    // Validaciones
    if (selectedEmojis.length === 0) {
      console.warn('[EmojiPicker] No hay emojis para enviar');
      return;
    }
    
    if (isSending || isLoading) {
      console.warn('[EmojiPicker] Ya hay un envío en progreso');
      return;
    }
    
    // Crear nuevo AbortController para esta operación
    abortControllerRef.current = new AbortController();
    
    setIsSending(true);
    
    try {
      console.log('[EmojiPicker] Enviando mensaje...');
      const success = await onSend([...selectedEmojis]); // Crear copia para evitar mutaciones
      
      // Verificar si la operación fue abortada
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[EmojiPicker] Operación abortada');
        return;
      }
      
      if (success) {
        console.log('[EmojiPicker] Mensaje enviado exitosamente, limpiando selección');
        setSelectedEmojis([]); // Solo limpiar si el envío fue exitoso
      } else {
        console.error('[EmojiPicker] Error en el envío del mensaje');
      }
      
    } catch (error) {
      console.error('[EmojiPicker] Error durante handleSend:', error);
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }, [selectedEmojis, isSending, isLoading, onSend]);

  const isOperationInProgress = isSending || isLoading;

  return (
    <div className="p-2 border-t bg-white">
      {/* Error display */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
          {clearError && (
            <button 
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
              aria-label="Cerrar error"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Selected emojis preview */}
      <div className="min-h-8 p-2 mb-2 bg-gray-50 rounded flex flex-wrap gap-1">
        {selectedEmojis.map((emoji, index) => (
          <span
            key={`${index}-${emoji}`} // Usar índice y emoji para clave única
            className={`cursor-pointer hover:bg-gray-200 p-1 rounded ${
              isOperationInProgress ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => !isOperationInProgress && handleRemoveEmoji(index)}
            title="Click para remover"
          >
            {emoji}
          </span>
        ))}
        {selectedEmojis.length === 0 && (
          <span className="text-gray-400 text-sm">Selecciona emojis para tu mensaje...</span>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-hide">
        {Object.entries(EMOJI_CATEGORIES).map(([category, { icon }]) => (
          <button
            key={category}
            onClick={() => !isOperationInProgress && setActiveCategory(category)}
            disabled={isOperationInProgress}
            className={`p-2 rounded flex-shrink-0 ${
              activeCategory === category
                ? 'bg-purple-100 text-purple-700'
                : 'hover:bg-gray-100'
            } ${isOperationInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="h-32 overflow-y-auto mb-2">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              disabled={isOperationInProgress}
              className={`p-1 hover:bg-gray-100 rounded ${
                isOperationInProgress ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={selectedEmojis.length === 0 || isOperationInProgress}
        className="w-full bg-purple-600 text-white p-2 rounded flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isOperationInProgress ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send size={18} />
            Enviar ({selectedEmojis.length})
          </>
        )}
      </button>
    </div>
  );
};