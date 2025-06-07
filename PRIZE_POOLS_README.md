# 🏆 Sistema de Pools de Premios Dinámicos - LottoMoji

## Descripción General

El sistema de pools de premios dinámicos permite que los tokens gastados por los jugadores se acumulen durante el día y se distribuyan automáticamente entre los ganadores del sorteo, creando premios variables basados en la participación.

## 🎯 Funcionamiento

### 1. Acumulación de Tokens
- Cada ticket cuesta **1 token gratuito**
- Los tokens se acumulan en una **pool principal** durante todo el día
- La pool se cierra automáticamente **10 minutos antes del sorteo**

### 2. Distribución de la Pool (10 minutos antes del sorteo)

La pool total se distribuye automáticamente en las siguientes categorías:

| Premio | Porcentaje | Descripción |
|--------|------------|-------------|
| **Primer Premio** | 64% | Para ganadores con 4 emojis exactos en orden |
| **Reserva 1er Premio** | 16% | Se activa cuando hay ganadores del primer premio |
| **Segundo Premio** | 8% | Para ganadores con 4 emojis en cualquier orden |
| **Reserva 2do Premio** | 2% | Se activa cuando hay ganadores del segundo premio |
| **Tercer Premio** | 4% | Para ganadores con 3 emojis exactos en orden |
| **Reserva 3er Premio** | 1% | Se activa cuando hay ganadores del tercer premio |
| **Desarrollo** | 5% | Para mantenimiento y desarrollo del juego |

### 3. Distribución de Premios (después del sorteo)

- Los tokens se reparten **equitativamente** entre todos los ganadores de cada categoría
- Si hay **reservas activadas**, los ganadores reciben tokens adicionales
- Los premios se calculan automáticamente: `tokens_por_ganador = pool_categoria / numero_ganadores`

## 🔧 Implementación Técnica

### Archivos Principales

- `src/firebase/prizePools.ts` - Lógica principal del sistema de pools
- `src/hooks/usePrizePool.ts` - Hook para gestión en tiempo real
- `src/components/PrizePoolDisplay.tsx` - Componentes de visualización
- `src/types.ts` - Tipos TypeScript para pools y distribuciones

### Colecciones Firebase

```
prize_pools/
├── {gameDay}/
│   ├── totalTokensCollected: number
│   ├── poolsDistributed: boolean
│   ├── pools: {
│   │   ├── firstPrize: number
│   │   ├── firstPrizeReserve: number
│   │   ├── secondPrize: number
│   │   ├── secondPrizeReserve: number
│   │   ├── thirdPrize: number
│   │   ├── thirdPrizeReserve: number
│   │   └── development: number
│   │ }
│   └── reserves: {
│       ├── firstPrizeActivated: boolean
│       ├── secondPrizeActivated: boolean
│       └── thirdPrizeActivated: boolean
│   }

ticket_purchases/
├── {purchaseId}/
│   ├── userId: string
│   ├── walletAddress: string
│   ├── gameDay: string
│   ├── tokensSpent: number
│   ├── ticketId: string
│   └── timestamp: Timestamp

prize_distributions/
├── {distributionId}/
│   ├── gameDay: string
│   ├── prizeType: 'first' | 'second' | 'third'
│   ├── totalWinners: number
│   ├── totalPrizePool: number
│   ├── tokensPerWinner: number
│   ├── winners: Array<{userId, walletAddress, ticketId, tokensAwarded}>
│   ├── reserveActivated: boolean
│   └── reserveTokensDistributed: number
```

## 🚀 Funciones Principales

### Gestión de Pools

```typescript
// Obtener pool del día actual
const pool = await getDailyPrizePool();

// Agregar tokens cuando se compra un ticket
const success = await addTokensToPool(userId, walletAddress, 1, ticketId);

// Distribuir pool en categorías específicas (automático)
const distributed = await distributePrizePool();

// Distribuir premios a ganadores
const distribution = await distributePrizesToWinners(gameDay, 'first', winners);
```

### Hooks React

```typescript
// Hook principal para gestión de pools
const {
  pool,
  totalParticipants,
  totalTicketsSold,
  timeUntilDistribution,
  canDistribute,
  isLoading,
  error,
  triggerDistribution,
  refreshStats
} = usePrizePool();
```

### Componentes

```tsx
// Display completo de la pool
<PrizePoolDisplay 
  showDetailedBreakdown={true} 
  showDebugControls={true}
/>

// Resumen compacto
<PrizePoolSummary />
```

## ⏰ Automatización

### Distribución Automática
- El sistema verifica cada minuto si faltan 10 minutos para el sorteo
- Automáticamente distribuye la pool en las categorías específicas
- Se ejecuta en `src/hooks/useRealTimeTimer.ts`

### Sincronización de Timezone
- Todo el sistema usa **horario de São Paulo** (`America/Sao_Paulo`)
- Sincronizado con las Firebase Functions que ejecutan el sorteo
- Distribución ocurre a las **23:50 hora de São Paulo**

## 🛠️ Funciones de Debug

En modo desarrollo, están disponibles las siguientes funciones en la consola:

```javascript
// Ver estadísticas de la pool actual
await debugPrizePool();

// Forzar distribución manual
await distributePrizePool();

// Ver estado completo de la pool
console.log(window.debugPrizePool);
```

## 📊 Ejemplo de Funcionamiento

### Escenario: 100 tickets vendidos en un día

1. **Acumulación**: 100 tokens en la pool principal
2. **Distribución (23:50 SP)**:
   - Primer Premio: 64 tokens
   - Reserva 1er Premio: 16 tokens
   - Segundo Premio: 8 tokens
   - Reserva 2do Premio: 2 tokens
   - Tercer Premio: 4 tokens
   - Reserva 3er Premio: 1 token
   - Desarrollo: 5 tokens

3. **Resultados del Sorteo**:
   - 2 ganadores del primer premio → 32 tokens cada uno + 8 tokens de reserva = **40 tokens cada uno**
   - 5 ganadores del segundo premio → 1.6 tokens cada uno + 0.4 tokens de reserva = **2 tokens cada uno**
   - 10 ganadores del tercer premio → 0.4 tokens cada uno + 0.1 tokens de reserva = **0.5 tokens cada uno**

## 🔒 Seguridad y Validaciones

- **Transacciones atómicas** para evitar inconsistencias
- **Validación de pools cerradas** antes de agregar tokens
- **Verificación de distribución única** por día
- **Logs detallados** para auditoría
- **Manejo de errores** sin afectar la generación de tickets

## 🎮 Experiencia del Usuario

- **Visualización en tiempo real** de la pool acumulada
- **Contador regresivo** hasta la distribución
- **Estadísticas de participación** (participantes únicos, tickets vendidos)
- **Información de premios** en los anuncios de ganadores
- **Notificaciones visuales** del estado de la pool

## 🔄 Integración con Sistema Existente

El sistema se integra perfectamente con:
- ✅ Sistema de tokens gratuitos existente
- ✅ Generación de tickets
- ✅ Sorteos automáticos
- ✅ Timezone de São Paulo
- ✅ Perfiles de ganadores
- ✅ Estadísticas de usuarios

## 📈 Beneficios

1. **Premios Dinámicos**: Los premios crecen con la participación
2. **Transparencia**: Todo el proceso es visible y auditable
3. **Automatización**: No requiere intervención manual
4. **Escalabilidad**: Funciona con cualquier número de participantes
5. **Reservas**: Sistema de bonificación para ganadores
6. **Desarrollo Sostenible**: 5% para mantenimiento del juego 