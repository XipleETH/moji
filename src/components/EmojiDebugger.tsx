import React, { useState, useEffect } from 'react';
import { loadEmojisFromContract, getEmojis, clearEmojiCache } from '../utils/emojiManager';
import { GAME_CONFIG } from '../utils/contractAddresses';

export const EmojiDebugger: React.FC = () => {
  const [contractEmojis, setContractEmojis] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const loadEmojis = async () => {
    setIsLoading(true);
    setError(null);
    addLog('🔄 Iniciando carga de emojis...');
    
    try {
      const emojis = await loadEmojisFromContract();
      setContractEmojis(emojis);
      addLog(`✅ Cargados ${emojis.length} emojis: ${emojis.join(' ')}`);
    } catch (err: any) {
      setError(err.message);
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = () => {
    clearEmojiCache();
    setContractEmojis([]);
    setLogs([]);
    addLog('🗑️ Caché limpiado');
  };

  useEffect(() => {
    // Cargar emojis automáticamente al montar
    loadEmojis();
  }, []);

  return (
    <div className="fixed top-4 right-4 w-96 bg-white/95 border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">🐛 Emoji Debugger</h3>
        <div className="flex gap-2">
          <button
            onClick={loadEmojis}
            disabled={isLoading}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
          >
            {isLoading ? '⏳' : '🔄'}
          </button>
          <button
            onClick={clearCache}
            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Estado actual */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-sm">
        <div><strong>Estado:</strong> {isLoading ? 'Cargando...' : 'Listo'}</div>
        <div><strong>Emojis del contrato:</strong> {contractEmojis.length}</div>
        <div><strong>Emojis fallback:</strong> {GAME_CONFIG.EMOJIS?.length || 0}</div>
        <div><strong>Usando caché:</strong> {getEmojis() === contractEmojis ? 'Sí' : 'No'}</div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Emojis del contrato */}
      <div className="mb-4">
        <strong className="text-sm">Emojis del contrato ({contractEmojis.length}):</strong>
        <div className="flex flex-wrap gap-1 mt-1 p-2 bg-green-50 rounded max-h-20 overflow-y-auto">
          {contractEmojis.map((emoji, i) => (
            <span key={i} title={`Índice ${i}: ${emoji}`} className="text-lg cursor-help">
              {emoji}
            </span>
          ))}
        </div>
      </div>

      {/* Emojis fallback */}
      <div className="mb-4">
        <strong className="text-sm">Emojis fallback ({GAME_CONFIG.EMOJIS?.length || 0}):</strong>
        <div className="flex flex-wrap gap-1 mt-1 p-2 bg-orange-50 rounded max-h-20 overflow-y-auto">
          {(GAME_CONFIG.EMOJIS || []).map((emoji, i) => (
            <span key={i} title={`Índice ${i}: ${emoji}`} className="text-lg cursor-help">
              {emoji}
            </span>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div>
        <strong className="text-sm">Logs:</strong>
        <div className="mt-1 p-2 bg-gray-50 rounded text-xs max-h-32 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="text-gray-700">{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}; 