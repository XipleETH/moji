import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './components/AuthProvider';
import { MiniKitProvider } from './providers/MiniKitProvider';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config/wagmi';

// Configuración de redes blockchain
// Base Mainnet - ID: 8453
// Optimism - ID: 10

// Create a client for React Query
const queryClient = new QueryClient();

// Verificar si estamos en Warpcast
const isWarpcast = typeof window !== 'undefined' && 
  (window.location.href.includes('warpcast.com') || 
   window.parent !== window);

console.log(`Entorno detectado: ${isWarpcast ? 'Warpcast' : 'Navegador normal'}`);
console.log('Inicializando aplicación con soporte para Base y Optimism');

// Renderizar la aplicación con proveedores de blockchain
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
