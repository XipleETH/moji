# 🔄 CHAINLINK AUTOMATION UPKEEP - NUEVO CONTRATO V3

## 📍 NUEVA DIRECCIÓN DEL CONTRATO
```
0xfc1a8Bc0180Fc615810d62374F16C4c026141031
```

## 🚀 PASOS PARA CREAR NUEVO UPKEEP

### 1. Ir a Chainlink Automation
🌐 https://automation.chain.link/base-sepolia

### 2. Crear Nuevo Upkeep
- ✅ **Trigger Type**: Custom Logic
- ✅ **Target Contract**: `0xfc1a8Bc0180Fc615810d62374F16C4c026141031`
- ✅ **Admin Address**: `0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0` (tu wallet)

### 3. Configuración del Upkeep
```
Upkeep Name: LottoMoji V3 Daily Draw - VRF Fixed
Description: Automated daily lottery draw at midnight São Paulo (3:00 UTC)
Target Contract: 0xfc1a8Bc0180Fc615810d62374F16C4c026141031
Check Function: checkUpkeep(bytes calldata checkData)
Perform Function: performUpkeep(bytes calldata performData)
```

### 4. Configuración de Gas y LINK
```
Starting Balance: 2-5 LINK tokens
Gas Limit: 2,500,000
Max Gas Price: 1000 gwei (Base Sepolia)
```

### 5. ABI del Contrato
```json
[
  {
    "inputs": [{"internalType": "bytes", "name": "checkData", "type": "bytes"}],
    "name": "checkUpkeep",
    "outputs": [
      {"internalType": "bool", "name": "upkeepNeeded", "type": "bool"},
      {"internalType": "bytes", "name": "performData", "type": "bytes"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes", "name": "performData", "type": "bytes"}],
    "name": "performUpkeep",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

## ✅ VERIFICACIONES ANTES DE CREAR UPKEEP

### 1. Verificar VRF Subscription
- ✅ **Tu Subscription ID**: `105961847727705490544354750783936451991128107961690295417839588082464327658827`
- ✅ **Contrato agregado como consumer**: SÍ
- ✅ **Balance LINK suficiente**: Verificar en https://vrf.chain.link/

### 2. Verificar Timing del Contrato
```bash
# Ejecutar para verificar
npx hardhat run scripts/check-new-contract-status.js --network base-sepolia
```

### 3. Estado Actual del Contrato
- ✅ **Timing corregido**: Medianoche São Paulo
- ✅ **VRF Subscription**: Tu ID correcto
- ✅ **Owner**: Tu wallet
- ✅ **Ready**: Para recibir primer sorteo automático

## 🎯 PRÓXIMO SORTEO
- **Hora**: 26/6/2025 a las 00:00 São Paulo (03:00 UTC)
- **Game Day**: 20264
- **Estado**: Listo para upkeep automático

## ⚠️ IMPORTANTE
- El contrato anterior `0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5` tenía 217 tickets, pero esos **NO se transferirán**
- Este es un **nuevo contrato limpio** que empezará desde cero
- Los pools empezarán en 0 USDC hasta que se vendan nuevos tickets

## 📋 CHECKLIST POST-DEPLOYMENT
- [x] ✅ Contrato deployado con VRF correcto
- [x] ✅ Timing corregido para medianoche SP
- [x] ✅ Frontend actualizado con nueva dirección
- [ ] 🔄 Crear nuevo Chainlink Automation Upkeep
- [ ] 🔄 Verificar primer sorteo automático
- [ ] 🔄 Comunicar a usuarios sobre nuevo contrato 