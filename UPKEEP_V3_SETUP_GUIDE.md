# 🔄 Guía de Configuración Chainlink Automation Upkeep V3

## 📋 **Información del Contrato V3**

| Campo | Valor |
|-------|--------|
| **Contrato V3** | `0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5` |
| **Network** | Base Sepolia |
| **Función a Ejecutar** | `performUpkeep()` |
| **Timing** | Medianoche São Paulo (03:00 UTC) |

---

## 🚀 **Pasos para Crear el Upkeep**

### **1. Acceder a Chainlink Automation**
- Ve a: https://automation.chain.link/
- Conecta tu wallet (misma que deployó el contrato)
- Selecciona "Base Sepolia" network

### **2. Crear Nuevo Upkeep**
- Click en "Register new Upkeep"
- Selecciona "Custom logic"

### **3. Configuración del Upkeep**

#### **Target contract address:**
```
0xD72976F365415F098736F9F4F9AD1Af3fE15B0d5
```

#### **Upkeep name:**
```
LottoMoji V3 - Proportional Reserves + Auto-Refill
```

#### **Gas limit:**
```
2000000
```

#### **Starting balance (LINK):**
```
5
```

#### **Admin address:**
```
0xDfA9A93f2d5d1861553cb22eb3023Ee3eFEF67e0
```

#### **Project name:**
```
LottoMoji
```

#### **Email notifications:**
```
tu-email@ejemplo.com
```

### **4. Configuraciones Avanzadas**

#### **Check data (si necesario):**
```
0x
```

#### **Trigger:**
- Tipo: Time-based
- Cron expression: `0 3 * * *` (diariamente a las 03:00 UTC)

---

## 🎯 **Funcionalidades V3 que Automatiza**

### **1. Ejecución de Sorteos**
- **Función**: `performUpkeep()`
- **Frecuencia**: Diario a medianoche São Paulo
- **VRF**: Solicita números aleatorios de Chainlink VRF

### **2. Sistema de Reservas Proporcional**
```solidity
// V3: Distribución proporcional
First Prize Reserve:  80% de 20% = 16% del ticket total
Second Prize Reserve: 10% de 20% = 2% del ticket total  
Third Prize Reserve:  10% de 20% = 2% del ticket total
Development Buffer:   5% queda en contrato
```

### **3. Auto-Relleno Automático**
```solidity
// Si hay ganador y pool principal está vacío:
if (hasWinner && mainPool == 0 && reserve > 0) {
    mainPool = reserve;    // Transferir toda la reserva
    reserve = 0;           // Vaciar reserva
    emit ReserveUsedForRefill(gameDay, prizeLevel, amount);
}
```

---

## 🔧 **Verificación Post-Configuración**

### **1. Verificar Upkeep Activo**
- En Chainlink Automation dashboard
- Estado: "Active" ✅
- Balance: >1 LINK ✅

### **2. Probar Funciones del Contrato**
```javascript
// En consola del navegador (frontend)
await window.checkContractDrawTime()
await window.verifyContractLogic()
await window.compareFrontendVsContract()
```

### **3. Verificar Timing**
```javascript
// Debe mostrar próximo sorteo a medianoche São Paulo
const nextDrawSP = new Date(nextDrawTime * 1000).toLocaleString('es-BR', { 
  timeZone: 'America/Sao_Paulo', 
  hour12: false 
});
console.log("Próximo sorteo:", nextDrawSP); // Debe ser "00:00"
```

---

## 📊 **Diferencias V3 vs V2**

| Aspecto | V2 | V3 |
|---------|----|----|
| **Reservas First Prize** | 6.67% (igual a otros) | 16% (proporcional) |
| **Reservas Second Prize** | 6.67% | 2% |
| **Reservas Third Prize** | 6.67% | 2% |
| **Auto-Relleno** | ❌ Manual | ✅ Automático |
| **Capital Efficiency** | Baja | 2.4x mejor |
| **Development Reserve** | ✅ Tenía | ❌ No tiene |

---

## 🎮 **Flujo de Ejecución V3**

### **Cada Medianoche São Paulo:**

1. **Chainlink Automation** → Ejecuta `performUpkeep()`
2. **Contrato V3** → Solicita números aleatorios (VRF)
3. **VRF Response** → Procesa resultados del sorteo
4. **Distribución Pools**:
   - 80% → Main pools (distribuido 80%/10%/5%/5%)
   - 20% → Reserves (distribuido 80%/10%/10%)
5. **Auto-Relleno** (si hay ganadores):
   - Si main pool vacío + hay ganador → Transferir desde reserva
   - Emit `ReserveUsedForRefill` event
6. **Frontend** → Actualiza pools y muestra ganadores

---

## 🔔 **Monitoreo y Mantenimiento**

### **Alertas a Configurar:**
- ✅ Balance LINK bajo (<1 LINK)
- ✅ Fallos de ejecución
- ✅ Uso de reservas para auto-relleno
- ✅ Pools principales agotadas

### **Métricas a Revisar:**
- Ejecuciones exitosas diarias
- Gas utilizado por ejecución
- Frecuencia de auto-relleno
- Balance de reservas acumuladas

---

## 🎉 **Beneficios del Sistema V3**

1. **Premios Más Grandes**: 2.4x más capital para primer premio
2. **Gestión Automática**: Sin intervención manual necesaria
3. **Mejor UX**: Siempre hay premio disponible cuando hay ganador
4. **Eficiencia**: Capital asignado donde más impacto tiene
5. **Transparencia**: Eventos para tracking de auto-relleno

---

## 🆘 **Troubleshooting**

### **Si Upkeep No Ejecuta:**
1. Verificar balance LINK suficiente
2. Revisar gas limit (aumentar si necesario)
3. Confirmar que contrato implementa `checkUpkeep()`
4. Verificar permisos de owner

### **Si Auto-Relleno No Funciona:**
1. Confirmar que hay reservas disponibles
2. Verificar que main pool está realmente vacía
3. Revisar logs de eventos `ReserveUsedForRefill`
4. Testing con `npm run test-payments-v3`

**¡El sistema V3 está diseñado para funcionar de forma completamente autónoma una vez configurado correctamente!** 