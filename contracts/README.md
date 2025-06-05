# 🎰 LottoMoji Smart Contracts

Sistema completo de lotería descentralizada en Base con tickets NFT soulbound, pools de premios con reservas, y automatización vía Chainlink.

## 📋 Arquitectura de Contratos

### 🏆 LottoMojiCore.sol
**Contrato principal** que orquesta toda la lógica de la lotería:
- Compra de tickets con ETH/USDC
- Integración con Chainlink VRF para números aleatorios
- Chainlink Automation para sorteos automáticos cada 24h
- Procesamiento de ganadores y distribución automática
- Generación automática de tickets gratis

### 🎫 LottoMojiTickets.sol  
**NFTs soulbound** que representan los tickets:
- Tickets no transferibles (soulbound)
- Válidos solo por 24 horas desde la compra
- Se queman automáticamente al expirar
- Tickets gratis automáticos para ganadores de 3er lugar

### 💰 LottoMojiPrizePool.sol
**Sistema de pools** con reservas garantizadas:
- Pools separadas para ETH y USDC
- Sistema pari-mutuel con reservas de seguridad
- Distribución automática de premios
- 5% fee de desarrollo

## 💰 Nueva Distribución de Fondos

Cada ticket de $2 USD se distribuye así:

### 📊 Distribución por Ticket
```
💵 $2.00 USD = 100%
├── 5% → Desarrollo (0.10 USD)
├── 5% → Tercer Premio
│   ├── 4% → Pool Acumulable (0.08 USD)
│   └── 1% → Pool Reserva (0.02 USD)
├── 10% → Segundo Premio  
│   ├── 8% → Pool Acumulable (0.16 USD)
│   └── 2% → Pool Reserva (0.04 USD)
└── 80% → Primer Premio
    ├── 64% → Pool Acumulable (1.28 USD)
    └── 16% → Pool Reserva (0.32 USD)
```

### 🎯 Sistema de Reservas

**¿Cómo funcionan las reservas?**

1. **Pools Acumulables**: Se reparten cuando hay ganadores, se acumulan cuando no los hay
2. **Pools de Reserva**: Se acumulan siempre, solo se usan cuando hay ganadores

**Ejemplo práctico:**
- Si hay 100 tickets vendidos = $200 USD total
- Pool Primer Premio Acumulable: $128 USD
- Pool Primer Premio Reserva: $32 USD
- **Total disponible si hay ganador**: $160 USD
- **Si no hay ganador**: Los $128 se acumulan para el próximo día

## 🏆 Premios y Criterios

### 🥇 Primer Premio (4 emojis en orden exacto)
- **Pool**: 64% acumulable + 16% reserva = 80% total
- **Distribución**: Se reparte entre todos los ganadores
- **Si no hay ganadores**: Pool acumulable crece para el próximo día

### 🥈 Segundo Premio (4 emojis en cualquier orden)
- **Pool**: 8% acumulable + 2% reserva = 10% total  
- **Distribución**: Se reparte entre todos los ganadores
- **Si no hay ganadores**: Pool acumulable crece para el próximo día

### 🥉 Tercer Premio (3 emojis en orden exacto)
- **Pool**: 4% acumulable + 1% reserva = 5% total
- **Distribución**: Se reparte entre todos los ganadores
- **Si no hay ganadores**: Pool acumulable crece para el próximo día

### 🎟️ Premio Gratis (3 emojis en cualquier orden)
- **Premio**: Ticket gratis automático para la próxima ronda
- **Generación**: Automática con emojis aleatorios
- **Válido**: 24 horas desde la generación

## 🔧 Deployment en Base

### 📋 Requisitos Previos

1. **Obtener tokens de prueba** (Base Sepolia):
   - ETH: [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
   - LINK: [Chainlink Faucet](https://faucets.chain.link/base-sepolia)

2. **Crear Chainlink VRF Subscription**:
   - Ve a [vrf.chain.link](https://vrf.chain.link/)
   - Crea una nueva subscription
   - Agrega LINK a la subscription

3. **Configurar variables de entorno**:
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 🚀 Comandos de Deployment

```bash
# Instalar dependencias
cd contracts
npm install

# Compilar contratos
npm run compile

# Deploy en testnet (Base Sepolia)
npm run deploy:testnet

# Deploy en mainnet (Base)
npm run deploy:mainnet

# Verificar contratos
npm run verify
```

### 📋 Post-Deployment

1. **Configurar Chainlink VRF**:
   - Agregar contrato LottoMojiCore como consumer
   - Asegurar suficiente LINK en la subscription

2. **Configurar Chainlink Automation**:
   - Crear Upkeep para sorteos automáticos cada 24h
   - Usar función `checkUpkeep` del contrato

3. **Configurar Frontend**:
   - Actualizar addresses de contratos
   - Importar ABIs generados

## 🔧 Funciones Principales

### Para Usuarios

```solidity
// Comprar ticket con ETH
function buyTicketWithETH(uint256[4] memory emojis) external payable

// Comprar ticket con USDC  
function buyTicketWithUSDC(uint256[4] memory emojis) external

// Ver información de ronda actual
function getCurrentRoundInfo() external view

// Ver precios
function getETHAmountForTicket() external view
```

### Para Administración

```solidity
// Sorteo manual de emergencia
function manualDraw(uint256 roundId) external

// Completar ronda sin VRF (emergencia)
function emergencyCompleteRound(uint256 roundId, uint256[4] memory winningNumbers) external
```

## 📊 Eventos Importantes

```solidity
// Nueva ronda iniciada
event RoundStarted(uint256 indexed roundId, uint256 startTime, uint256 endTime)

// Ticket comprado
event TicketPurchased(uint256 indexed roundId, address indexed player, uint256 ticketId)

// Números sorteados
event NumbersDrawn(uint256 indexed roundId, uint256[4] winningNumbers)

// Premios distribuidos
event PrizesDistributed(uint256 indexed roundId, uint256 totalWinners)

// Reserva utilizada
event ReserveUsed(uint256 indexed roundId, string prizeType, uint256 ethReserveUsed, uint256 usdcReserveUsed)
```

## 🛡️ Seguridad

### ✅ Características de Seguridad

- **ReentrancyGuard**: Protección contra ataques de reentrada
- **AccessControl**: Roles granulares para diferentes funciones
- **Soulbound NFTs**: Tickets no transferibles
- **Expiración automática**: Tickets válidos solo 24h
- **VRF seguro**: Aleatoriedad verificable via Chainlink
- **Pools separadas**: ETH y USDC manejados independientemente

### ⚠️ Consideraciones

- Los tickets expiran automáticamente después de 24h
- Los premios se distribuyen automáticamente al finalizar cada ronda
- Las pools de reserva garantizan que siempre hay premios disponibles
- El contrato principal tiene funciones de emergencia solo para admin

## 📞 Soporte

Para problemas o preguntas:
- Revisar logs de Chainlink Automation y VRF
- Verificar balances LINK en subscriptions
- Comprobar gas limits y configuraciones de red 