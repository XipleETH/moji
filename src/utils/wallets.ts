import { WalletProvider, WalletInfo } from '../types';

// Detectar si Coinbase Wallet está disponible
export const isCoinbaseWalletAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const { ethereum } = window as any;
  
  if (!ethereum) return false;
  
  // Verificar si es Coinbase Wallet específicamente
  if (ethereum.isCoinbaseWallet || ethereum.isCoinbaseBrowser) {
    return true;
  }
  
  // Si hay múltiples proveedores, buscar Coinbase Wallet
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    return ethereum.providers.some((provider: any) => 
      provider.isCoinbaseWallet || provider.isCoinbaseBrowser
    );
  }
  
  return false;
};

// Detectar si MetaMask está disponible
export const isMetaMaskAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const { ethereum } = window as any;
  
  if (!ethereum) return false;
  
  // Si es MetaMask sin Coinbase Wallet
  if (ethereum.isMetaMask && !ethereum.isCoinbaseWallet) {
    return true;
  }
  
  // Si hay múltiples proveedores, buscar MetaMask específicamente
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    return ethereum.providers.some((provider: any) => 
      provider.isMetaMask && !provider.isCoinbaseWallet
    );
  }
  
  return false;
};

// Detectar cualquier proveedor inyectado
export const isInjectedWalletAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).ethereum;
};

// Obtener el proveedor específico
export const getWalletProvider = (walletId: WalletProvider): any => {
  if (typeof window === 'undefined') return null;
  
  const { ethereum } = window as any;
  
  if (!ethereum) return null;
  
  switch (walletId) {
    case 'coinbase':
      // Si hay múltiples proveedores, buscar Coinbase Wallet específicamente
      if (ethereum.providers) {
        return ethereum.providers.find((provider: any) => provider.isCoinbaseWallet);
      }
      // Si es el único proveedor y es Coinbase Wallet
      return ethereum.isCoinbaseWallet ? ethereum : null;
      
    case 'metamask':
      // Si hay múltiples proveedores, buscar MetaMask específicamente
      if (ethereum.providers) {
        return ethereum.providers.find((provider: any) => provider.isMetaMask && !provider.isCoinbaseWallet);
      }
      // Si es el único proveedor y es MetaMask
      return (ethereum.isMetaMask && !ethereum.isCoinbaseWallet) ? ethereum : null;
      
    case 'injected':
      return ethereum;
      
    default:
      return null;
  }
};

// Lista de wallets soportadas
export const getSupportedWallets = (): WalletInfo[] => {
  const hasEthereum = isInjectedWalletAvailable();
  const hasCoinbase = isCoinbaseWalletAvailable();
  const hasMetaMask = isMetaMaskAvailable();
  
  console.log('[getSupportedWallets] Detection results:', {
    hasEthereum,
    hasCoinbase,
    hasMetaMask,
    ethereum: typeof window !== 'undefined' ? (window as any).ethereum : null
  });
  
  const wallets: WalletInfo[] = [];
  
  // Coinbase Wallet
  wallets.push({
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🟦',
    description: 'Connect with Coinbase Wallet',
    isAvailable: hasCoinbase,
    isInstalled: hasCoinbase,
    downloadUrl: 'https://www.coinbase.com/wallet'
  });
  
  // MetaMask
  wallets.push({
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Connect with MetaMask',
    isAvailable: hasMetaMask,
    isInstalled: hasMetaMask,
    downloadUrl: 'https://metamask.io/download/'
  });
  
  // Generic browser wallet (si hay ethereum pero no es específicamente Coinbase o MetaMask)
  if (hasEthereum && !hasCoinbase && !hasMetaMask) {
    wallets.push({
      id: 'injected',
      name: 'Browser Wallet',
      icon: '🌐',
      description: 'Connect with browser wallet',
      isAvailable: true,
    });
  }
  
  // Si hay ethereum pero no se detectó ninguna wallet específica, mostrar opción genérica
  if (hasEthereum && wallets.filter(w => w.isAvailable).length === 0) {
    wallets.push({
      id: 'injected',
      name: 'Injected Wallet',
      icon: '💼',
      description: 'Connect with injected wallet',
      isAvailable: true,
    });
  }
  
  return wallets;
};

