import { auth } from './config';
import { 
  signInAnonymously, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { User, FarcasterProfile } from '../types';
import { sdk } from '@farcaster/frame-sdk';

// Convertir usuario de Firebase a nuestro tipo de usuario
const mapFirebaseUser = (user: FirebaseUser | null): User | null => {
  if (!user) return null;
  
  return {
    id: user.uid,
    username: user.displayName || `User-${user.uid.substring(0, 5)}`,
    avatar: user.photoURL || undefined,
    isFarcasterUser: false
  };
};

// Función para obtener datos adicionales del perfil de Farcaster
const fetchFarcasterProfileInfo = async (fid: number): Promise<FarcasterProfile | null> => {
  try {
    // Esta función debería hacer una llamada real a la API de Farcaster
    console.log(`Obteniendo información adicional de perfil para FID: ${fid}`);
    
    // Aquí deberíamos usar la API de Neynar o Hubble para obtener datos reales
    // Por ahora, devolvemos null hasta implementar la integración real
    return null;
  } catch (error) {
    console.error('Error obteniendo información adicional de Farcaster:', error);
    return null;
  }
};

// Función para obtener datos del usuario de Farcaster
export const getFarcasterUserData = async (): Promise<User | null> => {
  try {
    // Verificar si el SDK de Farcaster está disponible y el usuario está autenticado
    if (!sdk) {
      console.error('ERROR: SDK de Farcaster no disponible');
      return null;
    }
    
    try {
      // Establecer un tiempo máximo para la operación
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.log("Tiempo de espera agotado al obtener usuario de Farcaster");
          resolve(null);
        }, 3000); // 3 segundos máximo
      });
      
      // Crear la promesa para obtener el usuario
      const getUserPromise = (async () => {
        // Obtener información básica del usuario
        const user = await sdk.getUser();
        if (!user) {
          console.log('No hay usuario autenticado en Farcaster');
          return null;
        }
        
        console.log('Usuario de Farcaster obtenido:', user);
        
        // Verificación de billetera
        let verifiedWallet = false;
        let walletAddress = user.custody_address;
        
        // Si tenemos una dirección de custodia, asumimos que está verificada
        if (walletAddress) {
          verifiedWallet = true;
        }
        
        // Si no hay dirección de wallet, no podemos continuar
        if (!walletAddress) {
          console.log('Usuario de Farcaster sin wallet verificada');
          return null;
        }
        
        // Mapear los datos del usuario de Farcaster a nuestro tipo User
        return {
          id: `farcaster-${user.fid}`,
          username: user.username || `farcaster-${user.fid}`,
          avatar: user.pfp || undefined,
          walletAddress: walletAddress,
          fid: user.fid,
          isFarcasterUser: true,
          verifiedWallet: verifiedWallet,
          chainId: 10 // Optimism es la cadena principal para Farcaster
        };
      })();
      
      // Usar la promesa que termine primero
      return await Promise.race([getUserPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error obteniendo usuario de Farcaster:', error);
      return null;
    }
  } catch (error) {
    console.error('Error obteniendo datos de Farcaster:', error);
    return null;
  }
};

// Iniciar sesión con Farcaster
export const signInWithFarcaster = async (): Promise<User | null> => {
  try {
    if (!sdk) {
      console.error('SDK de Farcaster no disponible');
      return null;
    }
    
    // Primero intentar iniciar sesión
    try {
      await sdk.actions.signIn();
    } catch (e) {
      console.error('Error en signIn de Farcaster:', e);
    }
    
    // Luego intentar obtener usuario
    const farcasterUser = await getFarcasterUserData();
    if (farcasterUser) {
      return farcasterUser;
    }
    
    // Si no hay usuario de Farcaster, devolver null
    console.log('No se pudo autenticar con Farcaster');
    return null;
  } catch (error) {
    console.error('Error en signInWithFarcaster:', error);
    return null;
  }
};

// Iniciar sesión anónima (como fallback si no hay Farcaster)
export const signInAnonymousUser = async (): Promise<User | null> => {
  try {
    const userCredential = await signInAnonymously(auth);
    return mapFirebaseUser(userCredential.user);
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    return null;
  }
};

// Observar cambios en el estado de autenticación
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  // Primero intentamos con Farcaster
  getFarcasterUserData().then(farcasterUser => {
    if (farcasterUser) {
      callback(farcasterUser);
    } else {
      // Si no hay usuario de Farcaster, devolvemos null
      callback(null);
    }
  }).catch(error => {
    console.error('Error en onAuthStateChanged:', error);
    callback(null);
  });
  
  // Devolver una función para limpiar
  return () => {};
};

// Función para obtener usuario de wallet directo
const getWalletUser = async (): Promise<User | null> => {
  try {
    console.log('[getWalletUser] Verificando wallet en localStorage...');
    
    const savedAuth = localStorage.getItem('walletAuth');
    if (!savedAuth) {
      console.log('[getWalletUser] No hay datos de wallet guardados');
      return null;
    }

    const { address, chainId, timestamp } = JSON.parse(savedAuth);
    
    // Verificar que no sea muy antigua (24 horas)
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      console.log('[getWalletUser] Datos de wallet expirados');
      localStorage.removeItem('walletAuth');
      return null;
    }

    // Verificar que tengamos ethereum
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Verificar que la cuenta aún esté conectada
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts || !accounts.includes(address)) {
          console.log('[getWalletUser] Cuenta ya no está conectada');
          localStorage.removeItem('walletAuth');
          return null;
        }

        // Crear usuario de wallet
        const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        
        const walletUser: User = {
          id: `wallet-${address.toLowerCase()}`,
          username: `User-${shortAddress}`,
          walletAddress: address,
          isFarcasterUser: false,
          verifiedWallet: true,
          chainId: chainId || 8453
        };
        
        console.log('[getWalletUser] Usuario de wallet obtenido:', walletUser);
        return walletUser;
        
      } catch (error) {
        console.error('[getWalletUser] Error verificando cuenta de wallet:', error);
        localStorage.removeItem('walletAuth');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[getWalletUser] Error obteniendo usuario de wallet:', error);
    return null;
  }
};

// Obtener usuario actual
export const getCurrentUser = async (): Promise<User | null> => {
  console.log('[getCurrentUser] Iniciando obtención de usuario...');
  
  try {
    // Primero intentar obtener usuario de wallet directo
    console.log('[getCurrentUser] Intentando obtener usuario de wallet directo...');
    const walletUser = await getWalletUser();
    
    if (walletUser) {
      console.log('[getCurrentUser] Usuario de wallet obtenido exitosamente:', {
        id: walletUser.id,
        username: walletUser.username,
        walletAddress: walletUser.walletAddress,
        isFarcasterUser: walletUser.isFarcasterUser
      });
      return walletUser;
    }
    
    // Si no hay usuario de wallet, intentar Farcaster como fallback
    console.log('[getCurrentUser] Intentando obtener usuario de Farcaster como fallback...');
    const farcasterUser = await getFarcasterUserData();
    
    if (farcasterUser) {
      console.log('[getCurrentUser] Usuario de Farcaster obtenido exitosamente:', {
        id: farcasterUser.id,
        username: farcasterUser.username,
        walletAddress: farcasterUser.walletAddress,
        isFarcasterUser: farcasterUser.isFarcasterUser
      });
      return farcasterUser;
    }
    
    // Si no hay usuario disponible
    console.log('[getCurrentUser] No hay usuario disponible');
    return null;
  } catch (error) {
    console.error('[getCurrentUser] Error obteniendo usuario:', error);
    return null;
  }
}; 