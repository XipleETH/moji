# Chainlink Automation Upkeep Setup - Contract V2

## 🎯 Objetivo
Configurar Chainlink Automation Upkeep para el contrato LottoMoji V2 para automatizar los sorteos diarios.

## 📋 Información del Contrato V2

- **Contract Address**: `0x8F6A8D8E1408d53D1C06Ed0664CC334Fa533480c`
- **Network**: Base Sepolia (84532)
- **Functions**: `checkUpkeep()` y `performUpkeep()` implementadas
- **Draw Schedule**: Cada 24 horas a las 00:00 São Paulo (03:00 UTC)

## 🚀 Pasos de Configuración

### 1. Acceder a Chainlink Automation
```
URL: https://automation.chain.link/
Network: Base Sepolia
```

### 2. Crear Nuevo Upkeep
1. Click "Register New Upkeep"
2. Select "Custom Logic" (no seleccionar Time-based)
3. Fill out the form:

#### 2.1 Upkeep Details
```
Upkeep name: LottoMoji V2 Daily Draws
Target contract address: 0x8F6A8D8E1408d53D1C06Ed0664CC334Fa533480c
Upkeep description: Automated daily lottery draws for LottoMoji V2
```

#### 2.2 Trigger Configuration
```
Trigger: Custom Logic
Starting balance: 5 LINK (mínimo recomendado)
Gas limit: 1,000,000 (suficiente para draws)
Check data: 0x (empty bytes)
```

#### 2.3 Upkeep Details
```
Project name: LottoMoji
Email: [tu email]
```

### 3. Funding the Upkeep
- **Initial funding**: 5-10 LINK tokens
- **Monitoring**: Check balance regularly
- **Auto-funding**: Configurar alertas cuando balance sea bajo

### 4. Verification Steps

#### 4.1 Contract Functions Check
```javascript
// Test in browser console after deployment
await window.checkContractDrawTime()
// Should show: Upkeep Needed: true (when it's time for draw)
```

#### 4.2 Manual Testing
```solidity
// Functions to verify:
checkUpkeep(0x)  // Should return (true, 0x01) when draw needed
automationActive()  // Should return true
emergencyPause()   // Should return false
```

## 📊 Expected Behavior

### When Draw is Needed (checkUpkeep returns true)
```
Conditions:
- Current time >= nextDrawTime
- automationActive = true
- emergencyPause = false
- Game is active

Action:
- performUpkeep() calls VRF for random numbers
- Draw gets executed after VRF response
- Timer resets for next 24-hour cycle
```

### When Maintenance is Needed
```
Conditions:
- Reserves need to be sent to main pools
- Game day transitions need processing

Action:
- performUpkeep() processes maintenance
- Updates internal state
```

## 🔧 Configuration Parameters

### Gas Settings
```
Gas Limit: 1,000,000
Max Gas Price: 50 gwei (adjust for Base Sepolia)
```

### Monitoring
```
Check Frequency: Every block (default)
Performance Window: 24 hours
```

### Funding Strategy
```
Initial: 5 LINK
Top-up threshold: 1 LINK remaining
Auto-top-up: 5 LINK when threshold reached
```

## 🚨 Important Notes

### 1. Contract V2 Changes
- ✅ New contract address (different from V1)
- ✅ Perfect timing (no more 42-minute offset)
- ✅ Lower gas costs due to 0.2 USDC tickets
- ✅ Same automation logic as V1

### 2. Migration from V1
- V1 Upkeep: Keep running for existing game
- V2 Upkeep: New separate upkeep needed
- No interference between V1 and V2

### 3. Timing Verification
```javascript
// After creating upkeep, verify timing:
await window.verifyContractLogic()
// Should show: ✅ Próximo sorteo ES medianoche São Paulo
```

## 📝 Upkeep Information Template

When creating the upkeep, use this information:

```
=== CHAINLINK AUTOMATION UPKEEP ===
Name: LottoMoji V2 Daily Draws
Contract: 0x8F6A8D8E1408d53D1C06Ed0664CC334Fa533480c
Network: Base Sepolia (84532)
Type: Custom Logic
Gas Limit: 1,000,000
Starting Balance: 5 LINK

Description:
Automated daily lottery draws for LottoMoji V2. 
Executes draws every 24 hours at midnight São Paulo time (03:00 UTC).
Uses Chainlink VRF for secure random number generation.
Contract has 0.2 USDC ticket price and corrected timing.

Check Data: 0x
Admin: [Your wallet address]
```

## ✅ Post-Setup Verification

### 1. Immediate Checks
- [ ] Upkeep shows as "Active" in dashboard
- [ ] Contract address is correct
- [ ] Balance is funded
- [ ] Gas limit is sufficient

### 2. Function Tests
- [ ] `checkUpkeep(0x)` returns expected values
- [ ] `automationActive()` returns true
- [ ] Contract timing is perfect (midnight SP)
- [ ] Next draw countdown is accurate

### 3. 24-Hour Test
- [ ] Wait for first automated draw
- [ ] Verify VRF request was made
- [ ] Confirm draw completed successfully
- [ ] Check that timer reset for next day

## 🔄 Maintenance

### Regular Tasks
- **Weekly**: Check LINK balance
- **Monthly**: Review upkeep performance
- **After draws**: Verify successful execution
- **Gas price changes**: Adjust max gas price if needed

### Emergency Procedures
```solidity
// If needed to pause automation:
toggleAutomation()  // Sets automationActive = false

// If needed to resume:
toggleAutomation()  // Sets automationActive = true
```

## 🎉 Expected Result

Once configured correctly:
- ✅ Automated daily draws at exactly midnight São Paulo
- ✅ No manual intervention required
- ✅ Perfect timing synchronization
- ✅ Cost-effective operation with 0.2 USDC tickets
- ✅ Reliable execution via Chainlink Automation

## 📞 Support

If issues arise:
1. Check Chainlink Automation dashboard
2. Verify contract functions manually
3. Monitor gas usage and funding
4. Use debugging functions: `window.checkContractDrawTime()` 