# 🕐 Funciones de Debugging del Timer del Contrato

## 🎯 Objetivo
Verificar exactamente a qué hora se ejecuta el sorteo según el contrato blockchain y compararlo con el timer del frontend.

## 🔧 Funciones Disponibles

### 1. `window.checkContractDrawTime()`
**Función principal** para verificar la hora exacta del sorteo según el contrato.

**Lo que hace:**
- Se conecta directamente al contrato en Base Sepolia
- Obtiene `currentGameDay`, `lastDrawTime`, `drawTimeUTC`, `drawInterval`
- Calcula el próximo sorteo: `nextDrawTime = lastDrawTime + DRAW_INTERVAL`
- Muestra el próximo sorteo en timezone de São Paulo
- Verifica el estado de Chainlink Upkeep

**Salida esperada:**
```
🕐 Verificando hora del sorteo desde el contrato...
================================================
📊 Datos del contrato:
- Current Game Day: 19734
- Draw Time UTC: 10800 segundos = 3.0 horas
- Draw Interval: 86400 segundos = 24 horas
- Last Draw Time: 1735257600 = 2024-12-27T00:00:00.000Z
- Current Block Time: 1735287234 = 2024-12-27T08:13:54.000Z

⏰ Cálculos del próximo sorteo:
- Next Draw Time: 1735344000 = 2024-12-28T00:00:00.000Z
- Time to Next Draw: 56766 segundos
- Time to Next Draw: 15h 46m 6s

🇧🇷 Próximo sorteo en São Paulo:
- Fecha/Hora SP: 27/12/2024, 21:00:00
- ¿Es medianoche SP?: 00:00
```

### 2. `window.verifyContractLogic()`
**Verificación de la lógica** del contrato para asegurar que está configurado correctamente.

**Lo que verifica:**
- ✅ `drawTimeUTC = 3 horas` (03:00 UTC = 00:00 São Paulo)
- ✅ `drawInterval = 24 horas` (sorteos diarios)
- ✅ Próximo sorteo cae en medianoche São Paulo

**Salida esperada:**
```
🔍 Verificando lógica de cálculo del contrato...
==============================================
📋 Análisis de la lógica:
- drawTimeUTC en horas: 3
✅ drawTimeUTC = 3 horas = 03:00 UTC = 00:00 São Paulo (correcto)
- Intervalo en horas: 24
✅ Intervalo = 24 horas (correcto para sorteos diarios)
- Próximo sorteo en SP: 00:00
✅ Próximo sorteo es a medianoche São Paulo (correcto)
```

### 3. `window.compareFrontendVsContract()`
**Comparación directa** entre el timer del frontend y el timer del contrato.

**Lo que compara:**
- Tiempo restante según el contrato
- Tiempo restante según el frontend (São Paulo)
- Diferencia entre ambos
- Estado de sincronización

**Salida esperada:**
```
⚖️ Comparando timer frontend vs contrato...
============================================
📊 Comparación:
- Contrato - Tiempo restante: 56766 segundos
- Frontend - Tiempo restante: 56763 segundos
- Diferencia: 3 segundos
✅ Frontend y contrato están sincronizados (diferencia ≤ 60s)

⏰ Tiempos formateados:
- Contrato: 15h 46m 6s
- Frontend: 15h 46m 3s
```

## 🚨 Posibles Problemas a Detectar

### ❌ Configuración Incorrecta
```
⚠️ drawTimeUTC no corresponde a medianoche São Paulo
   Expected: 3 horas (03:00 UTC)
   Actual: 5.5 horas
```

### ❌ Desincronización
```
❌ Frontend y contrato están desincronizados (> 5min)
- Contrato: 15h 46m 6s
- Frontend: 14h 32m 18s
- Diferencia: 4428 segundos
```

### ❌ Hora Incorrecta
```
⚠️ Próximo sorteo NO es a medianoche São Paulo
   Expected: 00:00
   Actual: 03:30
```

## 📋 Cómo Usar las Funciones

1. **Abrir la aplicación** en el navegador
2. **Abrir DevTools** (F12)
3. **Ir a la pestaña Console**
4. **Ejecutar cualquiera de las funciones:**

```javascript
// Ver hora exacta del sorteo
await window.checkContractDrawTime()

// Verificar que la configuración es correcta
await window.verifyContractLogic()

// Comparar frontend vs contrato
await window.compareFrontendVsContract()
```

## 🔍 Qué Buscar

### ✅ Todo Correcto
- `drawTimeUTC = 3 horas` (medianoche São Paulo)
- `drawInterval = 24 horas` (sorteos diarios)
- Próximo sorteo en `00:00` São Paulo
- Diferencia frontend vs contrato `≤ 60 segundos`

### ⚠️ Posibles Errores
- `drawTimeUTC` diferente a 3 horas
- `drawInterval` diferente a 24 horas
- Próximo sorteo NO en medianoche São Paulo
- Gran diferencia entre frontend y contrato (> 5 minutos)

## 💡 Interpretación de Resultados

- **Si todo está ✅**: El timer está perfectamente sincronizado
- **Si hay ⚠️**: Revisar configuración del contrato o lógica del frontend
- **Si hay ❌**: Desincronización significativa que requiere corrección

## 🛠️ Soluciones Rápidas

1. **Si hay desincronización menor**: El timer híbrido se auto-corregirá
2. **Si hay desincronización mayor**: Verificar conectividad a Base Sepolia
3. **Si la configuración está mal**: Revisar parámetros del contrato
4. **Si persisten errores**: Usar `window.diagnoseHybridTimer()` para más detalles 