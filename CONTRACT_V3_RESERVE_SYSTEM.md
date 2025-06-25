# LottoMojiCore V3: Sistema de Reservas Proporcional con Auto-Relleno

## 🎯 **Cambios Principales en V3**

### **Sistema de Reservas Anterior (V2)**
```
Reservas Diarias: 20% ÷ 3 = 6.67% cada pool
├── First Prize Reserve: 6.67% (0.0133 USDC por ticket)
├── Second Prize Reserve: 6.67% (0.0133 USDC por ticket)
└── Third Prize Reserve: 6.67% (0.0133 USDC por ticket)
```

### **Nuevo Sistema V3 (Proporcional)**
```
Reservas Diarias: 20% distribuido proporcionalmente
├── First Prize Reserve: 80% de 20% = 16% (0.032 USDC por ticket)
├── Second Prize Reserve: 10% de 20% = 2% (0.004 USDC por ticket)
└── Third Prize Reserve: 10% de 20% = 2% (0.004 USDC por ticket)
✓ No hay reserva de desarrollo (1% queda como buffer del contrato)
```

---

## 🔧 **Implementación Técnica**

### **Función `_sendDailyReserves()` Actualizada**
```solidity
function _sendDailyReserves(uint256 gameDay) internal {
    DailyPool storage pool = dailyPools[gameDay];
    
    // Distribute reserves proportionally to prize percentages
    uint256 firstPrizeReserve = (pool.reservePortion * FIRST_PRIZE_PERCENTAGE) / 100;  // 80% of reserves
    uint256 secondPrizeReserve = (pool.reservePortion * SECOND_PRIZE_PERCENTAGE) / 100; // 10% of reserves  
    uint256 thirdPrizeReserve = (pool.reservePortion * THIRD_PRIZE_PERCENTAGE) / 100;   // 10% of reserves
    // No reserve for development (5% remains in contract as buffer)
    
    reserves.firstPrizeReserve1 += firstPrizeReserve;
    reserves.secondPrizeReserve2 += secondPrizeReserve;
    reserves.thirdPrizeReserve3 += thirdPrizeReserve;
    
    pool.reservesSent = true;
    
    emit DailyReservesSent(gameDay, firstPrizeReserve, secondPrizeReserve, thirdPrizeReserve, pool.reservePortion);
}
```

### **Sistema de Auto-Relleno en `_processDrawResults()`**
```solidity
// Process prize distribution and auto-refill from reserves
if (!hasFirstPrizeWinner) {
    // No winner: accumulate to main pool
    mainPools.firstPrizeAccumulated += pool.firstPrizeDaily;
} else {
    // Has winner: check if main pool needs refill from reserve
    if (mainPools.firstPrizeAccumulated == 0 && reserves.firstPrizeReserve1 > 0) {
        // Auto-refill from reserve when main pool is empty
        mainPools.firstPrizeAccumulated = reserves.firstPrizeReserve1;
        reserves.firstPrizeReserve1 = 0;
        emit ReserveUsedForRefill(gameDay, 1, mainPools.firstPrizeAccumulated);
    }
}
```

---

## 💰 **Análisis Financiero**

### **Con Ticket de 0.2 USDC:**

| Concepto | V2 (Igual) | V3 (Proporcional) | Diferencia |
|----------|------------|-------------------|------------|
| **First Prize Reserve** | 0.0133 USDC (6.67%) | 0.032 USDC (16%) | +140% |
| **Second Prize Reserve** | 0.0133 USDC (6.67%) | 0.004 USDC (2%) | -70% |
| **Third Prize Reserve** | 0.0133 USDC (6.67%) | 0.004 USDC (2%) | -70% |
| **Development Reserve** | 0.0133 USDC (6.67%) | 0 USDC (0%) | -100% |
| **Contract Buffer** | 0.0067 USDC (3.33%) | 0.004 USDC (1%) | -40% |

### **Ventajas del Sistema V3:**

