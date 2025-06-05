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
// Base Sepolia Testnet - ID: 84532 (para pruebas)
// Base Mainnet - ID: 8453 (para producción)

// Create a client for React Query with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 10000, // 10 seconds
    },
    mutations: {
      retry: 1,
    },
  },
});

// Simple error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <h2>🚨 Error en la aplicación</h2>
          <p>Algo salió mal. Recarga la página para intentar de nuevo.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'white',
              color: '#667eea',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            🔄 Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Verificar si estamos en Warpcast
const isWarpcast = typeof window !== 'undefined' && 
  (window.location.href.includes('warpcast.com') || 
   window.parent !== window);

console.log(`Entorno detectado: ${isWarpcast ? 'Warpcast' : 'Navegador normal'}`);
console.log('Inicializando aplicación con soporte para Base Sepolia');

// Renderizar la aplicación con proveedores de blockchain y error boundary
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
    <MiniKitProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MiniKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
