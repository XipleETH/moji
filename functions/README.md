# 🔥 Firebase Functions for LottoMoji

> **🚨 BRANCH STATUS NOTICE** 
> 
> **Main Branch**: Reserved for **Chainlink Chromion Hackathon** evaluation
> 
> **Ongoing Development**: All new features and improvements in `post-chromion` branch
> 
> ```bash
> # Switch to active development branch
> git checkout post-chromion
> ```

This directory contains Firebase Cloud Functions that serve as **both primary and fallback execution system** for LottoMoji game logic, providing flexible deployment options for different scenarios.

## 🏗️ Execution Modes

### 🔥 Primary Mode: Firebase-First Architecture
**When to use**: Networks without Chainlink support, testing environments, centralized control requirements

- ✅ **Complete game logic**: Full lottery system running on Firebase
- ✅ **Universal compatibility**: Works on any blockchain or even off-chain
- ✅ **Lower gas costs**: Draw execution happens off-chain
- ✅ **Instant deployment**: No blockchain service dependencies

### 🔄 Fallback Mode: Blockchain-First with Firebase Backup
**When to use**: Production environments with maximum reliability

- ✅ **Primary blockchain**: Chainlink VRF/Automation handles draws
- ✅ **Automatic failover**: Firebase takes over if blockchain services fail
- ✅ **Redundancy**: Dual verification of results
- ✅ **Seamless switching**: No downtime during mode changes

## 📋 Overview

Firebase Functions handle server-side logic that requires centralized execution and security, including:

- **Game Draw Processing**: Centralized random number generation (primary or backup)
- **Timer Synchronization**: Ensuring all clients see the same countdown
- **Result Validation**: Server-side verification of game results
- **Blockchain Integration**: Interface with smart contracts for hybrid mode
- **Webhook Handling**: Processing external API calls
- **Notification Services**: Push notifications for winners
- **Failover Management**: Automatic switching between execution modes

## 🎯 Main Functions

### `triggerGameDraw`
The primary function responsible for:

1. **Generate random winning numbers**: Using secure server-side randomization
2. **Calculate next draw time**: Determining the next scheduled draw
3. **Update game state**: Synchronizing state across all clients
4. **Fetch active tickets**: Retrieving all valid tickets for the current round
5. **Check winners**: Comparing tickets against winning numbers
6. **Save results**: Persisting results to Firestore database

This function executes on Firebase servers and ensures there's only one result per draw period, regardless of how many clients are connected.

### `scheduledGameDraw` (if implemented)
Automated function for scheduled draws:
- Executes automatically based on cron schedule
- Provides backup for automation when manual triggers fail
- Logs execution for monitoring and debugging

### Webhook Functions
- **`/api/webhook`**: Handles external integrations
- **`/api/notification`**: Manages push notifications
- Processes blockchain events and updates

## 🚀 Deployment

### Prerequisites

1. **Firebase CLI**: Install Firebase command line tools
   ```bash
   npm install -g firebase-tools
   ```

2. **Authentication**: Login to your Firebase account
   ```bash
   firebase login
   ```

3. **Project Setup**: Ensure you're in the correct Firebase project
   ```bash
   firebase use your-project-id
   ```

### Deploy Functions

#### 🔥 Firebase-Primary Mode

```bash
# Deploy as primary game engine
firebase functions:config:set game.mode="primary"
firebase functions:config:set game.execution="firebase"
firebase deploy --only functions

# Configure game parameters
firebase functions:config:set game.draw_interval="24" game.ticket_price="0.2"
```

#### 🔄 Hybrid/Fallback Mode

```bash
# Deploy as backup system
firebase functions:config:set game.mode="fallback"
firebase functions:config:set game.primary="chainlink"
firebase functions:config:set game.fallback="firebase"
firebase deploy --only functions

# Set up monitoring for blockchain failures
firebase functions:config:set monitoring.check_interval="60"
```

#### 📊 General Deployment

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:triggerGameDraw

# Deploy with debugging
firebase deploy --only functions --debug
```

### Environment Configuration

Set environment variables for your functions:

```bash
# Set configuration values
firebase functions:config:set someservice.key="THE API KEY" someservice.id="THE CLIENT ID"

# Get current configuration
firebase functions:config:get

# Deploy with new configuration
firebase deploy --only functions
```

## 🛠️ Local Development

### Start Emulator

For local testing and development:

```bash
# Start Firebase emulators
firebase emulators:start

# Start only functions emulator
firebase emulators:start --only functions

# Start with specific port
firebase emulators:start --only functions --port 5001
```

### Testing Functions

```bash
# Call function locally
curl http://localhost:5001/your-project-id/us-central1/triggerGameDraw

# Test with parameters
curl -X POST http://localhost:5001/your-project-id/us-central1/triggerGameDraw \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 📁 Project Structure

```
functions/
├── src/
│   ├── index.ts          # Main entry point
│   ├── gameLogic.ts      # Game-specific logic
│   ├── notifications.ts  # Push notification handling
│   └── webhooks.ts       # External API integrations
├── lib/                  # Compiled JavaScript (auto-generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This documentation
```

## 📦 Dependencies

### Production Dependencies
- **`firebase-admin`**: Firebase Admin SDK for server-side operations
- **`firebase-functions`**: Firebase Functions runtime
- **`cors`**: Cross-origin resource sharing middleware
- **`express`**: Web framework for HTTP functions

### Development Dependencies
- **`typescript`**: TypeScript compiler
- **`@types/node`**: Node.js type definitions
- **`eslint`**: Code linting
- **`prettier`**: Code formatting

## ⚙️ Configuration

### Function Settings

