import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, walletConnect, injected } from 'wagmi/connectors';

// WalletConnect project ID (replace with your own)
const projectId = 'your-walletconnect-project-id';

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'LottoMoji',
      appLogoUrl: 'https://your-app-logo.com/logo.png',
    }),
    walletConnect({ 
      projectId,
      metadata: {
        name: 'LottoMoji',
        description: 'Emoji-based lottery game on Base',
        url: 'https://your-app.com',
        icons: ['https://your-app-logo.com/logo.png']
      }
    }),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
} 