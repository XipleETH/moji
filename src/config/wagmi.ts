import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    coinbaseWallet({
      appName: 'LottoMoji',
      appLogoUrl: 'https://your-app-logo.com/logo.png',
      preference: 'eoaOnly', // Only use EOA accounts
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