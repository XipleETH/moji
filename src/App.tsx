import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { WalletConnector } from './components/WalletConnector';
import { WalletProvider } from './contexts/WalletContext';
import { NetworkInfo } from './components/NetworkInfo';
import { Trophy, UserCircle, Zap, Terminal, WalletIcon } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMiniKit, useNotification, useViewProfile } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { useAuth } from './components/AuthProvider';
import { useAccount } from 'wagmi';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { WalletInfo } from './components/WalletInfo';

function AppContent() {
  const { 
    gameState, 
    generateTicket, 
    forceGameDraw,
    ethPrice,
    isTransactionPending,
    isTransactionConfirmed,
    refreshGameData,
    currentRound,
    nextDrawTime,
    prizePools
  } = useGameState();
  const { context } = useMiniKit();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();
  const { user: authUser, isLoading, isFarcasterAvailable, signIn } = useAuth();
  const { address, isConnected: isWalletConnected } = useAccount();
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ETH' | 'USDC'>('ETH');
  const hasTriedSignIn = useRef(false);
  
  // Create user object from wallet address or use auth user
  const walletUser = address ? {
    id: address,
    username: `${address.slice(0, 6)}...${address.slice(-4)}`,
    walletAddress: address,
    isFarcasterUser: false
  } : null;
  
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

  // Mostrar notificación cuando hay ganadores
  const handleWin = useCallback(async () => {
    if (gameState.lastResults?.firstPrize && parseFloat(gameState.lastResults.firstPrize) > 0) {
      try {
        await sendNotification({
          title: '🎉 You Won!',
          body: `Congratulations! You won ${gameState.lastResults.firstPrize} ETH in the first prize!`
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }, [gameState.lastResults, sendNotification]);

  useEffect(() => {
    handleWin();
  }, [gameState.lastResults, handleWin]);

  // Pantalla de carga con animación
  if (isLoading && !initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🎲</div>
          <div className="text-white text-2xl">Cargando LottoMoji...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header con botones en esquinas */}
        <div className="relative mb-8">
          {/* Botón historial en esquina superior izquierda */}
          <div className="absolute top-0 left-0">
            <GameHistoryButton />
          </div>
          
          {/* Botones de billetera y perfil en esquina superior derecha */}
          <div className="absolute top-0 right-0 flex items-center gap-4">
            {context?.client?.added && (
              <button
                onClick={() => viewProfile()}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ver Perfil
              </button>
            )}
            <div className="relative">
              <WalletConnector />
            </div>
          </div>
          
          {/* Título centrado */}
          <div className="flex justify-center pt-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white text-center">
              🎰 LottoMoji 🎲
            </h1>
          </div>
        </div>
        
        {/* Textos informativos centrados con emojis */}
        <div className="text-center mb-8">
          <p className="text-white/90 text-xl mb-4">
            🎯 Match 4 emojis to win! 🏆
          </p>
          <p className="text-blue-200 text-lg mb-2">
            🔷 Coinbase Wallet Required to Play
          </p>
          <p className="text-white/80 text-lg mb-4">
            ⏰ Next draw in:
          </p>
          <div className="flex justify-center">
            <Timer seconds={gameState.timeRemaining} />
          </div>
        </div>

        {/* Network info */}
        <div className="flex justify-center mb-6">
          <NetworkInfo />
        </div>

        <WinnerAnnouncement 
          winningNumbers={gameState.winningNumbers || []}
          firstPrize={gameState.lastResults?.firstPrize ? [gameState.lastResults.firstPrize] : []}
          secondPrize={gameState.lastResults?.secondPrize ? [gameState.lastResults.secondPrize] : []}
          thirdPrize={gameState.lastResults?.thirdPrize ? [gameState.lastResults.thirdPrize] : []}
          freePrize={gameState.lastResults?.freePrize || []}
          currentUserId={user?.id}
        />

        {import.meta.env.DEV && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={forceGameDraw}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Zap size={16} /> Forzar Sorteo
            </button>
          </div>
        )}

        {/* Payment method selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="text-white text-lg font-bold mb-3 text-center">
              💰 Choose Payment Method
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() => setPaymentMethod('ETH')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  paymentMethod === 'ETH'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                🔷 ETH {ethPrice && `(${parseFloat(ethPrice).toFixed(4)} ETH)`}
              </button>
              <button
                onClick={() => setPaymentMethod('USDC')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  paymentMethod === 'USDC'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                💵 USDC ($5.00)
              </button>
            </div>
          </div>
        </div>

        {/* Transaction status */}
        {isTransactionPending && (
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-500/20 text-yellow-200 px-4 py-2 rounded-lg">
              ⏳ Transaction pending...
            </div>
          </div>
        )}

        {isTransactionConfirmed && (
          <div className="flex justify-center mb-6">
            <div className="bg-green-500/20 text-green-200 px-4 py-2 rounded-lg">
              ✅ Ticket purchased successfully!
            </div>
          </div>
        )}

        <TicketGenerator
          onGenerateTicket={(numbers) => generateTicket(numbers, paymentMethod)}
          disabled={isTransactionPending || !isWalletConnected}
          ticketCount={gameState.tickets.length}
          maxTickets={999}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameState.tickets.map(ticket => (
            <TicketComponent
              key={ticket.id}
              ticket={ticket}
              isWinner={
                gameState.lastResults?.firstPrize?.some(t => t.id === ticket.id) ? 'first' :
                gameState.lastResults?.secondPrize?.some(t => t.id === ticket.id) ? 'second' :
                gameState.lastResults?.thirdPrize?.some(t => t.id === ticket.id) ? 'third' : 
                gameState.lastResults?.freePrize?.some(t => t.id === ticket.id) ? 'free' : null
              }
            />
          ))}
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-white/10 rounded-lg p-6 text-white">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <Trophy className="mr-2" size={24} />
              Premio Structure
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>🥇 First Prize (4 exact matches):</span>
                <span className="font-bold">
                  {prizePools?.eth.firstPrize ? `${parseFloat(prizePools.eth.firstPrize).toFixed(4)} ETH` : 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>🥈 Second Prize (4 any order):</span>
                <span className="font-bold">
                  {prizePools?.eth.secondPrize ? `${parseFloat(prizePools.eth.secondPrize).toFixed(4)} ETH` : 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>🥉 Third Prize (3 exact matches):</span>
                <span className="font-bold">
                  {prizePools?.eth.thirdPrize ? `${parseFloat(prizePools.eth.thirdPrize).toFixed(4)} ETH` : 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>🎫 Free Ticket (3 any order):</span>
                <span className="font-bold">Free ticket</span>
              </div>
              <div className="mt-4 pt-2 border-t border-white/20">
                <div className="flex justify-between text-lg">
                  <span>💰 Total Prize Pool:</span>
                  <span className="font-bold">
                    {prizePools?.eth.total ? `${parseFloat(prizePools.eth.total).toFixed(4)} ETH` : 'Loading...'}
                  </span>
                </div>
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
                  <div>Current Round: {currentRound?.id || 'Loading...'}</div>
                  <div>Round Active: {currentRound?.isActive ? 'Yes' : 'No'}</div>
                  <div>Numbers Drawn: {currentRound?.numbersDrawn ? 'Yes' : 'No'}</div>
                  <div>Tickets: {gameState.tickets.length}</div>
                  <div>Winning Numbers: {gameState.winningNumbers?.join(', ') || 'None'}</div>
                  <div>Time Remaining: {gameState.timeRemaining}s</div>
                  <div>ETH Price: {ethPrice || 'Loading...'}</div>
                  <div>Next Draw: {nextDrawTime?.toLocaleString() || 'Loading...'}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;