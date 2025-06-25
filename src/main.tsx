import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WalletProvider } from './contexts/WalletContext';
import { MiniKitProvider } from './providers/MiniKitProvider';

// Configuración de redes blockchain
// Base Mainnet - ID: 8453
// Optimism - ID: 10

// Verificar si estamos en Warpcast
const isWarpcast = window.location.hostname.includes('warpcast');
console.log(`Entorno detectado: ${isWarpcast ? 'Warpcast' : 'Navegador normal'}`);
console.log('Inicializando aplicación con soporte para Base y Optimism');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MiniKitProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </MiniKitProvider>
  </React.StrictMode>
);
