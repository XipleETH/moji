import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { WalletConnector } from './components/WalletConnector';
import { WalletProvider } from './contexts/WalletContext';
import { Trophy, UserCircle, Zap, Terminal, WalletIcon, Ticket as TicketIcon, History } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMiniKit, useNotification, useViewProfile } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { useAuth } from './components/AuthProvider';
import { useWallet } from './contexts/WalletContext';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { TicketHistoryModal } from './components/TicketHistoryModal';
import { TicketHistoryModal } from './components/TicketHistoryModal';
import { WalletInfo } from './components/WalletInfo';
import { PrizePoolSummary, PrizePoolDisplay } from './components/PrizePoolDisplay';
import { resetUserTokens, canUserBuyTicket } from './firebase/tokens';
import { getCurrentUser } from './firebase/auth';
import { debugPrizePool, distributePrizePool } from './firebase/prizePools';
import { initializeDailyPool, checkPoolsHealth } from './utils/initializePools';

// Función global para debuggear tokens
(window as any).debugTokens = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[debugTokens] No hay usuario conectado');
      return;
    }
    
    console.log('[debugTokens] Usuario actual:', user.id);
    
    const result = await canUserBuyTicket(user.id);
    console.log('[debugTokens] Resultado de canUserBuyTicket:', result);
    
    return result;
  } catch (error) {
    console.error('[debugTokens] Error:', error);
  }
};

// Función global para resetear tokens
(window as any).resetTokens = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[resetTokens] No hay usuario conectado');
      return;
    }
    
    console.log('[resetTokens] Reseteando tokens para usuario:', user.id);
    
    const result = await resetUserTokens(user.id);
    console.log('[resetTokens] Resultado:', result);
    
    // Verificar después del reset
    const check = await canUserBuyTicket(user.id);
    console.log('[resetTokens] Verificación después del reset:', check);
    
    return result;
  } catch (error) {
    console.error('[resetTokens] Error:', error);
  }
};

// Funciones globales para debuggear pools de premios
(window as any).debugPrizePool = debugPrizePool;
(window as any).distributePrizePool = distributePrizePool;
(window as any).initializeDailyPool = initializeDailyPool;
(window as any).checkPoolsHealth = checkPoolsHealth;

// Función global para probar la acumulación de pools
(window as any).testPoolAccumulation = async () => {
  try {
    const { getAccumulatedPools } = await import('./firebase/prizePools');
    const { getCurrentGameDaySaoPaulo } = await import('./utils/timezone');
    
    const currentDay = getCurrentGameDaySaoPaulo();
    console.log('📊 Probando acumulación de pools para el día:', currentDay);
    
    const accumulatedPools = await getAccumulatedPools(currentDay);
    console.log('✨ Pools acumuladas encontradas:', accumulatedPools);
    
    return accumulatedPools;
  } catch (error) {
    console.error('[testPoolAccumulation] Error:', error);
  }
};

// Función global para simular un día sin ganadores (solo para testing)
(window as any).simulateNoWinnersDay = async (gameDay) => {
  if (!gameDay) {
    console.error('[simulateNoWinnersDay] Debes especificar un día (YYYY-MM-DD)');
    return;
  }
  
  try {
    const { db } = await import('./firebase/config');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    
    console.log('🎭 Simulando día sin ganadores para:', gameDay);
    
    // Crear resultado sin ganadores
    const gameResult = {
      id: `sim-${gameDay}`,
      gameDay: gameDay,
      timestamp: serverTimestamp(),
      winningNumbers: ['🎲', '🎯', '🎪'],
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: [],
      prizesDistributed: true,
      prizeTransactions: []
    };
    
    await setDoc(doc(db, 'game_results', `sim-${gameDay}`), gameResult);
    
    // Crear pool distribuida para ese día
    const prizePool = {
      gameDay: gameDay,
      totalTokensCollected: 100,
      poolsDistributed: true,
      pools: {
        firstPrize: 64,
        firstPrizeReserve: 16,
        secondPrize: 8,
        secondPrizeReserve: 2,
        thirdPrize: 4,
        thirdPrizeReserve: 1,
        development: 5
      },
      finalPools: {
        firstPrize: 64,
        secondPrize: 8,
        thirdPrize: 4
      },
      reserves: {
        firstPrizeActivated: false,
        secondPrizeActivated: false,
        thirdPrizeActivated: false
      },
      accumulatedFromPreviousDays: {
        firstPrize: 0,
        secondPrize: 0,
        thirdPrize: 0,
        totalDaysAccumulated: 0
      },
      lastUpdated: serverTimestamp()
    };
    
    await setDoc(doc(db, 'prize_pools', gameDay), prizePool);
    
    console.log('✅ Día sin ganadores simulado exitosamente');
    console.log('- Resultado del juego creado sin ganadores');
    console.log('- Pool distribuida creada con tokens que deberían acumularse');
    
    return { gameResult, prizePool };
  } catch (error) {
    console.error('[simulateNoWinnersDay] Error:', error);
  }
};

