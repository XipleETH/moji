import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, WalletProvider } from '../types';
import { connectWallet, getWalletProvider } from '../utils/wallets';

interface WalletContextType {
  user: User | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectingWallet: WalletProvider | null;
  error: string | null;
  connect: (walletId?: WalletProvider) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<WalletProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const isConnected = !!user?.walletAddress;

  // Log state changes for debugging
  useEffect(() => {
    console.log('[WalletContext] State changed:', {
      user: user ? { id: user.id, walletAddress: user.walletAddress } : null,
      isConnected,
      isConnecting,
      error
    });
  }, [user, isConnected, isConnecting, error]);

  // Función para obtener información del usuario basada en la wallet
  const getUserFromWallet = useCallback(async (
    address: string, 
    walletProvider: WalletProvider,
    chainId: number
  ): Promise<User> => {
    // Crear un usuario basado en la dirección de wallet
    const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    
    return {
      id: `wallet-${address.toLowerCase()}`,
      username: `User-${shortAddress}`,
      walletAddress: address,
      isFarcasterUser: false, // Es un usuario de wallet directo
      verifiedWallet: true,
      chainId,
      walletProvider,
      connectedAt: Date.now()
    };
  }, []);

  // Función para conectar wallet con soporte para múltiples proveedores
  const connect = async (walletId: WalletProvider = 'injected') => {
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      setConnectingWallet(walletId);
      setError(null);
      
      console.log(`[WalletContext] Connecting to ${walletId} wallet...`);
      
      // Usar la función de conectWallet del utils
      const { address, chainId, provider } = await connectWallet(walletId);
      
      console.log(`[WalletContext] ${walletId} connected:`, { address, chainId });

      // Crear usuario
      const walletUser = await getUserFromWallet(address, walletId, chainId);
      
      console.log('[WalletContext] User created:', walletUser);
      
      setUser(walletUser);
      
      // Guardar en localStorage para persistencia
      localStorage.setItem('walletAuth', JSON.stringify({
        address,
        chainId,
        walletProvider: walletId,
        timestamp: Date.now()
      }));
      
      // Inicializar tokens automáticamente después de conectar
      try {
        console.log('[WalletContext] Inicializando tokens para nuevo usuario...');
        const { getUserDailyTokens } = await import('../firebase/tokens');
        await getUserDailyTokens(walletUser.id);
        console.log('[WalletContext] Tokens inicializados exitosamente');
      } catch (tokenError) {
        console.warn('[WalletContext] Error inicializando tokens:', tokenError);
        // No fallar la conexión por esto, solo loggear
      }
      
      console.log(`[WalletContext] ${walletId} connection successful!`);
      
    } catch (err) {
      console.error(`[WalletContext] Error connecting to ${walletId}:`, err);
      setError(err instanceof Error ? err.message : 'Error connecting wallet');
    } finally {
      setIsConnecting(false);
      setConnectingWallet(null);
    }
  };

  // Función para desconectar
  const disconnect = () => {
    console.log('[WalletContext] Disconnecting...');
    setUser(null);
    setError(null);
    localStorage.removeItem('walletAuth');
  };

  // Función para verificar conexión existente
  const checkExistingConnection = useCallback(async () => {
    try {
      const savedAuth = localStorage.getItem('walletAuth');
      if (!savedAuth) return;

      const { address, chainId, walletProvider, timestamp } = JSON.parse(savedAuth);
      
      // Verificar que no sea muy antigua (24 horas)
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('walletAuth');
        return;
      }

      // Verificar que el proveedor de wallet esté disponible
      const provider = getWalletProvider(walletProvider || 'injected');
      if (!provider) {
        localStorage.removeItem('walletAuth');
        return;
      }

      // Verificar que la cuenta aún esté conectada
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (!accounts || !accounts.includes(address)) {
        localStorage.removeItem('walletAuth');
        return;
      }

      // Restaurar usuario
      const walletUser = await getUserFromWallet(address, walletProvider || 'injected', chainId);
      
      console.log('[WalletContext] Connection restored:', walletUser);
      setUser(walletUser);
      
      // Inicializar tokens para usuario restaurado
      try {
        console.log('[WalletContext] Inicializando tokens para usuario restaurado...');
        const { getUserDailyTokens } = await import('../firebase/tokens');
        await getUserDailyTokens(walletUser.id);
        console.log('[WalletContext] Tokens de usuario restaurado inicializados');
      } catch (tokenError) {
        console.warn('[WalletContext] Error inicializando tokens de usuario restaurado:', tokenError);
      }
      
      // Inicializar tokens para usuario restaurado
      try {
        console.log('[WalletContext] Inicializando tokens para usuario restaurado...');
        const { getUserDailyTokens } = await import('../firebase/tokens');
        await getUserDailyTokens(walletUser.id);
        console.log('[WalletContext] Tokens de usuario restaurado inicializados');
      } catch (tokenError) {
        console.warn('[WalletContext] Error inicializando tokens de usuario restaurado:', tokenError);
      }
      
    } catch (error) {
      console.error('[WalletContext] Error checking existing connection:', error);
      localStorage.removeItem('walletAuth');
    }
  }, [getUserFromWallet]);

  // Escuchar cambios de cuenta y red
  useEffect(() => {
    if (!user?.walletProvider) return;

    const provider = getWalletProvider(user.walletProvider);
    if (!provider) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('[WalletContext] Accounts changed:', accounts);
      
      if (accounts.length === 0) {
        disconnect();
      } else if (user && accounts[0] !== user.walletAddress) {
        // Actualizar con la nueva cuenta
        const walletUser = await getUserFromWallet(
          accounts[0], 
          user.walletProvider!, 
          user.chainId || 8453
        );
        setUser(walletUser);
        
        // Actualizar localStorage
        localStorage.setItem('walletAuth', JSON.stringify({
          address: accounts[0],
          chainId: user.chainId || 8453,
          walletProvider: user.walletProvider,
          timestamp: Date.now()
        }));
        
        // Inicializar tokens para la nueva cuenta
        try {
          console.log('[WalletContext] Inicializando tokens para cuenta cambiada...');
          const { getUserDailyTokens } = await import('../firebase/tokens');
          await getUserDailyTokens(walletUser.id);
          console.log('[WalletContext] Tokens para nueva cuenta inicializados');
        } catch (tokenError) {
          console.warn('[WalletContext] Error inicializando tokens para nueva cuenta:', tokenError);
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      console.log('[WalletContext] Chain changed:', newChainId);
      
      if (user) {
        setUser(prev => prev ? { ...prev, chainId: newChainId } : null);
        
        // Actualizar localStorage
        localStorage.setItem('walletAuth', JSON.stringify({
          address: user.walletAddress,
          chainId: newChainId,
          walletProvider: user.walletProvider,
          timestamp: Date.now()
        }));
      }
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
    };
  }, [user, getUserFromWallet]);

  // Verificar conexión existente al montar
  useEffect(() => {
    checkExistingConnection();
  }, [checkExistingConnection]);

  const value: WalletContextType = {
    user,
    isConnected,
    isConnecting,
    connectingWallet,
    error,
    connect,
    disconnect
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 