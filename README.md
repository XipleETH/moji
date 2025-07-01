# 🎰 LottoMoji - Crypto Emoji Lottery on Blockchain

> **🚨 IMPORTANT DEVELOPMENT NOTICE** 
> 
> **Main Branch Status**: This `main` branch is **frozen for Chainlink Chromion Hackathon review**.
> 
> **Continued Development**: All new development and improvements will continue in the `post-chromion` branch.
> 
> - **For hackathon review**: Stay on `main` branch
> - **For latest features**: Switch to `post-chromion` branch
> - **For contributors**: Please create PRs against `post-chromion` branch
>
> ```bash
> # Switch to continued development branch
> git checkout post-chromion
> ```

A complete blockchain-based emoji lottery application with automatic reserve system running on Avalanche Fuji and Base Sepolia testnets.

## 🌟 Key Features

### 🎮 Game System
- **25 crypto/gambling themed emojis**: 💰💎🚀🎰🎲🃏💸🏆🎯🔥⚡🌙⭐💫🎪🎨🦄🌈🍀🎭🎢🎮🏅🎊🎈
- **4 emojis per ticket**: Select 4 emojis from the 25 available options
- **Fixed price**: 0.2 USDC per ticket
- **Automatic draws**: Every 24 hours at 1:00 UTC

### 🏆 Prize System (New Logic V3)
- **🥇 First Prize (80%)**: 4 emojis in exact positions
- **🥈 Second Prize (10%)**: 4 emojis in any order  
- **🥉 Third Prize (5%)**: 3 emojis in exact positions
- **🎫 Free Tickets**: 3 emojis in any order (refund ticket price)
- **Development (5%)**: For system maintenance

### 🏦 Advanced Reserve System
- **Daily reserves**: 20% of each pool ALWAYS goes to reserves before draw
- **Main pools**: 80% accumulates when there are no winners
- **Reserve Pool 1**: Accumulates 16% of total revenue daily (80% of 20% reserves)
- **Reserve Pool 2**: Accumulates 2% of total revenue daily (10% of 20% reserves)
- **Reserve Pool 3**: Accumulates 2% of total revenue daily (10% of 20% reserves)
- **Automatic refill**: Reserves refill main pools when needed
- **Dual growth**: Main pools and reserves grow simultaneously

### ⚡ Hybrid Automation (Blockchain + Off-chain)
- **Primary: Blockchain Automation**
  - **Chainlink VRF v2.5**: Verifiable random numbers on-chain
  - **Chainlink Automation**: Automatic draws every 24 hours on-chain
  - **Smart contract execution**: Fully decentralized operation
- **Alternative: Firebase Off-chain**
  - **Firebase Functions**: Server-side draw processing as fallback
  - **Centralized randomness**: For networks without Chainlink support
  - **Hybrid deployment**: Can run both systems simultaneously
- **Automatic reserve management**: No manual intervention required
- **Real-time events**: Automatic frontend updates

### 🎨 Advanced Frontend
- **React 18 + TypeScript + Vite**: Modern framework with TypeScript support
- **Tailwind CSS**: Crypto-themed styles with animations
- **Wallet Integration**: Support for multiple wallets including Coinbase Wallet
- **Real-time updates**: Automatic pool and reserve updates
- **NFT Tickets**: Tickets as NFTs with crypto metadata
- **Firebase Integration**: Real-time chat and data synchronization

## 🚀 Technology Stack

### 🔗 Blockchain (Primary Architecture)
- **Solidity ^0.8.20**: Smart contract development
- **Hardhat**: Development framework
- **OpenZeppelin Contracts 5.0.1**: Security and standards
- **Chainlink Contracts 1.3.0**: VRF and Automation
- **Fully decentralized**: On-chain randomness and automation
- **Future: CCIP Integration**: Cross-chain interoperability (Post-Hackathon)

### ☁️ Off-chain (Alternative/Fallback Architecture)
- **Firebase Functions**: Server-side game logic processing
- **Firebase Firestore**: Centralized game state management
- **Node.js Runtime**: Scalable cloud functions
- **Scheduled Functions**: Time-based draw automation
- **Webhook Integration**: External service connectivity

### 🎨 Frontend (Universal)
- **React 18 + TypeScript**: Modern UI development
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Firebase**: Real-time database and authentication
- **Ethers.js 6.x**: Blockchain interaction
- **Adaptive Architecture**: Works with both blockchain and off-chain backends

### 🌐 Networks Supported
- **Avalanche Fuji Testnet** (Primary - Full blockchain features)
- **Base Sepolia Testnet** (Secondary - Full blockchain features)
- **Any Network** (Via Firebase off-chain fallback)