// Función global para forzar actualización de pool
(window as any).forcePoolUpdate = async () => {
  try {
    const { addTokensToPool } = await import('./firebase/prizePools');
    const { getCurrentUser } = await import('./firebase/auth');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('[forcePoolUpdate] No hay usuario conectado');
      return;
    }
    
    console.log('[forcePoolUpdate] Forzando actualización de pool con 1 token...');
    const result = await addTokensToPool(user.id, user.walletAddress, 1, 'debug-ticket-' + Date.now());
    console.log('[forcePoolUpdate] Resultado:', result);
    
    return result;
  } catch (error) {
    console.error('[forcePoolUpdate] Error:', error);
  }
};

// Función global para ver estado actual de pool
(window as any).getCurrentPoolState = async () => {
  try {
    const { getDailyPrizePool } = await import('./firebase/prizePools');
    const { getCurrentGameDaySaoPaulo, getTimeUntilNextDrawSaoPaulo } = await import('./utils/timezone');
    
    const currentDay = getCurrentGameDaySaoPaulo();
    const timeUntilDraw = getTimeUntilNextDrawSaoPaulo();
    const timeUntilDistribution = timeUntilDraw > 5 * 60 ? (timeUntilDraw - 5 * 60) : 0;
    
    console.log('🕐 Información de tiempo:');
    console.log('- Día actual (SP):', currentDay);
    console.log('- Tiempo hasta sorteo:', Math.floor(timeUntilDraw / 3600) + 'h ' + Math.floor((timeUntilDraw % 3600) / 60) + 'm ' + (timeUntilDraw % 60) + 's');
    console.log('- Tiempo hasta distribución:', timeUntilDistribution > 0 ? Math.floor(timeUntilDistribution / 3600) + 'h ' + Math.floor((timeUntilDistribution % 3600) / 60) + 'm ' + (timeUntilDistribution % 60) + 's' : 'Pool cerrada para distribución');
    console.log('- Pool debe estar cerrada:', timeUntilDraw <= 5 * 60 ? 'SÍ' : 'NO');
    
    const pool = await getDailyPrizePool(currentDay);
    
    console.log('🏆 Estado de la pool:');
    console.log('- Total tokens:', pool.totalTokensCollected);
    console.log('- Pool distribuida:', pool.poolsDistributed ? 'SÍ' : 'NO');
    console.log('- Puede agregar tokens:', !pool.poolsDistributed ? 'SÍ' : 'NO');
    console.log('- Pools acumuladas:', pool.accumulatedFromPreviousDays);
    console.log('- Pools finales:', pool.finalPools);
    
    if (pool.distributionTimestamp) {
      console.log('- Distribuida en:', new Date(pool.distributionTimestamp).toLocaleString());
    }
    
    return pool;
  } catch (error) {
    console.error('[getCurrentPoolState] Error:', error);
  }
};