// Función para conectar con un proveedor específico
export const connectWallet = async (walletId: WalletProvider): Promise<{
  address: string;
  chainId: number;
  provider: any;
}> => {
  console.log(`[connectWallet] Attempting to connect to ${walletId}`);
  
  const provider = getWalletProvider(walletId);
  
  if (!provider) {
    console.error(`[connectWallet] No provider found for ${walletId}`);
    throw new Error(`${walletId} wallet is not available. Please install it first.`);
  }
  
  console.log(`[connectWallet] Provider found for ${walletId}:`, provider);
  
  try {
    console.log(`[connectWallet] Requesting accounts for ${walletId}...`);
    
    // Solicitar conexión
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });
    
    console.log(`[connectWallet] Accounts received:`, accounts);
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found or user rejected connection');
    }
    
    // Obtener chainId
    const chainIdHex = await provider.request({
      method: 'eth_chainId'
    });
    
    const chainId = parseInt(chainIdHex, 16);
    
    console.log(`[connectWallet] Connection successful for ${walletId}:`, {
      address: accounts[0],
      chainId
    });
    
    return {
      address: accounts[0],
      chainId,
      provider
    };
  } catch (error) {
    console.error(`[connectWallet] Error connecting to ${walletId}:`, error);
    
    // Proporcionar mensajes de error más específicos
    if (error instanceof Error) {
      if (error.message.includes('User rejected')) {
        throw new Error('Connection was rejected by user');
      }
      if (error.message.includes('Already processing')) {
        throw new Error('Wallet is already processing a request');
      }
    }
    
    throw error;
  }
};

// Función para cambiar de red
export const switchToNetwork = async (chainId: number, provider: any): Promise<void> => {
  const chainIdHex = `0x${chainId.toString(16)}`;
  
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
    // Si la red no está agregada, intentar agregarla (solo para redes conocidas)
    if (switchError.code === 4902) {
      await addNetwork(chainId, provider);
    } else {
      throw switchError;
    }
  }
};

// Función para agregar una red
export const addNetwork = async (chainId: number, provider: any): Promise<void> => {
  const networks: Record<number, any> = {
    8453: { // Base
      chainId: '0x2105',
      chainName: 'Base',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['https://mainnet.base.org'],
      blockExplorerUrls: ['https://basescan.org'],
    },
    84532: { // Base Sepolia
      chainId: '0x14a34',
      chainName: 'Base Sepolia',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['https://sepolia.base.org'],
      blockExplorerUrls: ['https://sepolia.basescan.org'],
    }
  };
  
  const networkConfig = networks[chainId];
  
  if (!networkConfig) {
    throw new Error(`Network ${chainId} is not supported`);
  }
  
  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [networkConfig],
  });
};

// Función para obtener el balance de ETH
export const getEthBalance = async (address: string, provider: any): Promise<string> => {
  const balance = await provider.request({
    method: 'eth_getBalance',
    params: [address, 'latest'],
  });
  
  // Convertir de wei a ETH
  const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
  return ethBalance.toFixed(4);
};

// Función para debuggear la detección de wallets
export const debugWalletDetection = () => {
  if (typeof window === 'undefined') {
    console.log('[debugWalletDetection] No window object (SSR)');
    return;
  }

  const { ethereum } = window as any;
  
  console.log('[debugWalletDetection] Starting wallet detection debug...');
  console.log('[debugWalletDetection] window.ethereum exists:', !!ethereum);
  
  if (ethereum) {
    console.log('[debugWalletDetection] ethereum object:', ethereum);
    console.log('[debugWalletDetection] ethereum.isMetaMask:', ethereum.isMetaMask);
    console.log('[debugWalletDetection] ethereum.isCoinbaseWallet:', ethereum.isCoinbaseWallet);
    console.log('[debugWalletDetection] ethereum.isCoinbaseBrowser:', ethereum.isCoinbaseBrowser);
    console.log('[debugWalletDetection] ethereum.providers:', ethereum.providers);
    
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
      console.log('[debugWalletDetection] Multiple providers detected:');
      ethereum.providers.forEach((provider: any, index: number) => {
        console.log(`[debugWalletDetection] Provider ${index}:`, {
          isMetaMask: provider.isMetaMask,
          isCoinbaseWallet: provider.isCoinbaseWallet,
          isCoinbaseBrowser: provider.isCoinbaseBrowser
        });
      });
    }
  } else {
    console.log('[debugWalletDetection] No ethereum object found');
  }
  
  // Probar las funciones de detección
  console.log('[debugWalletDetection] Detection results:');
  console.log('[debugWalletDetection] isCoinbaseWalletAvailable():', isCoinbaseWalletAvailable());
  console.log('[debugWalletDetection] isMetaMaskAvailable():', isMetaMaskAvailable());
  console.log('[debugWalletDetection] isInjectedWalletAvailable():', isInjectedWalletAvailable());
  
  console.log('[debugWalletDetection] getSupportedWallets():', getSupportedWallets());
}; 