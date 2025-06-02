import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface WalletAuthHook {
  user: User | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWalletAuth = (): WalletAuthHook => {
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Función para detectar si tenemos Coinbase Wallet o MetaMask
  const detectWallet = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    return null;
  };

  // Función para obtener información del usuario basada en la wallet
  const getUserFromWallet = useCallback(async (address: string): Promise<User> => {
    // Crear un usuario basado en la dirección de wallet
    const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    
    return {
      id: `wallet-${address.toLowerCase()}`,
      username: `User-${shortAddress}`,
      walletAddress: address,
      isFarcasterUser: false, // Es un usuario de wallet directo
      verifiedWallet: true,
      chainId: 8453 // Base por defecto
    };
  }, []);

  // Función para conectar wallet
  const connect = async () => {
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('[WalletAuth] Starting wallet connection...');
      
      const ethereum = detectWallet();
      if (!ethereum) {
        throw new Error('No wallet detected (Coinbase Wallet or MetaMask)');
      }

      console.log('[WalletAuth] Wallet detected, requesting accounts...');
      
      // Request account access
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('Could not get any account');
      }

      const address = accounts[0];
      console.log('[WalletAuth] Account obtained:', address);

      let chainId = 8453; // Base default

      // Try to get current chainId
      try {
        const currentChainId = await ethereum.request({
          method: 'eth_chainId'
        });
        chainId = parseInt(currentChainId, 16);
        console.log('[WalletAuth] ChainId detected:', chainId);
      } catch (chainError) {
        console.warn('[WalletAuth] Could not get chainId:', chainError);
      }

      // Save to localStorage
      const authData = {
        address,
        chainId,
        timestamp: Date.now()
      };
      localStorage.setItem('walletAuth', JSON.stringify(authData));

      // Create user object
      const walletUser = await getUserFromWallet(address);
      walletUser.chainId = chainId;
      
      console.log('[WalletAuth] User created:', walletUser);
      
      setUser(walletUser);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      
    } catch (err) {
      console.error('[WalletAuth] Error connecting wallet:', err);
      setError(err instanceof Error ? err.message : 'Error connecting wallet');
      setIsConnecting(false);
    }
  };

  // Función para desconectar
  const disconnect = useCallback(() => {
    console.log('[WalletAuth] Disconnecting...');
    localStorage.removeItem('walletAuth');
    setUser(null);
    setIsConnected(false);
    setError(null);
  }, []);

  // Función para verificar conexión existente
  const checkExistingConnection = useCallback(async () => {
    try {
      const savedAuth = localStorage.getItem('walletAuth');
      if (!savedAuth) return;

      const { address, chainId, timestamp } = JSON.parse(savedAuth);
      
      // Verificar que no sea muy antigua (24 horas)
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('walletAuth');
        return;
      }

      const ethereum = detectWallet();
      if (!ethereum) return;

      // Verificar que la cuenta aún esté conectada
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (!accounts || !accounts.includes(address)) {
        localStorage.removeItem('walletAuth');
        return;
      }

      // Restaurar usuario
      const walletUser = await getUserFromWallet(address);
      walletUser.chainId = chainId;
      
      console.log('[WalletAuth] Connection restored:', walletUser);
      setUser(walletUser);
      
    } catch (error) {
      console.error('[WalletAuth] Error verifying existing connection:', error);
      localStorage.removeItem('walletAuth');
    }
  }, [getUserFromWallet]);

  // Escuchar cambios de cuenta
  useEffect(() => {
    const ethereum = detectWallet();
    if (!ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('[WalletAuth] Accounts changed:', accounts);
      
      if (accounts.length === 0) {
        disconnect();
      } else if (user && accounts[0] !== user.walletAddress) {
        // Actualizar con la nueva cuenta
        const walletUser = await getUserFromWallet(accounts[0]);
        setUser(walletUser);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      console.log('[WalletAuth] Chain changed:', newChainId);
      
      if (user) {
        setUser(prev => prev ? { ...prev, chainId: newChainId } : null);
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [user, getUserFromWallet]);

  // Verificar conexión existente al montar
  useEffect(() => {
    checkExistingConnection();
  }, [checkExistingConnection]);

  return {
    user,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect
  };
}; 