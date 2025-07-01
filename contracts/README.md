# 🎰 LottoMoji Smart Contracts

> **🚨 DEVELOPMENT BRANCH NOTICE** 
> 
> **Main Branch**: Frozen for **Chainlink Chromion Hackathon** review
> 
> **Active Development**: Continues in `post-chromion` branch
> 
> ```bash
> # For latest contract updates and improvements
> git checkout post-chromion
> ```

Advanced lottery smart contracts with **dual execution modes**: primarily designed for blockchain automation with Chainlink VRF 2.5 and Automation 2.6, but also compatible with Firebase off-chain execution as a fallback.

## 🏗️ Execution Modes

### 🔗 Primary: Blockchain Mode (Fully Decentralized)
- **Chainlink VRF 2.5**: Verifiable and secure random numbers on-chain
- **Chainlink Automation 2.6**: Automated draws every 24 hours on-chain
- **Smart contract logic**: All game rules enforced by blockchain
- **Transparent execution**: All operations verifiable on-chain

### ☁️ Alternative: Firebase Off-chain Mode
- **Firebase Functions**: Server-side draw processing as fallback
- **Smart contract storage**: Tickets and prizes still stored on-chain
- **Hybrid approach**: Combines blockchain security with off-chain flexibility
- **Network agnostic**: Works on any blockchain, even without Chainlink support

## 🌟 Contract Features

- **ERC721 NFT Tickets**: Each lottery ticket is a unique NFT
- **Dual execution support**: Works with both blockchain automation and Firebase
- **Emoji System**: 25 different emojis indexed (0-24)
- **USDC Payments**: Direct payments in stablecoin
- **Advanced Reserve System**: Automatic pool management
- **Multi-network Support**: Avalanche Fuji, Base Sepolia, and any EVM network
- **Fallback compatibility**: Seamless switching between execution modes

## 🛠️ Technology Stack

- **Solidity ^0.8.20**: Latest Solidity version
- **OpenZeppelin Contracts 5.0.1**: Security and standards
- **Chainlink Contracts 1.3.0**: VRF and Automation
- **Hardhat Framework**: Development and testing
- **Ethers.js 6.x**: Blockchain interaction

## 🌐 Network Configuration

### Avalanche Fuji Testnet (Primary)
- **RPC URL**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Chain ID**: `43113`
- **VRF Coordinator**: `0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE`
- **USDC Address**: `0x5425890298aed601595a70AB815c96711a31Bc65`
- **Key Hash**: `0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887`

### Base Sepolia Testnet (Secondary)
- **RPC URL**: `https://sepolia.base.org`
- **Chain ID**: `84532`
- **VRF Coordinator**: `0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE`
- **USDC Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Key Hash**: `0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71`

## 📋 Prerequisites

- Node.js 18+ and npm
- Hardhat development environment
- Wallet with testnet tokens (AVAX, ETH, LINK, USDC)
- Chainlink VRF subscription
- Chainlink Automation registration

## 🚀 Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

## ⚙️ Configuration

Edit the `.env` file with your values:

```env
# Network RPC URLs
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Private Keys
PRIVATE_KEY=your_private_key_here
DEPLOYER_PRIVATE_KEY=your_deployer_private_key

# API Keys for Verification
SNOWTRACE_API_KEY=your_snowtrace_api_key
BASESCAN_API_KEY=your_basescan_api_key

# Chainlink Configuration
VRF_SUBSCRIPTION_ID_FUJI=your_fuji_subscription_id
VRF_SUBSCRIPTION_ID_BASE=your_base_subscription_id

# Contract Addresses (after deployment)
USDC_ADDRESS_FUJI=0x5425890298aed601595a70AB815c96711a31Bc65
USDC_ADDRESS_BASE=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## 🚀 Deployment

### Compile Contracts

```bash
npx hardhat compile
```

### 🔗 Blockchain Mode Deployment (Primary)

#### Deploy to Networks with Chainlink Support

```bash
# Deploy to Avalanche Fuji Testnet (Full Chainlink support)
npx hardhat run scripts/deploy-fuji-17utc.js --network fuji

# Deploy to Base Sepolia Testnet (Full Chainlink support)
npx hardhat run scripts/deploy-base-sepolia.js --network base-sepolia

