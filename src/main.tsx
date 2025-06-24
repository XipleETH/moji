import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebase/config';
import { WalletProvider } from './contexts/WalletContext';
import { MiniKitProvider } from './providers/MiniKitProvider';
import { setupGlobalDebug } from './utils/debugConsole';

// Configuración de redes blockchain
// Base Mainnet - ID: 8453
// Optimism - ID: 10

// Initialize Firebase
try {
  const app = initializeApp(firebaseConfig);
  console.log('Inicializando estado del juego en segundo plano...');
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
}

// Setup debug functions
setupGlobalDebug();

// Verificar si estamos en Warpcast
const isWarpcast = typeof window !== 'undefined' && 
  (window.location.href.includes('warpcast.com') || 
   window.parent !== window);

console.log(`Entorno detectado: ${isWarpcast ? 'Warpcast' : 'Navegador normal'}`);
console.log('Inicializando aplicación con soporte para Base y Optimism');

// Renderizar la aplicación
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MiniKitProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MiniKitProvider>
  </React.StrictMode>,
);
