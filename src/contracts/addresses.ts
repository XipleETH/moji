export const CONTRACT_ADDRESSES = {
  // Base Sepolia (Testnet)
  84532: {
    LottoMojiCore: "0x089Cc443794c25CEb744A07EB1372A5977d0D230",
    LottoMojiTickets: "0x61DD94F4446875953e113f1a889f7A6a95f49817",
    LottoMojiPrizePool: "0xE5c54ec904DF293300F13eC0D38ec9DD852b8369"
  },
  // Base Mainnet (para el futuro)
  8453: {
    LottoMojiCore: "",
    LottoMojiTickets: "",
    LottoMojiPrizePool: ""
  }
} as const;

export const SUPPORTED_CHAINS = [84532, 8453] as const;
export type SupportedChainId = typeof SUPPORTED_CHAINS[number];

export const getContractAddresses = (chainId: number) => {
  if (chainId in CONTRACT_ADDRESSES) {
    return CONTRACT_ADDRESSES[chainId as SupportedChainId];
  }
  console.warn(`Unsupported chain ID: ${chainId}`);
  return null;
}; 