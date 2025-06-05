import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, metaMask } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    coinbaseWallet({
      appName: 'LottoMoji',
      appLogoUrl: 'https://lottomoji.vercel.app/favicon.ico',
      preference: 'eoaOnly', // Cambiado de vuelta a eoaOnly para usar extensión tradicional
      version: '4',
    }),
    metaMask({
      dappMetadata: {
        name: 'LottoMoji',
        url: 'https://lottomoji.vercel.app',
        iconUrl: 'https://lottomoji.vercel.app/favicon.ico',
      },
    }),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org', {
      batch: true,
      fetchOptions: {
        timeout: 30000,
      },
    }),
    [base.id]: http('https://mainnet.base.org', {
      batch: true,
      fetchOptions: {
        timeout: 30000,
      },
    }),
  },
  ssr: false, // Importante para Vercel
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
} 