## 🌿 Branch Structure & Development Status

### 📋 Branch Organization

| Branch | Purpose | Status | Use Case |
|--------|---------|--------|----------|
| `main` | **🏆 Hackathon Submission** | 🔒 **FROZEN** | Chainlink Chromion Hackathon review |
| `post-chromion` | **🚀 Active Development** | ✅ **ACTIVE** | New features, improvements, bug fixes |
| `feature/*` | **🔧 Feature Development** | 🔄 **TEMPORARY** | Specific feature development |

### 🎯 Hackathon Context

**LottoMoji** was developed for the **Chainlink Chromion Hackathon**, showcasing:

- ✅ **Chainlink VRF 2.5** implementation for verifiable randomness
- ✅ **Chainlink Automation 2.6** for autonomous draw execution  
- ✅ **Multi-network deployment** (Avalanche Fuji, Base Sepolia)
- ✅ **Advanced reserve system** with automatic pool management
- ✅ **Hybrid architecture** (blockchain + Firebase fallback)

### 🔄 Post-Hackathon Development

After hackathon evaluation, development continues with:

- 🎯 **Enhanced features** and optimizations
- 🔧 **Bug fixes** and improvements
- 🌐 **Additional network support**
- 🌉 **CCIP Cross-Chain Integration**
  - Cross-chain pools and prize sharing
  - Multi-network ticket purchasing
  - Cross-chain prize claims and payments
- 📱 **Mobile app development**
- 🏛️ **DAO governance implementation**

```bash
# For hackathon reviewers
git checkout main

# For developers and contributors  
git checkout post-chromion

# Create new features
git checkout -b feature/your-feature-name post-chromion
```

## 🏗️ Architecture Options

LottoMoji supports **dual architecture** for maximum flexibility and reliability:

### 🔗 Blockchain-First Architecture (Recommended)
**Best for**: Production environments, full decentralization, maximum security

- ✅ **Fully decentralized**: All game logic runs on smart contracts
- ✅ **Chainlink VRF**: Cryptographically secure randomness
- ✅ **Chainlink Automation**: Reliable, decentralized draw execution
- ✅ **Transparent**: All operations verifiable on-chain
- ✅ **Trustless**: No central authority required

**Requirements**: Chainlink VRF subscription, Chainlink Automation setup, supported blockchain network

### ☁️ Firebase Off-chain Architecture (Fallback)
**Best for**: Testing, unsupported networks, centralized control, rapid prototyping

- ✅ **Universal compatibility**: Works on any blockchain or off-chain
- ✅ **Lower costs**: No gas fees for draw execution
- ✅ **Instant deployment**: No blockchain setup required
- ✅ **Flexible scheduling**: Custom draw intervals and logic
- ✅ **Fallback option**: Automatic failover if blockchain services fail

**Requirements**: Firebase project, Cloud Functions enabled

### 🔄 Hybrid Deployment (Best of Both Worlds)
**Best for**: Maximum reliability and flexibility

- ✅ **Primary blockchain**: Main game runs on smart contracts
- ✅ **Firebase backup**: Automatic fallback if blockchain fails
- ✅ **Dual verification**: Cross-validate results between systems
- ✅ **Flexible switching**: Can switch between modes without downtime

## 📋 Prerequisites

### For Blockchain Architecture
- Node.js 18+ and npm
- Git
- MetaMask or Coinbase Wallet
- Chainlink subscription (VRF and Automation)

### For Firebase Architecture
- Node.js 18+ and npm
- Git
- Firebase account with Blaze plan
- Optional: Wallet for on-chain ticket storage

### Universal Requirements
- Firebase account (for real-time features)

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd lottomoji
npm install
```

### 2. Environment Configuration

Copy and configure environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Blockchain Configuration
VITE_RPC_URL_FUJI=https://api.avax-test.network/ext/bc/C/rpc
VITE_RPC_URL_BASE=https://sepolia.base.org
VITE_CHAIN_ID_FUJI=43113
VITE_CHAIN_ID_BASE=84532

# USDC Contracts
VITE_USDC_ADDRESS_FUJI=0x5425890298aed601595a70AB815c96711a31Bc65
VITE_USDC_ADDRESS_BASE=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Smart Contracts (after deployment)
VITE_CONTRACT_ADDRESS_FUJI=your_deployed_contract_address
VITE_CONTRACT_ADDRESS_BASE=your_deployed_contract_address

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Deployment Keys (contracts only)
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key
SNOWTRACE_API_KEY=your_snowtrace_api_key
```

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database and Authentication (anonymous)
3. Configure Firebase rules (use provided `firestore.rules`)
4. Add your Firebase credentials to `.env.local`

