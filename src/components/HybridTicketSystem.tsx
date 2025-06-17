import React, { useState } from 'react';
import { TicketGenerator } from './TicketGenerator';
import { BlockchainTicketGenerator } from './BlockchainTicketGenerator';

interface HybridTicketSystemProps {
  onGenerateTicket: (numbers: string[]) => Promise<void>;
  disabled: boolean;
  ticketCount: number;
  maxTickets: number;
  userTokens: number;
  tokensUsed: number;
  queueStatus: any;
  rateLimitStatus: any;
  className?: string;
}

export const HybridTicketSystem: React.FC<HybridTicketSystemProps> = (props) => {
  const [useBlockchain, setUseBlockchain] = useState(true); // Por defecto usar blockchain
  const [showLegacyOption, setShowLegacyOption] = useState(false);

  const handleTicketPurchased = (txHash: string) => {
    console.log('✅ Ticket blockchain comprado:', txHash);
    // Aquí podrías agregar lógica adicional si es necesario
  };

  return (
    <div className={props.className}>
      {/* Toggle entre sistemas */}
      <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold text-white">Sistema de Tickets</h3>
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setUseBlockchain(true)}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  useBlockchain 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🔗 Blockchain (USDC)
              </button>
              <button
                onClick={() => setUseBlockchain(false)}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  !useBlockchain 
                    ? 'bg-orange-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🔥 Firebase (Legacy)
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setShowLegacyOption(!showLegacyOption)}
            className="text-gray-400 hover:text-white text-sm"
          >
            {showLegacyOption ? '👁️‍🗨️ Ocultar' : '⚙️ Opciones'}
          </button>
        </div>

        {/* Información del sistema seleccionado */}
        <div className="mt-4 text-sm text-gray-300">
          {useBlockchain ? (
            <div className="flex items-center space-x-2">
              <span className="text-green-400">✅</span>
              <span>
                <strong>Sistema Blockchain:</strong> Tickets pagados con USDC • NFTs • Sin límites diarios • Chainlink Automation
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-orange-400">⚠️</span>
              <span>
                <strong>Sistema Legacy:</strong> Tickets gratuitos • Límite de 1000 tokens diarios • Solo para testing
              </span>
            </div>
          )}
        </div>

        {/* Advertencias y opciones legacy */}
        {showLegacyOption && (
          <div className="mt-4 p-3 bg-orange-900/30 border border-orange-500/30 rounded">
            <div className="text-orange-300 text-sm mb-2">
              ⚠️ <strong>Sistema Legacy (Firebase):</strong>
            </div>
            <ul className="text-orange-200 text-xs space-y-1 list-disc list-inside">
              <li>Solo para desarrollo y testing</li>
              <li>Tickets gratuitos con límite diario</li>
              <li>No genera NFTs reales</li>
              <li>Será removido en producción</li>
            </ul>
          </div>
        )}
      </div>

      {/* Renderizar el sistema correspondiente */}
      {useBlockchain ? (
        <BlockchainTicketGenerator 
          onTicketPurchased={handleTicketPurchased}
          className="w-full"
        />
      ) : (
        <>
          {/* Advertencia adicional para Firebase */}
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded">
            <div className="text-red-300 text-sm">
              🚨 <strong>Modo Legacy Activado:</strong> Estás usando el sistema antiguo de Firebase. 
              Los tickets no serán NFTs reales y no participarán en el sistema de premios blockchain.
            </div>
          </div>
          
          <TicketGenerator
            onGenerateTicket={props.onGenerateTicket}
            disabled={props.disabled}
            ticketCount={props.ticketCount}
            maxTickets={props.maxTickets}
            userTokens={props.userTokens}
            tokensUsed={props.tokensUsed}
            queueStatus={props.queueStatus}
            rateLimitStatus={props.rateLimitStatus}
          />
        </>
      )}

      {/* Stats comparativos */}
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className={`p-3 rounded border ${useBlockchain ? 'bg-blue-900/30 border-blue-500/30' : 'bg-gray-800/30 border-gray-600/30'}`}>
          <div className="text-blue-400 font-semibold mb-1">🔗 Sistema Blockchain</div>
          <div className="text-gray-300 space-y-1">
            <div>💰 Costo: 2 USDC por ticket</div>
            <div>🎯 NFTs reales en Base Sepolia</div>
            <div>⚡ Chainlink Automation</div>
            <div>🛡️ Sistema de reservas</div>
          </div>
        </div>
        
        <div className={`p-3 rounded border ${!useBlockchain ? 'bg-orange-900/30 border-orange-500/30' : 'bg-gray-800/30 border-gray-600/30'}`}>
          <div className="text-orange-400 font-semibold mb-1">🔥 Sistema Legacy</div>
          <div className="text-gray-300 space-y-1">
            <div>🆓 Tickets gratuitos</div>
            <div>📊 Almacenado en Firebase</div>
            <div>🔢 Límite de 1000 tokens/día</div>
            <div>⚠️ Solo para testing</div>
          </div>
        </div>
      </div>

      {/* Footer informativo */}
      <div className="mt-4 text-center text-xs text-gray-500">
        💡 El sistema blockchain es la implementación oficial. El sistema legacy se mantiene solo para testing.
      </div>
    </div>
  );
}; 