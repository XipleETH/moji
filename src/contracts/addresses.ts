export const CONTRACT_ADDRESSES = {
  // Base Sepolia (Testnet)
  84532: {
    LottoMojiCore: "0x089Cc443794c25CEb744A07EB1372A5977d0D230",
    LottoMojiTickets: "0x61DD94F4446875953e113f1a889f7A6a95f49817",
    LottoMojiPrizePool: "0xE5c54ec904DF293300F13eC0D38ec9DD852b8369",
    // External tokens
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC Testnet
    ETH_USD_FEED: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1" // Chainlink ETH/USD Price Feed
  },
  // Base Mainnet (para el futuro)
  8453: {
    LottoMojiCore: "",
    LottoMojiTickets: "",
    LottoMojiPrizePool: "",
    // External tokens (mainnet addresses)
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
    ETH_USD_FEED: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" // Chainlink ETH/USD Price Feed
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