## 🚀 Deployment

Choose your deployment architecture based on your needs:

### 🔗 Blockchain-First Deployment

#### 1. Smart Contracts

```bash
# Navigate to contracts directory
cd contracts

# Install contract dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Avalanche Fuji
npx hardhat run scripts/deploy-fuji.js --network fuji

# Deploy to Base Sepolia
npx hardhat run scripts/deploy-base.js --network base-sepolia

# Verify contracts
npx hardhat verify --network fuji CONTRACT_ADDRESS
```

#### 2. Configure Chainlink Services
- Set up VRF subscription
- Configure Automation upkeep
- Fund with LINK tokens

### ☁️ Firebase-First Deployment

#### 1. Firebase Functions

```bash
# Deploy Firebase Functions for off-chain game logic
cd functions
npm install
firebase deploy --only functions

# Configure scheduled functions
firebase functions:config:set game.draw_interval="24" game.mode="firebase"
```

#### 2. Configure Game Mode

```javascript
// In your environment variables
VITE_GAME_MODE=firebase
VITE_FIREBASE_FUNCTIONS_URL=your_functions_url
```

### 🔄 Hybrid Deployment (Recommended)

#### 1. Deploy Both Systems

```bash
# Deploy smart contracts (primary)
cd contracts && npm install && npx hardhat run scripts/deploy-fuji.js --network fuji

# Deploy Firebase functions (backup)
cd ../functions && npm install && firebase deploy --only functions
```

#### 2. Configure Hybrid Mode

```javascript
// Environment configuration
VITE_GAME_MODE=hybrid
VITE_PRIMARY_MODE=blockchain
VITE_FALLBACK_MODE=firebase
VITE_AUTO_FALLBACK=true
```

### 🎨 Frontend Application (Universal)

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
npm run deploy
```

### Configuration Examples

```bash
# Blockchain-only mode
VITE_GAME_MODE=blockchain

# Firebase-only mode  
VITE_GAME_MODE=firebase

# Hybrid mode with blockchain primary
VITE_GAME_MODE=hybrid
VITE_PRIMARY_MODE=blockchain
VITE_FALLBACK_MODE=firebase
```

## 🔧 Chainlink Configuration

### 1. VRF Subscription
1. Visit [vrf.chain.link](https://vrf.chain.link)
2. Create new subscription for your network
3. Fund with LINK tokens
4. Add your contract as consumer

### 2. Automation Setup
1. Visit [automation.chain.link](https://automation.chain.link)
2. Create new Upkeep
3. Configure your contract address
4. Fund with LINK tokens

## 🎮 How to Use

### For Players

1. **Connect Wallet**: Use MetaMask or Coinbase Wallet
2. **Get Test USDC**: Use faucets for testnet USDC
3. **Select Network**: Switch to Avalanche Fuji or Base Sepolia
4. **Buy Tickets**: Select 4 emojis and pay 0.2 USDC
5. **Wait for Draw**: Automatic draws every 24 hours at 1:00 UTC
6. **Claim Prizes**: If you win, claim your prize automatically

### For Administrators

```bash
# Check system status
npx hardhat run scripts/check-system-status.js --network fuji

# Emergency pause
npx hardhat run scripts/emergency-pause.js --network fuji

# Check reserves
npx hardhat run scripts/check-reserves.js --network fuji

# Manual draw (emergency only)
npx hardhat run scripts/force-draw.js --network fuji
```

## 📊 Game Mechanics

### Reserve System Logic

```solidity
// DAILY (before draw):
80% → Main pools (accumulate if no winners)
20% → Reserve pools (ALWAYS, guaranteed growth)

// Prize Distribution:
- First Prize: 80% of main pool portion
- Second Prize: 10% of main pool portion  
- Third Prize: 5% of main pool portion
- Development: 5% of main pool portion

