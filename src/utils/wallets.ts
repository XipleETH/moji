import { WalletProvider, WalletInfo } from '../types';

// Detectar si Coinbase Wallet está disponible
export const isCoinbaseWalletAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Coinbase Wallet se puede detectar de varias formas
  const { ethereum } = window as any;
  
  if (!ethereum) return false;
  
  // Verificar si es Coinbase Wallet específicamente
  return !!(
    ethereum.isCoinbaseWallet ||
    ethereum.isCoinbaseBrowser ||
    (ethereum.providers && ethereum.providers.find((provider: any) => provider.isCoinbaseWallet))
  );
};

// Detectar si MetaMask está disponible
export const isMetaMaskAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const { ethereum } = window as any;
  
  if (!ethereum) return false;
  
  // Verificar si es MetaMask específicamente
  return !!(
    ethereum.isMetaMask &&
    !ethereum.isCoinbaseWallet // Asegurarse de que no sea Coinbase Wallet
  );
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
  return [
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🟦', // Usaremos emoji por ahora, luego se puede cambiar por iconos SVG
      description: 'Connect with Coinbase Wallet',
      isAvailable: isCoinbaseWalletAvailable(),
      isInstalled: isCoinbaseWalletAvailable(),
      downloadUrl: 'https://www.coinbase.com/wallet'
    },
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect with MetaMask',
      isAvailable: isMetaMaskAvailable(),
      isInstalled: isMetaMaskAvailable(),
      downloadUrl: 'https://metamask.io/download/'
    },
    {
      id: 'injected',
      name: 'Browser Wallet',
      icon: '🌐',
      description: 'Connect with browser wallet',
      isAvailable: isInjectedWalletAvailable() && !isCoinbaseWalletAvailable() && !isMetaMaskAvailable(),
    }
  ].filter(wallet => wallet.isAvailable || !wallet.isInstalled);
};

// Función para conectar con un proveedor específico
export const connectWallet = async (walletId: WalletProvider): Promise<{
  address: string;
  chainId: number;
  provider: any;
}> => {
  const provider = getWalletProvider(walletId);
  
  if (!provider) {
    throw new Error(`${walletId} wallet is not available`);
  }
  
  try {
    // Solicitar conexión
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    // Obtener chainId
    const chainIdHex = await provider.request({
      method: 'eth_chainId'
    });
    
    const chainId = parseInt(chainIdHex, 16);
    
    return {
      address: accounts[0],
      chainId,
      provider
    };
  } catch (error) {
    console.error(`Error connecting to ${walletId}:`, error);
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