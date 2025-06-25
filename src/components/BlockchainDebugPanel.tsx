import React, { useState } from 'react';
import { 
  verifyBlockchainPools, 
  forcePoolSync, 
  monitorPools, 
  diagnosePoolResetIssue,
  debugPools 
} from '../utils/blockchainVerification';

interface DebugPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const BlockchainDebugPanel: React.FC<DebugPanelProps> = ({ isVisible, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [monitorDuration, setMonitorDuration] = useState(5);

  const addOutput = (message: string) => {
    setOutput(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearOutput = () => {
    setOutput([]);
  };

  const handleVerifyPools = async () => {
    setIsLoading(true);
    try {
      addOutput('🔍 Iniciando verificación de pools...');
      const result = await verifyBlockchainPools();
      addOutput(`✅ Verificación completada - Total: ${result.totals.systemTotal} USDC`);
      addOutput(`💰 Main: ${result.totals.mainTotal} | 🏛️ Reserves: ${result.totals.reserveTotal} | 📅 Today: ${result.totals.dailyTotal}`);
    } catch (error) {
      addOutput(`❌ Error en verificación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async () => {
    setIsLoading(true);
    try {
      addOutput('🔄 Forzando sincronización...');
      await forcePoolSync();
      addOutput('✅ Sincronización forzada completada');
    } catch (error) {
      addOutput(`❌ Error en sincronización: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonitorPools = async () => {
    setIsLoading(true);
    try {
      addOutput(`👁️ Iniciando monitoreo por ${monitorDuration} minutos...`);
      await monitorPools(monitorDuration);
      addOutput('✅ Monitoreo completado');
    } catch (error) {
      addOutput(`❌ Error en monitoreo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiagnose = async () => {
    setIsLoading(true);
    try {
      addOutput('🔬 Iniciando diagnóstico...');
      await diagnosePoolResetIssue();
      addOutput('✅ Diagnóstico completado');
    } catch (error) {
      addOutput(`❌ Error en diagnóstico: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowHelp = () => {
    debugPools();
    addOutput('🛠️ Ayuda mostrada en consola del navegador');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">🔧 Blockchain Debug Panel</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col h-full max-h-[calc(90vh-80px)]">
          {/* Controls */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={handleVerifyPools}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              🔍 Verificar Pools
            </button>
            
            <button
              onClick={handleForceSync}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              🔄 Forzar Sync
            </button>
            
            <button
              onClick={handleDiagnose}
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              🔬 Diagnosticar
            </button>
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={monitorDuration}
                onChange={(e) => setMonitorDuration(Number(e.target.value))}
                min="1"
                max="60"
                className="w-16 px-2 py-1 border rounded"
              />
              <button
                onClick={handleMonitorPools}
                disabled={isLoading}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-3 py-2 rounded font-medium text-sm"
              >
                👁️ Monitor
              </button>
            </div>
            
            <button
              onClick={handleShowHelp}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
            >
              🛠️ Ayuda
            </button>
            
            <button
              onClick={clearOutput}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
            >
              🗑️ Limpiar
            </button>
          </div>

          {/* Status */}
          {isLoading && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-700 mr-2"></div>
                Ejecutando operación...
              </div>
            </div>
          )}

          {/* Output */}
          <div className="flex-1 bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-y-auto">
            <div className="mb-2 text-gray-400">
              === BLOCKCHAIN VERIFICATION OUTPUT ===
            </div>
            {output.length === 0 ? (
              <div className="text-gray-500">
                Presiona un botón para ejecutar comandos...
              </div>
            ) : (
              output.map((line, index) => (
                <div key={index} className="mb-1">
                  {line}
                </div>
              ))
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <strong>Instrucciones:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><strong>Verificar Pools:</strong> Obtiene datos reales del blockchain</li>
              <li><strong>Forzar Sync:</strong> Actualiza el cache con datos reales</li>
              <li><strong>Diagnosticar:</strong> Analiza problemas de reset de pools</li>
              <li><strong>Monitor:</strong> Vigila cambios por X minutos</li>
              <li><strong>Ayuda:</strong> Muestra comandos disponibles en consola</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}; 