// Función global para verificar permisos de escritura en Firebase
(window as any).testFirebaseWrite = async () => {
  try {
    const { db } = await import('./firebase/config');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { getCurrentGameDaySaoPaulo } = await import('./utils/timezone');
    
    const currentDay = getCurrentGameDaySaoPaulo();
    console.log('🔥 Probando escritura en Firebase...');
    
    // Intentar escribir en la colección de test
    const testRef = doc(db, 'test_collection', 'test_' + Date.now());
    await setDoc(testRef, {
      message: 'Test de escritura',
      timestamp: serverTimestamp(),
      currentDay: currentDay
    });
    
    console.log('✅ Escritura en Firebase exitosa');
    
    // Intentar escribir directamente en prize_pools
    const poolRef = doc(db, 'prize_pools', 'test_' + currentDay);
    await setDoc(poolRef, {
      gameDay: currentDay,
      totalTokensCollected: 1,
      poolsDistributed: false,
      testEntry: true,
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Escritura en prize_pools exitosa');
    
    return true;
  } catch (error) {
    console.error('❌ Error en escritura de Firebase:', error);
    return false;
  }
};

// Función global para debuggear zona horaria
(window as any).debugTimezone = () => {
  try {
    const now = new Date();
    const utc = new Date(now.getTime());
    
    // Simular cálculo del backend
    const saoPauloOffset = -3;
    const saoPauloTime = new Date(now.getTime() + (saoPauloOffset * 60 * 60 * 1000));
    const month = saoPauloTime.getUTCMonth();
    const isDaylightSaving = month >= 9 || month <= 1;
    if (isDaylightSaving) {
      saoPauloTime.setUTCHours(saoPauloTime.getUTCHours() + 1);
    }
    
    const backendGameDay = `${saoPauloTime.getUTCFullYear()}-${String(saoPauloTime.getUTCMonth() + 1).padStart(2, '0')}-${String(saoPauloTime.getUTCDate()).padStart(2, '0')}`;
    
    console.log('🕐 Debug Timezone:');
    console.log('- Hora local del navegador:', now.toLocaleString());
    console.log('- UTC:', utc.toISOString());
    console.log('- São Paulo calculado (backend):', saoPauloTime.toISOString());
    console.log('- GameDay del backend:', backendGameDay);
    console.log('- En horario de verano:', isDaylightSaving ? 'SÍ' : 'NO');
    console.log('- Mes actual (0-11):', month);
    
    // Importar función del frontend
    import('./firebase/tokens').then(({ getCurrentGameDay }) => {
      const frontendGameDay = getCurrentGameDay();
      console.log('- GameDay del frontend:', frontendGameDay);
      console.log('- ¿Coinciden?', backendGameDay === frontendGameDay ? '✅ SÍ' : '❌ NO');
    });
    
    return {
      local: now.toLocaleString(),
      utc: utc.toISOString(),
      saoPaulo: saoPauloTime.toISOString(),
      backendGameDay,
      isDaylightSaving
    };
  } catch (error) {
    console.error('[debugTimezone] Error:', error);
  }
};

// Función global para consultar tickets manualmente
(window as any).checkUserTickets = async () => {
  try {
    const { getCurrentUser } = await import('./firebase/auth');
    const { db } = await import('./firebase/config');
    const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
    const { getCurrentGameDay } = await import('./firebase/tokens');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('[checkUserTickets] ❌ No hay usuario conectado');
      return;
    }
    
    const currentGameDay = getCurrentGameDay();
    console.log(`[checkUserTickets] 🔍 Buscando tickets para usuario ${user.id} en día ${currentGameDay}`);
    
    // Consulta directa a Firebase
    const ticketsQuery = query(
      collection(db, 'player_tickets'),
      where('userId', '==', user.id),
      where('gameDay', '==', currentGameDay),
      where('isActive', '==', true),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(ticketsQuery);
    
    console.log(`[checkUserTickets] 📊 Resultados encontrados: ${snapshot.size} tickets`);
    
    if (snapshot.size === 0) {
      // Buscar sin filtro de gameDay para ver si hay tickets de otros días
      console.log('[checkUserTickets] 🔍 Buscando tickets de cualquier día...');
      
      const allTicketsQuery = query(
        collection(db, 'player_tickets'),
        where('userId', '==', user.id),
        where('isActive', '==', true),
        orderBy('timestamp', 'desc')
      );
      
      const allSnapshot = await getDocs(allTicketsQuery);
      console.log(`[checkUserTickets] 📊 Total tickets del usuario (todos los días): ${allSnapshot.size}`);
      
      allSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`[checkUserTickets] 🎫 Ticket ${index + 1}:`, {
          id: doc.id,
          gameDay: data.gameDay,
          timestamp: new Date(data.timestamp?.toMillis() || 0).toLocaleString(),
          userId: data.userId,
          isActive: data.isActive,
          numbers: data.numbers?.length || 0
        });
      });
    } else {
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`[checkUserTickets] 🎫 Ticket del día actual ${index + 1}:`, {
          id: doc.id,
          gameDay: data.gameDay,
          timestamp: new Date(data.timestamp?.toMillis() || 0).toLocaleString(),
          userId: data.userId,
          isActive: data.isActive,
          numbers: data.numbers
        });
      });
    }
    
    return {
      user: user.id,
      currentGameDay,
      todayTickets: snapshot.size
    };
  } catch (error) {
    console.error('[checkUserTickets] Error:', error);
  }
};

