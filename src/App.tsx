import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { WalletConnector } from './components/WalletConnector';
import { Trophy, UserCircle, Zap, Terminal, WalletIcon } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMiniKit, useNotification, useViewProfile } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { useAuth } from './components/AuthProvider';
import { useWalletAuth } from './hooks/useWalletAuth';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { WalletInfo } from './components/WalletInfo';

function App() {
  const { 
    gameState, 
    loading, 
    error, 
    tickets, 
    cooldownStatus, 
    getTimeRemaining, 
    handleGenerateTicket, 
    loadUserTickets, 
    forceGameDraw 
  } = useGameState();
  const { context } = useMiniKit();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();
  const { user: authUser, isLoading, isFarcasterAvailable, signIn } = useAuth();
  const { user: walletUser, isConnected: isWalletConnected } = useWalletAuth();
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const hasTriedSignIn = useRef(false);
  
  // Usar wallet user si está disponible, sino usar auth user
  const user = walletUser || authUser;
  
  // Para evitar renderizado constante
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Inicializar Firebase y SDK una sola vez
  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log("SDK inicializado correctamente");
      } catch (error) {
        console.error("Error inicializando SDK:", error);
      }
    };
    
    initSDK();
  }, []);

  // Cargar tickets del usuario cuando cambie
  useEffect(() => {
    if (user?.id) {
      loadUserTickets(user.id);
    }
  }, [user?.id, loadUserTickets]);

  // Intentar inicio de sesión automático si no hay usuario
  useEffect(() => {
    // Solo intentamos una vez y cuando no estamos cargando ya
    if (!user && !isLoading && !hasTriedSignIn.current && !isWalletConnected) {
      console.log("Intentando inicio de sesión automático");
      hasTriedSignIn.current = true;
      signIn().catch(err => console.error("Error en inicio de sesión automático:", err));
    }
    
    // Marcar como carga inicial completada después de un tiempo
    if (!initialLoadComplete) {
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 2500); // Dar 2.5 segundos para la carga inicial
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, signIn, initialLoadComplete, isWalletConnected]);

  // Función para generar ticket con el nuevo sistema
  const onGenerateTicket = async (numbers: string[]) => {
    if (!user?.id) {
      console.error('No user ID available for ticket generation');
      return;
    }
    
    try {
      const result = await handleGenerateTicket(numbers, user.id);
      if (result.success) {
        console.log('Ticket generado exitosamente:', result.ticket);
      } else {
        console.error('Error generando ticket:', result.error);
        alert('Error generando ticket: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating ticket:', error);
      alert('Error generando ticket: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  // Calcular tiempo restante para el timer
  const timeRemaining = getTimeRemaining();
  const timerSeconds = timeRemaining ? Math.floor(timeRemaining.total / 1000) : 0;

  // Pantalla de carga con animación
  if ((isLoading && !initialLoadComplete) || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🎲</div>
          <div className="text-white text-2xl">Cargando LottoMoji...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-white text-2xl">Error cargando el juego</div>
          <div className="text-white/70 text-sm mt-2">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            🎰 LottoMoji 🎲
          </h1>
          <div className="flex items-center gap-2">
            {user && (
              <div className="bg-white/20 px-4 py-2 rounded-lg text-white flex items-center">
                <UserCircle className="mr-2" size={18} />
                <span>{user.username}</span>
                {user.walletAddress && (
                  <div className="ml-2 flex items-center text-sm text-white/70">
                    <WalletIcon size={12} className="mr-1" />
                    <span>{user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}</span>
                  </div>
                )}
              </div>
            )}
            {context?.client?.added && (
              <button
                onClick={() => viewProfile()}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ver Perfil
              </button>
            )}
          </div>
        </div>
        
        {/* Componente de información de billetera */}
        <div className="mb-6">
          <WalletConnector />
        </div>
        
        <p className="text-white/90 text-xl mb-4">
          ¡Haz match con 4 emojis para ganar! 🏆
        </p>
        <p className="text-white/80">Próximo sorteo diario en:</p>
        <div className="flex justify-center mt-4">
          <Timer seconds={timerSeconds} />
        </div>

        {/* Información del cooldown si está activo */}
        {cooldownStatus?.isInCooldown && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6 text-center">
            <div className="text-yellow-200 font-medium">
              ⚠️ Período de Cooldown Activo
            </div>
            <div className="text-yellow-300 text-sm">
              No se pueden comprar tickets durante los últimos {cooldownStatus.cooldownMinutes} minutos antes del sorteo
            </div>
          </div>
        )}

        <WinnerAnnouncement 
          winningNumbers={gameState?.winningNumbers || []}
          firstPrize={[]}
          secondPrize={[]}
          thirdPrize={[]}
          freePrize={[]}
          currentUserId={user?.id}
        />

        {import.meta.env.DEV && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={forceGameDraw}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Zap size={16} /> Forzar Sorteo Diario
            </button>
          </div>
        )}

        <TicketGenerator
          onGenerateTicket={onGenerateTicket}
          disabled={false}
          ticketCount={tickets.length}
          maxTickets={999}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map(ticket => (
            <TicketComponent
              key={ticket.id}
              ticket={{
                id: ticket.id,
                numbers: ticket.numbers,
                timestamp: ticket.timestamp.toMillis(),
                userId: ticket.userId
              }}
              isWinner={null} // Por ahora sin verificación de ganador
            />
          ))}
        </div>

        <div className="mt-8 space-y-6">
          <GameHistoryButton />
          
          <div className="bg-white/10 rounded-lg p-6 text-white">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <Trophy className="mr-2" size={24} />
              Estructura de Premios (Sistema Diario)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>🥇 Primer Premio (4 coincidencias exactas):</span>
                <span className="font-bold">1000 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>🥈 Segundo Premio (4 en cualquier orden):</span>
                <span className="font-bold">500 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>🥉 Tercer Premio (3 coincidencias exactas):</span>
                <span className="font-bold">100 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>🎫 Ticket Gratis (3 en cualquier orden):</span>
                <span className="font-bold">Ticket gratis</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-500/20 rounded border border-blue-500/50">
              <div className="text-sm text-blue-200">
                📅 <strong>Sistema Diario:</strong> Los tickets son válidos solo para el sorteo del día en que se compraron
              </div>
              <div className="text-sm text-blue-200 mt-1">
                ⏰ <strong>Sorteo:</strong> Todos los días a las 8:00 PM (México)
              </div>
              <div className="text-sm text-blue-200 mt-1">
                🚫 <strong>Cooldown:</strong> No se pueden comprar tickets {cooldownStatus?.cooldownMinutes || 30} minutos antes del sorteo
              </div>
            </div>
          </div>
          
          <EmojiChat />
          
          {import.meta.env.DEV && (
            <div className="bg-white/10 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center">
                  <Terminal className="mr-2" size={20} />
                  Developer Tools
                </h3>
                <button
                  onClick={() => setShowDiagnostic(!showDiagnostic)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  {showDiagnostic ? 'Hide' : 'Show'} Diagnostic
                </button>
              </div>
              
              {showDiagnostic && (
                <div className="bg-black/20 p-4 rounded text-xs font-mono">
                  <div>User ID: {user?.id || 'Not logged in'}</div>
                  <div>Wallet: {user?.walletAddress || 'No wallet'}</div>
                  <div>Is Wallet Connected: {isWalletConnected ? 'Yes' : 'No'}</div>
                  <div>Tickets Today: {tickets.length}</div>
                  <div>Winning Numbers: {gameState?.winningNumbers?.join(', ') || 'None'}</div>
                  <div>Next Draw: {gameState?.nextDrawTime?.toDate().toLocaleString() || 'Unknown'}</div>
                  <div>In Cooldown: {cooldownStatus?.isInCooldown ? 'Yes' : 'No'}</div>
                  <div>Time Remaining: {timeRemaining ? `${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s` : 'N/A'}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;