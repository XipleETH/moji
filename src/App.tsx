import React, { useState, useEffect, useCallback, useRef } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { Timer } from './components/Timer';
import { TicketGenerator } from './components/TicketGenerator';
import { Ticket as TicketComponent } from './components/Ticket';
import { EmojiChat } from './components/chat/EmojiChat';
import { GameHistoryButton } from './components/GameHistoryButton';
import { WalletConnector } from './components/WalletConnector';
import { NetworkInfo } from './components/NetworkInfo';
import { useGameState } from './hooks/useGameState';
import { useAuth } from './components/AuthProvider';
import { useMiniKitAuth } from './providers/MiniKitProvider';
import { useNotification } from './hooks/useNotification';
import { useViewProfile } from './hooks/useViewProfile';
import { useAccount } from 'wagmi';
import { Trophy, Zap, Terminal } from 'lucide-react';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { WalletTroubleshooting } from './components/WalletTroubleshooting';
import { DebugInfo } from './components/DebugInfo';
import { PaymentMethodSelector } from './components/PaymentMethodSelector';
import { USDCApprovalButton } from './components/USDCApprovalButton';
// import { USDCVerification } from './components/USDCVerification';

function App() {
  // Main game state hook (this should handle both Firebase and contracts)
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
  
  // Authentication and wallet
  const { context } = useMiniKitAuth();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();
  const { user: authUser, isLoading, isFarcasterAvailable, signIn } = useAuth();
  const { address, isConnected: isWalletConnected, chainId } = useAccount();
  
  // Local state
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ETH' | 'USDC'>('ETH');
  const hasTriedSignIn = useRef(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Create user object from wallet address or use auth user
  const walletUser = address ? {
    id: address,
    username: `${address.slice(0, 6)}...${address.slice(-4)}`,
    walletAddress: address,
    isFarcasterUser: false
  } : null;
  
  const user = walletUser || authUser;

  // Initialize SDK
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

  // Auto sign-in attempt
  useEffect(() => {
    if (!user && !isLoading && !hasTriedSignIn.current && !isWalletConnected) {
      console.log("Intentando inicio de sesión automático");
      hasTriedSignIn.current = true;
      signIn().catch(err => console.error("Error en inicio de sesión automático:", err));
    }
    
    if (!initialLoadComplete) {
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, signIn, initialLoadComplete, isWalletConnected]);

  // Notification on win
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

  // Loading screen
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
        {/* Header */}
        <div className="relative mb-8">
          <div className="absolute top-0 left-0">
            <GameHistoryButton />
          </div>
          
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
          
          <div className="flex justify-center pt-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white text-center">
              🎰 LottoMoji 🎲
            </h1>
          </div>
        </div>
        
        {/* Debug info for development */}
        <DebugInfo />
        
        {/* USDC Contract Verification - Temporarily disabled for debugging */}

        {/* Game info */}
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

        {/* Network info and errors */}
        <div className="flex justify-center mb-6">
          <NetworkInfo />
        </div>

        {/* Contract errors */}
        {gameState.error && (
          <div className="flex justify-center mb-6">
            <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg border border-red-500">
              ⚠️ Error: {gameState.error.message || 'Unknown error occurred'}
            </div>
          </div>
        )}

        {/* Chain validation */}
        {isWalletConnected && chainId !== 84532 && (
          <div className="flex justify-center mb-6">
            <div className="bg-orange-500/20 text-orange-200 px-4 py-2 rounded-lg border border-orange-500">
              🔄 Please switch to Base Sepolia network to play LottoMoji
            </div>
          </div>
        )}

        {/* Wallet troubleshooting */}
        {isWalletConnected && (
          <WalletTroubleshooting />
        )}

        <WinnerAnnouncement 
          winningNumbers={gameState.winningNumbers || []}
          firstPrize={gameState.lastResults?.freePrize || []}
          secondPrize={gameState.lastResults?.freePrize || []}
          thirdPrize={gameState.lastResults?.freePrize || []}
          freePrize={gameState.lastResults?.freePrize || []}
          currentUserId={user?.id}
        />

        {/* Dev tools */}
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
          <div className="w-full max-w-md">
            <PaymentMethodSelector
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              disabled={isTransactionPending || !isWalletConnected}
            />
          </div>
        </div>

        {/* USDC Approval (always visible when connected and USDC selected) */}
        {isWalletConnected && paymentMethod === 'USDC' && (
          <div className="flex justify-center mb-6">
            <div className="w-full max-w-md">
              <USDCApprovalButton />
            </div>
          </div>
        )}

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

        {/* Ticket generator */}
        <TicketGenerator
          onGenerateTicket={(numbers) => generateTicket(numbers, paymentMethod)}
          disabled={isTransactionPending || !isWalletConnected}
          ticketCount={gameState.tickets.length}
          maxTickets={999}
        />

        {/* User tickets */}
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

        {/* Prize pool info and chat */}
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
          
          {/* Debug panel */}
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
                  <div>Chain ID: {chainId || 'Unknown'}</div>
                  <div>Valid Chain: {chainId === 84532 ? 'Yes' : 'No'}</div>
                  <div>Transaction Pending: {isTransactionPending ? 'Yes' : 'No'}</div>
                  <div>Transaction Confirmed: {isTransactionConfirmed ? 'Yes' : 'No'}</div>
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