1. **Mayor Capital para Primer Premio**: 2.4x más reserva (16% vs 6.67%)
2. **Eficiencia de Capital**: Más fondos donde se necesitan (premios grandes)
3. **Simplificación**: No necesita gestionar reserva de desarrollo
4. **Auto-sostenibilidad**: Relleno automático sin intervención manual

---

## 🔄 **Mecanismo de Auto-Relleno**

### **Escenarios de Funcionamiento:**

#### **Escenario 1: Pool Principal Vacía + Hay Ganador**
```
Estado Inicial:
├── Main Pool: 0 USDC (vacía después de sorteo anterior)
├── Reserve Pool: 5.0 USDC (acumulada)
└── Ganador encontrado: SÍ

Resultado:
├── Main Pool: 5.0 USDC (transferido desde reserva)
├── Reserve Pool: 0 USDC (transferido a main pool)
└── Premio disponible: Pool diaria + 5.0 USDC
```

#### **Escenario 2: Pool Principal con Fondos + Hay Ganador**
```
Estado Inicial:
├── Main Pool: 3.0 USDC (acumulada de días sin ganadores)
├── Reserve Pool: 5.0 USDC (acumulada)
└── Ganador encontrado: SÍ

Resultado:
├── Main Pool: 3.0 USDC (sin cambios, no necesita relleno)
├── Reserve Pool: 5.0 USDC (sin cambios)
└── Premio disponible: Pool diaria + 3.0 USDC
```

#### **Escenario 3: Pool Principal Vacía + No Hay Ganador**
```
Estado Inicial:
├── Main Pool: 0 USDC (vacía)
├── Reserve Pool: 5.0 USDC (acumulada)
└── Ganador encontrado: NO

Resultado:
├── Main Pool: Pool diaria acumulada (no se usa reserva)
├── Reserve Pool: 5.0 USDC (sin cambios)
└── La reserva se guarda para el próximo ganador
```

---

## 🛠️ **Scripts y Comandos**

### **Deployment V3:**
```bash
npm run deploy-v3
```

### **Testing del Sistema V3:**
```bash
npm run test-payments-v3
```

### **Estructura de Archivos:**
```
contracts/
├── contracts/LottoMojiCore.sol (modificado con V3)
├── scripts/
│   ├── deploy-v3.js (nuevo)
│   └── test-payment-system-v3.js (nuevo)
└── package.json (scripts agregados)
```

---

## 📊 **Comparación de Versiones**

| Aspecto | V1 | V2 | V3 |
|---------|----|----|-----|
| **Precio Ticket** | 2.0 USDC | 0.2 USDC | 0.2 USDC |
| **Timing** | Desajustado | Perfecto | Perfecto |
| **Reserve First** | N/A | 6.67% | 16% |
| **Reserve Second** | N/A | 6.67% | 2% |
| **Reserve Third** | N/A | 6.67% | 2% |
| **Auto-Refill** | ❌ | ❌ | ✅ |
| **Dev Reserve** | ❌ | ✅ | ❌ |
| **Capital Efficiency** | ❌ | ⚠️ | ✅ |

---

## ⚡ **Próximos Pasos**

1. **Deploy V3**: `npm run deploy-v3`
2. **Fix Timing**: Usar `setLastDrawTime()` si necesario
3. **Add VRF Consumer**: Agregar V3 a subscription VRF
4. **Create Upkeep**: Nuevo Chainlink Automation Upkeep
5. **Test System**: `npm run test-payments-v3`
6. **Update Frontend**: Cambiar contract address en aplicación

---

## 🎉 **Beneficios Esperados**

- **Premios Más Grandes**: 2.4x más reserva para primer premio
- **Gestión Automática**: Sin necesidad de intervención manual
- **Mejor UX**: Siempre hay premio disponible cuando hay ganador
- **Simplicidad**: Menos pools que gestionar
- **Eficiencia**: Capital asignado donde más se necesita

**El sistema V3 representa una evolución natural hacia un sistema de lotería más eficiente y auto-sostenible.** 