```javascript
// Example function configuration
exports.triggerGameDraw = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .https.onRequest(async (req, res) => {
    // Function implementation
  });
```

### Security Rules

Ensure proper security with:
- **Authentication checks**: Verify user tokens
- **Rate limiting**: Prevent abuse
- **Input validation**: Sanitize all inputs
- **CORS configuration**: Control cross-origin requests

## ⚖️ Mode Comparison

| Feature | 🔥 Firebase Primary | 🔗 Blockchain Primary | 🔄 Hybrid Mode |
|---------|-------------------|---------------------|----------------|
| **Decentralization** | ❌ Centralized | ✅ Fully Decentralized | ✅ Mostly Decentralized |
| **Gas Costs** | ✅ Very Low | ❌ Higher | ⚖️ Medium |
| **Network Support** | ✅ Universal | ❌ Limited to Chainlink | ✅ Universal |
| **Setup Complexity** | ✅ Simple | ❌ Complex | ⚖️ Medium |
| **Reliability** | ⚖️ Single Point | ✅ Distributed | ✅ Redundant |
| **Randomness** | ⚖️ Centralized | ✅ Cryptographic | ✅ Primary Crypto |
| **Transparency** | ❌ Server-side | ✅ Fully Public | ✅ Mostly Public |
| **Speed** | ✅ Instant | ⚖️ Block Time | ✅ Instant |

### 🎯 When to Use Each Mode

#### 🔥 Firebase Primary
- **Testing and development**
- **Unsupported blockchain networks**
- **Rapid prototyping**
- **Cost-sensitive applications**
- **Need for custom game logic**

#### 🔗 Blockchain Primary
- **Production environments**
- **Maximum transparency required**
- **Trustless operation needed**
- **Networks with Chainlink support**
- **Decentralization is priority**

#### 🔄 Hybrid Mode
- **Best of both worlds**
- **Maximum reliability required**
- **Production with fallback**
- **Gradual migration scenarios**
- **Enterprise deployments**

## 🔧 Environment Variables

### Universal Configuration

```bash
# Game Configuration
GAME_MODE=firebase|blockchain|hybrid  # Execution mode
GAME_DRAW_INTERVAL=86400              # Draw interval in seconds (24h)
WINNING_NUMBERS_COUNT=4               # Number of winning numbers to generate

# External Services
NOTIFICATION_API_KEY=your_key_here
WEBHOOK_SECRET=your_webhook_secret

# Firebase Project
FIREBASE_PROJECT_ID=your_project_id
```

### Firebase-Specific Configuration

```bash
# Firebase Primary Mode
GAME_EXECUTION_MODE=firebase
FIREBASE_GAME_ENGINE=true
CENTRALIZED_RANDOM=true

# Blockchain Integration (for hybrid)
SMART_CONTRACT_ADDRESS=your_contract_address
BLOCKCHAIN_NETWORK=fuji|base-sepolia|polygon
WEB3_PROVIDER_URL=your_rpc_url
```

### Hybrid Mode Configuration

```bash
# Hybrid Configuration
PRIMARY_EXECUTION=blockchain
FALLBACK_EXECUTION=firebase
AUTO_FAILOVER=true
FAILOVER_THRESHOLD=300  # seconds before fallback

# Monitoring
HEALTH_CHECK_INTERVAL=60
BLOCKCHAIN_MONITOR=true
```

## 📊 Monitoring

### Logs and Analytics

```bash
# View function logs
firebase functions:log

# View specific function logs
firebase functions:log --only triggerGameDraw

# Real-time log streaming
firebase functions:log --follow
```

### Performance Monitoring

- **Execution time**: Monitor function duration
- **Memory usage**: Track memory consumption
- **Error rates**: Monitor function failures
- **Invocation count**: Track usage patterns

## 🔍 Debugging

### Common Issues

1. **Permission Errors**
   ```bash
   # Fix: Update Firebase security rules
   firebase deploy --only firestore:rules
   ```

2. **Timeout Issues**
   ```javascript
   // Fix: Increase timeout in function configuration
   .runWith({ timeoutSeconds: 120 })
   ```

3. **Memory Errors**
   ```javascript
   // Fix: Increase memory allocation
   .runWith({ memory: '512MB' })
   ```

### Debug Mode

```bash
# Enable debug logging
firebase deploy --only functions --debug

# View detailed logs
firebase functions:log --only triggerGameDraw --lines 50
```

## 🚀 Performance Optimization

### Best Practices

- **Cold start optimization**: Keep functions warm
- **Database connections**: Reuse connections
- **Async operations**: Use Promise.all() for parallel execution
- **Memory management**: Clean up resources

### Example Optimizations

```javascript
// Optimize database queries
const batch = admin.firestore().batch();
// Batch multiple operations

// Use connection pooling
const db = admin.firestore();
// Reuse database instance
```

## 🔐 Security Considerations

- **Validate all inputs**: Sanitize user data
- **Use Firebase Auth**: Verify user tokens
- **Implement rate limiting**: Prevent abuse
- **Log security events**: Monitor for suspicious activity
- **Keep dependencies updated**: Regular security updates

## 📈 Scaling

Functions automatically scale, but consider:

- **Concurrent execution limits**: Firebase has limits
- **Database connection limits**: Firestore connection pools
- **External API rate limits**: Respect third-party limits
- **Cost optimization**: Monitor usage and optimize

## 🆘 Support

For issues and questions:

1. Check [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
2. Review function logs for error details
3. Test functions locally with emulators
4. Contact development team: functions@lottomoji.com

---

**⚠️ Important**: Always test functions locally before deploying to production. Monitor logs and performance after deployment. 