// Auto-refill Logic:
- When winners exist but main pool is empty
- Reserves automatically refill main pools
- Ensures prizes are always available
```

### Winning Conditions

| Prize Level | Condition | Pool Share | NFT Benefit |
|-------------|-----------|------------|-------------|
| 🥇 First | 4 exact positions | 80% | Premium NFT |
| 🥈 Second | 4 any order | 10% | Special NFT |
| 🥉 Third | 3 exact positions | 5% | Standard NFT |
| 🎫 Free | 3 any order | Ticket refund | Basic NFT |

## 📁 Project Structure

```
lottomoji/
├── contracts/                 # Smart contracts
│   ├── contracts/
│   │   └── LottoMojiCore.sol # Main contract
│   ├── scripts/              # Deployment scripts
│   └── hardhat.config.js     # Hardhat configuration
├── src/                      # Frontend application
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   ├── firebase/             # Firebase configuration
│   ├── utils/                # Utility functions
│   └── types/                # TypeScript definitions
├── functions/                # Firebase Cloud Functions
├── public/                   # Static assets
└── docs/                     # Additional documentation
```

## 🔐 Security Features

- ✅ **ReentrancyGuard**: Protection against reentrancy attacks
- ✅ **VRF Verifiable**: Chainlink VRF for true randomness
- ✅ **Automated Execution**: Chainlink Automation for reliability
- ✅ **ERC721 Standard**: NFT tickets with standard compliance
- ✅ **Access Control**: Owner-only administrative functions
- ✅ **Emergency Pause**: Circuit breaker for emergencies

## 🧪 Testing

```bash
# Run smart contract tests
cd contracts
npx hardhat test

# Run frontend tests
npm run test

# Check contract coverage
npx hardhat coverage
```

## 📈 Monitoring & Analytics

### System Metrics
- Total tickets sold across all networks
- Daily pool collections and distributions
- Reserve pool balances and activations
- Winner statistics and prize claims
- Gas optimization metrics

### Real-time Dashboard
- Live pool balances
- Countdown to next draw
- Recent winners and prizes
- Reserve system status
- Network health monitoring

## 🌉 Future Vision: CCIP Cross-Chain Evolution

### 🎯 Cross-Chain Lottery Ecosystem

**LottoMoji's future with CCIP** will revolutionize lottery gaming by creating a **unified cross-chain experience**:

#### 🔗 Unified Prize Pools
- **Global pools**: Combine prize pools across all supported networks
- **Bigger jackpots**: More networks = more participants = larger prizes
- **Fair distribution**: Proportional pool contributions from each network

#### 🎫 Universal Tickets
- **Buy anywhere, play everywhere**: Purchase tickets on any supported chain
- **Cross-chain transfers**: Move tickets between networks seamlessly
- **Unified ownership**: Single wallet, multiple networks

#### 💰 Flexible Prize Claims
- **Claim on any network**: Win on Ethereum, claim on Polygon
- **Automatic routing**: Smart contract chooses optimal network for payouts
- **Gas optimization**: Claim where gas fees are lowest

#### 🔄 Technical Implementation
```solidity
// Example CCIP integration
function buyTicketCrossChain(
    uint64 destinationChain,
    uint8[4] memory numbers,
    address receiver
) external payable {
    // Buy ticket on source chain
    // Route to destination chain via CCIP
    // Mint NFT on destination network
}

function claimPrizeCrossChain(
    uint256 ticketId,
    uint64 destinationChain
) external {
    // Verify win on source chain
    // Route prize to destination chain
    // Transfer funds via CCIP
}
```

## 🛣️ Roadmap

### Phase 1 ✅ (Completed)
- [x] Core smart contract development
- [x] Frontend application with wallet integration
- [x] Chainlink VRF and Automation integration
- [x] Reserve system implementation
- [x] NFT ticket system

### Phase 2 🚧 (In Progress)
- [ ] Multi-network deployment optimization
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Security audit completion

### Phase 3 📋 (Planned)
- [ ] Mainnet deployment
- [ ] **CCIP Cross-Chain Integration**
  - [ ] Cross-chain prize pools (unified pools across networks)
  - [ ] Cross-chain ticket purchasing (buy on any chain, play globally)
  - [ ] Cross-chain prize claims (claim prizes on any supported network)
  - [ ] Multi-network payment routing via CCIP
- [ ] Token rewards system
- [ ] DAO governance implementation
- [ ] Advanced cross-chain analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions or issues:

1. Check existing [GitHub Issues](https://github.com/your-repo/issues)
2. Review [Chainlink Documentation](https://docs.chain.link/)
3. Join our [Discord Community](https://discord.gg/your-server)
4. Contact support: support@lottomoji.com

## 🙏 Acknowledgments

- [Chainlink](https://chain.link/) for VRF, Automation, and future CCIP services
- [OpenZeppelin](https://openzeppelin.com/) for secure smart contract templates
- [Avalanche](https://www.avax.network/) and [Base](https://base.org/) for blockchain infrastructure
- [Firebase](https://firebase.google.com/) for real-time backend services
- **Chainlink Chromion Hackathon** for the opportunity to showcase this innovation

---

**⚠️ Disclaimer**: This is a testnet application for educational and testing purposes. Do not use with real funds on mainnet without proper security audits.