# Deploy with specific configuration
npx hardhat run scripts/deploy-v6-correct-logic.js --network fuji
```

#### Verify Contracts

```bash
# Verify on Snowtrace (Avalanche)
npx hardhat verify --network fuji CONTRACT_ADDRESS "USDC_ADDRESS" "SUBSCRIPTION_ID"

# Verify on Basescan (Base)
npx hardhat verify --network base-sepolia CONTRACT_ADDRESS "USDC_ADDRESS" "SUBSCRIPTION_ID"
```

### ☁️ Firebase Mode Deployment (Alternative)

#### Deploy to Any EVM Network

```bash
# Deploy with Firebase compatibility (no Chainlink required)
npx hardhat run scripts/deploy-firebase-compatible.js --network your_network

# Example: Deploy to Polygon Mumbai without Chainlink
npx hardhat run scripts/deploy-firebase-compatible.js --network mumbai
```

#### Configure Firebase Integration

```bash
# Set contract address in Firebase config
firebase functions:config:set contract.address="YOUR_DEPLOYED_CONTRACT_ADDRESS"
firebase functions:config:set contract.network="your_network_name"

# Deploy Firebase functions for off-chain draws
cd ../functions && firebase deploy --only functions
```

### 🔄 Hybrid Mode Setup

```bash
# 1. Deploy contract with both Chainlink and Firebase support
npx hardhat run scripts/deploy-hybrid.js --network fuji

# 2. Configure both systems
# Set up Chainlink (primary)
npx hardhat run scripts/setup-chainlink.js --network fuji

# Set up Firebase (fallback)
firebase functions:config:set mode="hybrid" primary="chainlink"
firebase deploy --only functions
```

## 🔧 Post-Deployment Setup

### 1. Configure Chainlink VRF Subscription

1. Visit [Chainlink VRF Subscription Manager](https://vrf.chain.link/)
2. Create a new subscription for your network
3. Fund the subscription with LINK tokens
4. Add your deployed contract as a consumer

```bash
# Add VRF consumer
npx hardhat run scripts/add-vrf-consumer-v6.js --network fuji
```

### 2. Setup Chainlink Automation

1. Visit [Chainlink Automation](https://automation.chain.link/)
2. Register a new Custom Logic Upkeep
3. Use your contract address as the target
4. Fund with sufficient LINK tokens

```bash
# Verify automation setup
npx hardhat run scripts/check-contract-time.js --network fuji
```

### 3. Configure Game Parameters

```bash
# Set draw time (if needed)
npx hardhat run scripts/fix-daily-timing.js --network fuji

# Check system status
npx hardhat run scripts/check-basic-contract-info.js --network fuji
```

## 📊 Contract Architecture

### Core Contract: LottoMojiCore.sol

```solidity
contract LottoMojiCore is 
    VRFConsumerBaseV2Plus, 
    AutomationCompatibleInterface, 
    ReentrancyGuard, 
    ERC721,
    ERC721Enumerable
```

### Key Constants

```solidity
uint256 public constant TICKET_PRICE = 2 * 10**5;      // 0.2 USDC
uint8 public constant EMOJI_COUNT = 25;                // 0-24 emojis
uint256 public constant DRAW_INTERVAL = 24 hours;      // Daily draws
uint256 public constant DAILY_RESERVE_PERCENTAGE = 20; // 20% to reserves
uint256 public constant MAIN_POOL_PERCENTAGE = 80;     // 80% to main pools
```

### Prize Distribution

```solidity
uint256 public constant FIRST_PRIZE_PERCENTAGE = 80;   // 80% of main pool
uint256 public constant SECOND_PRIZE_PERCENTAGE = 10;  // 10% of main pool
uint256 public constant THIRD_PRIZE_PERCENTAGE = 5;    // 5% of main pool
uint256 public constant DEVELOPMENT_PERCENTAGE = 5;    // 5% of main pool
```

## 🎮 Core Functions

### For Players

```solidity
// Buy a lottery ticket
function buyTicket(uint8[4] memory _numbers) external nonReentrant

// Claim prize for winning ticket
function claimPrize(uint256 _ticketId) external nonReentrant

