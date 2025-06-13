import React, { useState, useEffect } from 'react';
import { WalletIcon, Coins, CircleDollarSign, RefreshCw, UserIcon, ArrowUpDown, Trophy } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from './AuthProvider';
import { useFarcasterWallet } from '../hooks/useFarcasterWallet';
import { useMiniKitAuth } from '../providers/MiniKitProvider';
import { getUserTokenTransactions } from '../firebase/tokens';
import { formatNumber } from '../utils/format';
import { TokenTransaction } from '../types';

// Constantes de red
const BASE_CHAIN_ID = 8453;
const OPTIMISM_CHAIN_ID = 10;

export const WalletInfo: React.FC = () => {
  const { user } = useAuth();
  const { 
    isConnected: isWalletConnected, 
    isConnecting: isWalletConnecting, 
    tokenBalance, 
    nfts, 
    lastTransaction,
    isPendingTransaction,
    connectWallet,
    refreshWalletData
  } = useWallet();
  
  // Nuevo hook de billetera de Farcaster
  const {
    isConnected: isFarcasterConnected,
    isConnecting: isFarcasterConnecting,
    address: farcasterAddress,
    fid: farcasterFid,
    username: farcasterUsername,
    connect: connectFarcaster,
    error: farcasterError,
    currentChainId,
    switchToBase,
    isBaseNetwork
  } = useFarcasterWallet();
  
  // Información del context de MiniKit
  const { farcasterUser, isWarpcastApp } = useMiniKitAuth();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);
  
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [totalWonTokens, setTotalWonTokens] = useState(0);
  const [balance, setBalance] = useState<number>(0);

  // Determinar la información de billetera a mostrar (priorizando Farcaster)
  const walletAddress = farcasterAddress || user?.walletAddress;
  const fid = farcasterFid || user?.fid;
  const username = farcasterUsername || user?.username;
  const isConnected = isFarcasterConnected || isWalletConnected;
  const isConnecting = isFarcasterConnecting || isWalletConnecting;
  
  // Cargar transacciones cuando el usuario está conectado
  useEffect(() => {
    if (user?.id) {
      loadTransactions();
    }
  }, [user?.id]);

  const loadTransactions = async () => {
    if (!user?.id) return;
    
    setIsLoadingTransactions(true);
    try {
      const userTransactions = await getUserTokenTransactions(user.id);
      setTransactions(userTransactions);
      
      // Calcular tokens ganados
      const wonTokens = userTransactions
        .filter(tx => tx.type === 'prize')
        .reduce((total, tx) => total + tx.amount, 0);
      setTotalWonTokens(wonTokens);
    } catch (error) {
      console.error('Error cargando transacciones:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  // Función para cambiar a la red Base
  const handleSwitchToBase = async () => {
    try {
      setIsChangingNetwork(true);
      const success = await switchToBase();
      if (success) {
        console.log("Cambiado a Base exitosamente");
      } else {
        console.error("No se pudo cambiar a Base");
      }
    } catch (error) {
      console.error("Error cambiando a Base:", error);
    } finally {
      setIsChangingNetwork(false);
    }
  };
  
  // Obtener nombre de red
  const getNetworkName = (chainId: number | null): string => {
    if (chainId === null) return "Red desconocida";
    
    switch (chainId) {
      case 1: return "Ethereum Mainnet";
      case BASE_CHAIN_ID: return "Base";
      case OPTIMISM_CHAIN_ID: return "Optimism";
      default: return `Red ${chainId}`;
    }
  };
  
  if (!walletAddress) {
    return (
      <div className="bg-white/10 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <WalletIcon className="mr-2" size={18} />
            <span className="font-medium">Billetera Farcaster</span>
          </div>
          <button
            onClick={() => connectFarcaster()}
            disabled={isConnecting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
        {farcasterError && (
          <div className="mt-2 text-red-300 text-sm">
            {farcasterError}
          </div>
        )}
        
        {isWarpcastApp && !isConnected && (
          <div className="mt-2 p-2 bg-yellow-500/20 rounded text-yellow-200 text-xs">
            Se requiere una billetera para participar en la lotería.
            {isWarpcastApp && " Usa el botón de Conectar para autorizar tu billetera Farcaster."}
          </div>
        )}
      </div>
    );
  }
  
  // Formatear la dirección de la billetera para mostrarla abreviada
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  useEffect(() => {
    const loadUserData = async () => {
      if (isConnected && walletAddress) {
        try {
          const userBalance = await getUserBalance(walletAddress);
          setBalance(userBalance);
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    };

    loadUserData();
  }, [isConnected, walletAddress]);

  const getTransactionType = (type: string) => {
    switch (type) {
      case 'PRIZE_WIN':
        return '🏆 Premio Ganado';
      case 'TICKET_PURCHASE':
        return '🎫 Compra de Ticket';
      case 'INITIAL_BALANCE':
        return '🎁 Tokens Iniciales';
      default:
        return type;
    }
  };

  const getTransactionEmoji = (type: string) => {
    switch (type) {
      case 'PRIZE_WIN':
        return '💰';
      case 'TICKET_PURCHASE':
        return '💸';
      case 'INITIAL_BALANCE':
        return '🎁';
      default:
        return '📝';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Mi Wallet</h2>
        <button
          onClick={() => {
            connectWallet();
            refreshWalletData();
          }}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Desconectar
        </button>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1">Dirección</div>
        <div className="font-mono text-sm bg-black/20 p-2 rounded">
          {formatAddress(walletAddress)}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1">Balance de Tokens</div>
        <div className="text-2xl font-bold">
          {isLoadingTransactions ? 'Cargando...' : formatNumber(balance)}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1">Tokens Ganados</div>
        <div className="text-2xl font-bold text-green-400">
          {isLoadingTransactions ? 'Cargando...' : formatNumber(totalWonTokens)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Total acumulado de premios ganados
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-2">Historial de Transacciones</div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {isLoadingTransactions ? (
            <div className="text-center text-gray-400">Cargando transacciones...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-gray-400">No hay transacciones</div>
          ) : (
            transactions.map((tx, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-black/20 rounded"
              >
                <div className="flex items-center">
                  <span className="mr-2">{getTransactionEmoji(tx.type)}</span>
                  <span className="text-sm">{getTransactionType(tx.type)}</span>
                </div>
                <div className={`font-mono text-sm ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.amount >= 0 ? '+' : ''}{formatNumber(tx.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}; 