import React, { useState } from 'react';
import { saveDrawResult, createFirestoreResult } from '../firebase/blockchainResults';

// Datos del resultado histórico conocido
const HISTORICAL_RESULT = {
  gameDay: "22",
  winningNumbers: [39, 24, 23, 0],
  winningEmojis: ["🎧", "🥊", "🏸", "🎮"],
  blockNumber: 35970616,
  transactionHash: "0x92079d0fda897521ce41ad2ca2bb8dc5c9a35f3bfababe5b07c0d2abb3a469eb",
  drawTime: 1735734000, // Timestamp aproximado de cuando ocurrió el sorteo
  network: "avalanche-fuji",
  contractAddress: "0xe1eF53748D9a30Dd89DF5f1E6df6C3Fc2c339008"
};

export const AddHistoricalResultUtil: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const addHistoricalResult = async () => {
    try {
      setLoading(true);
      setResult(null);

      console.log('💾 Adding historical result to Firestore...');

      // Crear el resultado usando la función helper
      const firestoreResult = createFirestoreResult(
        HISTORICAL_RESULT.gameDay,
        HISTORICAL_RESULT.winningNumbers,
        HISTORICAL_RESULT.winningEmojis,
        HISTORICAL_RESULT.blockNumber,
        HISTORICAL_RESULT.transactionHash,
        HISTORICAL_RESULT.drawTime,
        HISTORICAL_RESULT.network,
        HISTORICAL_RESULT.contractAddress,
        true // processed
      );

      // Guardar en Firestore
      const success = await saveDrawResult(firestoreResult);

      if (success) {
        setResult('✅ ¡Resultado histórico guardado exitosamente en Firestore!');
        console.log('🎯 Game Day:', HISTORICAL_RESULT.gameDay);
        console.log('🎮 Winning Emojis:', HISTORICAL_RESULT.winningEmojis.join(' '));
        console.log('🔢 Winning Numbers:', HISTORICAL_RESULT.winningNumbers.join(', '));
        console.log('🔗 Transaction Hash:', HISTORICAL_RESULT.transactionHash);
      } else {
        setResult('❌ Error al guardar el resultado');
      }
    } catch (error) {
      console.error('❌ Error adding historical result:', error);
      setResult('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white/90 rounded-xl backdrop-blur-sm shadow-lg">
      <h3 className="text-lg font-bold mb-3">🔧 Utilidad de Desarrollo</h3>
      <p className="text-sm text-gray-600 mb-4">
        Agregar resultado histórico conocido a Firestore:
      </p>
      
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <div className="text-sm">
          <div><strong>Game Day:</strong> {HISTORICAL_RESULT.gameDay}</div>
          <div><strong>Emojis Ganadores:</strong> {HISTORICAL_RESULT.winningEmojis.join(' ')}</div>
          <div><strong>Números:</strong> {HISTORICAL_RESULT.winningNumbers.join(', ')}</div>
          <div><strong>Bloque:</strong> {HISTORICAL_RESULT.blockNumber}</div>
        </div>
      </div>

      <button
        onClick={addHistoricalResult}
        disabled={loading}
        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '💾 Guardando...' : '🔄 Agregar Resultado Histórico'}
      </button>

      {result && (
        <div className="mt-4 p-3 rounded-lg bg-gray-100">
          <p className="text-sm">{result}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>⚠️ Esta es una utilidad temporal para desarrollo.</p>
        <p>Una vez agregado el resultado, puedes eliminar este componente.</p>
      </div>
    </div>
  );
}; 