// Get ticket information
function getTicketInfo(uint256 ticketId) external view returns (...)

// Get detailed prize information
function getTicketPrizeDetails(uint256 ticketId) external view returns (...)
```

### For Automation (Chainlink)

```solidity
// Check if upkeep is needed
function checkUpkeep(bytes calldata) external view override returns (bool, bytes memory)

// Perform automated upkeep
function performUpkeep(bytes calldata performData) external override

// VRF callback for random numbers
function fulfillRandomWords(uint256, uint256[] calldata randomWords) internal override
```

### Administrative Functions

```solidity
// Toggle automation on/off
function toggleAutomation() external

// Emergency pause mechanism
function toggleEmergencyPause() external

// Set draw timing
function setDrawTimeUTC(uint256 _hours) external

// Update last draw time
function setLastDrawTime(uint256 _timestamp) external
```

## 🏆 Prize Logic (Version 3)

### Winning Conditions

| Prize Level | Condition | Description | Pool Share |
|-------------|-----------|-------------|------------|
| 🥇 Level 1 | 4 exact positions | All 4 emojis in exact order | 80% |
| 🥈 Level 2 | 4 any order | All 4 emojis in any order | 10% |
| 🥉 Level 3 | 3 exact positions | 3 emojis in exact positions | 5% |
| 🎫 Level 4 | 3 any order | 3 emojis in any order | Ticket refund |

### Prize Calculation Logic

```solidity
function _getPrizeLevel(uint256 ticketId, uint8[4] memory winningNumbers) internal view returns (uint8) {
    uint8 exactMatches = _countExactMatches(ticketId, winningNumbers);
    uint8 anyOrderMatches = _countAnyOrderMatches(ticketId, winningNumbers);
    
    if (exactMatches == 4) return 1;      // 🥇 First Prize
    if (anyOrderMatches == 4) return 2;   // 🥈 Second Prize  
    if (exactMatches == 3) return 3;      // 🥉 Third Prize
    if (anyOrderMatches == 3) return 4;   // 🎫 Free Tickets
    return 0;                              // No prize
}
```

## 🏦 Advanced Reserve System

### Daily Flow

```solidity
// DAILY (before each draw):
// 1. Collect all ticket sales
// 2. Split: 80% → Main pools, 20% → Reserve pools
// 3. Execute draw with VRF
// 4. Process winners and distribute/accumulate accordingly
// 5. Auto-refill main pools from reserves if needed
```

### Reserve Distribution

```solidity
// Reserve pools receive 20% of daily revenue:
firstPrizeReserve += (dailyReserves * 80) / 100;  // 16% of total revenue
secondPrizeReserve += (dailyReserves * 10) / 100; // 2% of total revenue  
thirdPrizeReserve += (dailyReserves * 10) / 100;  // 2% of total revenue
```

### Auto-Refill Logic

```solidity
// When there are winners but main pool is empty:
if (hasWinners && mainPool == 0 && reservePool > 0) {
    mainPool = reservePool;  // Transfer all reserves to main pool
    reservePool = 0;         // Reset reserve pool
    emit ReserveUsedForRefill(gameDay, prizeLevel, amount);
}
```

## 🧪 Testing

### Run Tests

```bash
# Compile contracts
npx hardhat compile

# Run comprehensive tests
npx hardhat test

# Run specific test files
npx hardhat test test/LottoMojiCore.test.js

# Generate coverage report
npx hardhat coverage
```

### Test Scripts

```bash
# Test ticket purchasing
npx hardhat run scripts/buy-100-tickets-avalanche-fuji.js --network fuji

# Test draw execution
npx hardhat run scripts/force-draw-and-verify-v5.js --network fuji

# Test prize claiming
npx hardhat run scripts/analizar-sorteo-completo.js --network fuji
```

## 📊 Monitoring & Diagnostics

### System Health Checks

```bash
# Check contract state
npx hardhat run scripts/check-basic-contract-info.js --network fuji

# Verify timing configuration
npx hardhat run scripts/check-contract-time.js --network fuji

# Check VRF subscription
npx hardhat run scripts/check-vrf-subscription.js --network fuji

