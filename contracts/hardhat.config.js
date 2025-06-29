require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || '';
const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY || '';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    "base": {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
      gasPrice: "auto",
      verify: {
        etherscan: {
          apiKey: BASESCAN_API_KEY
        }
      }
    },
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
      gasPrice: "auto",
      verify: {
        etherscan: {
          apiKey: BASESCAN_API_KEY
        }
      }
    },
    "avalanche-fuji": {
      url: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 43113,
      gasPrice: "auto",
      verify: {
        etherscan: {
          apiKey: SNOWTRACE_API_KEY
        }
      }
    }
  },
  etherscan: {
    apiKey: {
      "base": BASESCAN_API_KEY,
      "base-sepolia": BASESCAN_API_KEY,
      "avalanche-fuji": SNOWTRACE_API_KEY
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      },
      {
        network: "avalanche-fuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io"
        }
      }
    ]
  }
}; 