import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { WalletConnector } from './components/WalletConnector';
import { Trophy, UserCircle, Zap, Terminal, WalletIcon } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { useAuth } from './components/AuthProvider';
import { useWalletAuth } from './hooks/useWalletAuth';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { WalletInfo } from './components/WalletInfo';

function App() {
  const { gameState, generateTicket, forceGameDraw } = useGameState();
  const { context } = useMiniKit();
  const { user: authUser, isLoading, isFarcasterAvailable, signIn } = useAuth();
  const { user: walletUser, isConnected: isWalletConnected } = useWalletAuth();
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const hasTriedSignIn = useRef(false);
  
  // Use wallet user if available, otherwise use auth user
  const user = walletUser || authUser;
  
  // To avoid constant re-rendering
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Initialize Firebase and SDK once
  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log("SDK initialized correctly");
      } catch (error) {
        console.error("Error initializing SDK:", error);
      }
    };
    
    initSDK();
  }, []);

  // Attempt automatic login if no user
  useEffect(() => {
    // Only try once and when not already loading
    if (!user && !isLoading && !hasTriedSignIn.current && !isWalletConnected) {
      console.log("Attempting automatic login");
      hasTriedSignIn.current = true;
      signIn().catch(err => console.error("Error in automatic login:", err));
    }
    
    // Mark initial load as complete after some time
    if (!initialLoadComplete) {
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 2500); // Give 2.5 seconds for initial load
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, signIn, initialLoadComplete, isWalletConnected]);

  // Show notification when there are winners
  const handleWin = useCallback(async () => {
    // Use security check to avoid undefined errors
    const firstPrizeLength = gameState.lastResults?.firstPrize?.length || 0;
    if (firstPrizeLength > 0) {
      try {
        // Manual notification since useNotification is not available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🎉 You Won!', {
            body: 'Congratulations! You matched all emojis and won the first prize!',
            icon: '/favicon.ico'
          });
        }
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }, [gameState.lastResults]);

  useEffect(() => {
    handleWin();
  }, [gameState.lastResults, handleWin]);

  // Loading screen with animation
  if (isLoading && !initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🎲</div>
          <div className="text-white text-2xl">Loading LottoMoji...</div>
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
                onClick={() => {
                  // Since useViewProfile is not available, use a basic implementation
                  if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'fc_frame', method: 'profile' }, '*');
                  }
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                View Profile
              </button>
            )}
          </div>
        </div>
        
        {/* Wallet information component */}
        <div className="mb-6">
          <WalletConnector />
        </div>
        
        <p className="text-white/90 text-xl mb-4">
          Match 4 emojis to win! 🏆
        </p>
        <p className="text-white/80">Next draw in:</p>
        <div className="flex justify-center mt-4">
          <Timer seconds={gameState.timeRemaining} />
        </div>

        <WinnerAnnouncement 
          winningNumbers={gameState.winningNumbers || []}
          firstPrize={gameState.lastResults?.firstPrize || []}
          secondPrize={gameState.lastResults?.secondPrize || []}
          thirdPrize={gameState.lastResults?.thirdPrize || []}
          freePrize={gameState.lastResults?.freePrize || []}
          currentUserId={user?.id}
        />

        {import.meta.env.DEV && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={forceGameDraw}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Zap size={16} /> Force Draw
            </button>
          </div>
        )}

        <TicketGenerator
          onGenerateTicket={generateTicket}
          disabled={false}
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
          <GameHistoryButton />
          
          <div className="bg-white/10 rounded-lg p-6 text-white">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <Trophy className="mr-2" size={24} />
              Prize Structure
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>🥇 First Prize (4 exact matches):</span>
                <span className="font-bold">1000 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>🥈 Second Prize (4 any order):</span>
                <span className="font-bold">500 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>🥉 Third Prize (3 exact matches):</span>
                <span className="font-bold">100 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>🎫 Free Ticket (3 any order):</span>
                <span className="font-bold">Free ticket</span>
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
                  <div>Tickets: {gameState.tickets.length}</div>
                  <div>Winning Numbers: {gameState.winningNumbers?.join(', ') || 'None'}</div>
                  <div>Time Remaining: {gameState.timeRemaining}s</div>
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