# Analyze daily pools
npx hardhat run scripts/diagnostico-v2-completo.js --network fuji
```

### Reserve System Monitoring

```bash
# Check reserve balances
npx hardhat run scripts/check-reserves.js --network fuji

# Verify reserve transfers
npx hardhat run scripts/verify-reserve-system.js --network fuji

# Analyze pool distributions
npx hardhat run scripts/analyze-pool-distributions.js --network fuji
```

## 🔐 Security Features

### Access Control
- **Owner-only functions**: Critical administrative functions
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Emergency pause**: Circuit breaker for emergencies

### Randomness Security
- **Chainlink VRF**: Cryptographically secure random numbers
- **Request confirmations**: Configurable confirmation blocks
- **Callback gas limit**: Protection against gas manipulation

### Financial Security
- **USDC integration**: Stable coin payments
- **Automated distributions**: No manual intervention required
- **Reserve system**: Guaranteed prize availability

## 🚨 Emergency Procedures

### Pause System

```bash
# Emergency pause
npx hardhat run scripts/emergency-pause.js --network fuji

# Resume operations
npx hardhat run scripts/emergency-resume.js --network fuji
```

### Manual Draw (Emergency Only)

```bash
# Force draw execution
npx hardhat run scripts/emergency-draw-execution.js --network fuji

# Verify draw results
npx hardhat run scripts/verify-manual-draw.js --network fuji
```

## 📈 Gas Optimization

### Estimated Gas Costs

| Function | Estimated Gas | Description |
|----------|---------------|-------------|
| `buyTicket()` | ~180,000 | Purchase lottery ticket |
| `claimPrize()` | ~90,000 | Claim winning prize |
| `performUpkeep()` | ~500,000 | Automated draw execution |
| `fulfillRandomWords()` | ~300,000 | VRF callback processing |

### Optimization Features

- **Batch operations**: Multiple tickets in single transaction
- **Efficient storage**: Optimized struct packing
- **View functions**: Gas-free information retrieval
- **Event-based updates**: Minimal on-chain state changes

## 🛣️ Development Roadmap

### Current Version (V3)
- ✅ Advanced prize logic implementation
- ✅ Reserve system with auto-refill
- ✅ Multi-network deployment
- ✅ Comprehensive testing suite

### Next Version (V4) - CCIP Cross-Chain Era
- [ ] **CCIP Cross-Chain Integration**
  - [ ] Cross-chain prize pool aggregation
  - [ ] Multi-network ticket minting and transfers
  - [ ] Cross-chain prize distribution
  - [ ] Universal payment routing
- [ ] Token rewards system with cross-chain distribution
- [ ] DAO governance with multi-network voting
- [ ] Advanced cross-chain analytics and reporting

## 📄 Contract Events

### Core Game Events

```solidity
event TicketPurchased(uint256 indexed ticketId, address indexed buyer, uint8[4] numbers, uint256 gameDay);
event DrawExecuted(uint256 indexed gameDay, uint8[4] winningNumbers, uint256 totalMainPools);
event PrizeClaimed(uint256 indexed ticketId, address indexed winner, uint256 amount, uint8 prizeLevel, bool reserveUsedForRefill);
```

### Reserve System Events

```solidity
event DailyReservesSent(uint256 indexed gameDay, uint256 firstReserveAmount, uint256 secondReserveAmount, uint256 thirdReserveAmount, uint256 totalSent);
event ReserveUsedForRefill(uint256 indexed gameDay, uint8 prizeLevel, uint256 amountTransferred);
```

### Administrative Events

```solidity
event LastDrawTimeUpdated(uint256 oldTime, uint256 newTime, uint256 newGameDay);
event DrawTimeUTCUpdated(uint256 oldTime, uint256 newTime, uint256 newGameDay);
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/contract-improvement`
3. Implement changes with tests
4. Run full test suite: `npm run test`
5. Submit pull request with detailed description

## 📞 Support

For technical support:

1. Check [Hardhat Documentation](https://hardhat.org/docs)
2. Review [Chainlink Documentation](https://docs.chain.link/)
3. Open GitHub issue with detailed description
4. Contact development team: contracts@lottomoji.com

---

**⚠️ Security Notice**: These contracts are for testnet use only. Conduct thorough security audits before mainnet deployment. 