function AppContent() {
  const { gameState, generateTicket, forceGameDraw } = useGameState();
  const { context } = useMiniKit();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();
  const { user: authUser, isLoading, isFarcasterAvailable, signIn } = useAuth();
  const { user: walletUser, isConnected: isWalletConnected } = useWallet();
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showTicketHistory, setShowTicketHistory] = useState(false);
  const hasTriedSignIn = useRef(false);
  
  // Usar wallet user si está disponible, sino usar auth user
  const user = walletUser || authUser;
  
  // Para evitar renderizado constante
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Debug logging para tickets
  useEffect(() => {
    console.log(`[App] 📊 Estado de tickets actualizado: ${gameState.tickets.length} tickets`);
    gameState.tickets.forEach((ticket, index) => {
      console.log(`[App] 🎫 Ticket ${index + 1}:`, {
        id: ticket.id,
        gameDay: ticket.gameDay,
        timestamp: new Date(ticket.timestamp).toLocaleString(),
        isTemp: ticket.id.startsWith('temp-')
      });
    });
  }, [gameState.tickets]);

  // Inicializar Firebase y SDK una sola vez
  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log("SDK inicializado correctamente");
        
        // Inicializar pool de premios del día
        try {
          await initializeDailyPool();
          console.log("Pool de premios inicializada correctamente");
        } catch (poolError) {
          console.error("Error inicializando pool de premios:", poolError);
        }
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
    // Usar verificación de seguridad para evitar errores undefined
    const firstPrizeLength = gameState.lastResults?.firstPrize?.length || 0;
    if (firstPrizeLength > 0) {
      try {
        await sendNotification({
          title: '🎉 You Won!',
          body: 'Congratulations! You matched all emojis and won the first prize!'
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
          <p className="text-white/80 text-lg mb-4">
            ⏰ Next draw in:
          </p>
          <div className="flex justify-center">
            <Timer seconds={gameState.timeRemaining} />
          </div>
        </div>

        {/* Pool de Premios */}
        <div className="max-w-md mx-auto mb-8">
          <PrizePoolDisplay 
            showDetailedBreakdown={true} 
            showDebugControls={import.meta.env.DEV}
          />
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
              <Zap size={16} /> Forzar Sorteo
            </button>
          </div>
        )}

        <TicketGenerator
          onGenerateTicket={generateTicket}
          disabled={false}
          ticketCount={gameState.tickets.length}
          maxTickets={999}
          userTokens={gameState.userTokens}
          tokensUsed={10 - gameState.userTokens}
        />

        {/* Tickets de hoy con botón de historial */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <TicketIcon className="mr-2" size={24} />
              Mis Tickets de Hoy ({gameState.tickets.length})
            </h2>
            <button
              onClick={() => setShowTicketHistory(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <History size={16} />
              Ver Historial
            </button>
          </div>
          

          
          {gameState.tickets.length > 0 ? (
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
          ) : (
            <div className="text-center py-8 bg-white/10 rounded-lg">
              <TicketIcon className="mx-auto text-white/40 mb-4" size={48} />
              <p className="text-white/70">No has comprado tickets hoy</p>
              <p className="text-white/50 text-sm mt-2">¡Genera tu primer ticket arriba!</p>
            </div>
          )}
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

      {/* Modal del Historial de Tickets */}
      {showTicketHistory && (
        <TicketHistoryModal onClose={() => setShowTicketHistory(false)} />
      )}
    </div>
  );
}

function App() {
  useEffect(() => {
    console.log('[App] Funciones de debug agregadas a window:');
    console.log('- window.debugTokens() - Ver estado actual de tokens');
    console.log('- window.resetTokens() - Resetear tokens del usuario actual');
    console.log('- window.getCurrentPoolState() - Ver estado actual de la pool');
    console.log('- window.forcePoolUpdate() - Forzar actualización de pool');
    console.log('- window.checkPoolsHealth() - Verificar salud de pools');
    console.log('- window.testPoolAccumulation() - Probar acumulación de pools');
    console.log('- window.simulateNoWinnersDay("2024-12-20") - Simular día sin ganadores');
    console.log('- window.testFirebaseWrite() - Probar permisos de escritura en Firebase');
    console.log('- window.debugTimezone() - Verificar zona horaria');
    console.log('- window.checkUserTickets() - Consultar tickets manualmente');
    console.log('- window.getCurrentPoolState() - Ver estado actual de la pool');
  }, []);

  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;