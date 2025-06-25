# 🚀 Plan de Integración: Contratos Blockchain + Frontend

## 📋 Estado Actual

✅ **Contratos Desplegados**
- LottoMojiMain.sol (Contrato principal)
- LottoMojiReserves.sol (Sistema de reservas)  
- LottoMojiTickets.sol (NFTs de tickets)
- LottoMojiRandom.sol (Chainlink VRF)
- LottoMojiAutomation.sol (Chainlink Automation v2.5)

✅ **Sistema Firebase Actual**
- Gestión de pools diarias
- Hooks React para tiempo real
- Sistema de acumulación
- Distribución automática

✅ **Nuevo Sistema de Reservas (README2.md)**
- 20% diario va SIEMPRE a reservas
- 80% a pools principales
- 3 Reserve Pools independientes
- Recarga automática

## 🔧 Pasos de Integración

### 1. Obtener Direcciones de Contratos

```bash
# Ejecutar script para extraer direcciones
node scripts/getContractAddresses.js
```

### 2. Instalar Dependencias Web3

```bash
npm install ethers @coinbase/wallet-sdk
```

### 3. Actualizar Variables de Entorno

Crea `.env.local`:

```env
VITE_CHAIN_ID=84532
VITE_RPC_URL=https://sepolia.base.org
VITE_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Direcciones de contratos (actualizar con valores reales)
VITE_LOTTO_MOJI_MAIN=0x...
VITE_LOTTO_MOJI_RESERVES=0x...
VITE_LOTTO_MOJI_TICKETS=0x...

# Firebase (ya existente)
VITE_FIREBASE_API_KEY=...
```

### 4. Archivos Creados

✅ **Nuevos archivos creados:**
- `src/utils/contractAddresses.ts` - Configuración de contratos
- `src/hooks/useBlockchainPools.ts` - Hook para pools blockchain  
- `src/components/EnhancedPrizePoolDisplay.tsx` - Componente mejorado
- `scripts/getContractAddresses.js` - Script de extracción

### 5. Integración en App.tsx

```typescript
import { EnhancedPrizePoolDisplay } from './components/EnhancedPrizePoolDisplay';

// Reemplazar PrizePoolDisplay con:
<EnhancedPrizePoolDisplay showReserves={true} showAccumulated={true} />
```

## 🎯 Sistema de Reservas Mejorado

### Funcionamiento:

1. **Distribución Diaria:**
   - 80% → Pools principales
   - 20% → Reserve Pools (SIEMPRE)

2. **Chainlink Automation v2.5:**
   - Sorteos automáticos 03:00 São Paulo
   - Gestión automática de reservas

## 🚨 ¿Qué necesitas hacer ahora?

1. **Ejecutar:** `node scripts/getContractAddresses.js`
2. **Verificar:** ¿Se encontraron las direcciones de contratos?
3. **Instalar:** `npm install ethers @coinbase/wallet-sdk`
4. **Configurar:** `.env.local` con direcciones reales
5. **Probar:** La integración funciona

**¡Avísame qué resultado obtienes del script!** 🚀 