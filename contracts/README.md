# LottoMoji Core Contract

Un contrato de lotería integrado que utiliza Chainlink VRF 2.5 para generar números aleatorios verificables y Chainlink Automation 2.6 para automatizar los sorteos.

## Características

- **ERC721 NFT Tickets**: Cada ticket de lotería es un NFT único
- **Chainlink VRF 2.5**: Números aleatorios verificables y seguros
- **Chainlink Automation 2.6**: Sorteos automáticos cada 24 horas
- **Sistema de Emojis**: 25 emojis diferentes indexados (0-24)
- **Premios en USDC**: Pagos directos en stablecoin
- **Sorteos a medianoche**: Configurado para São Paulo (UTC-3)

## Tecnologías Utilizadas

- **Solidity ^0.8.20**
- **OpenZeppelin Contracts 5.0.1**
- **Chainlink Contracts 1.3.0**
- **Hardhat Framework**
- **Ethers.js 6.x**

## Configuración de Red

### Base Sepolia Testnet
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532
- **VRF Coordinator**: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
- **USDC Address**: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- **Key Hash**: 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71

## Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env
```

## Configuración

Edita el archivo `.env` con tus valores:

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=tu_clave_privada_aquí
BASESCAN_API_KEY=tu_api_key_de_basescan
VRF_SUBSCRIPTION_ID=tu_subscription_id_vrf
```

## Despliegue

### Red Local (Testing)
```bash
npx hardhat run scripts/deploy.js --network hardhat
```

### Base Sepolia Testnet
```bash
npx hardhat run scripts/deploy.js --network base-sepolia
```

## Configuración Post-Despliegue

### 1. Configurar VRF Subscription
1. Ve a [Chainlink VRF Subscription Manager](https://vrf.chain.link/)
2. Agrega tu contrato como consumer en tu suscripción
3. Asegúrate de tener suficiente LINK en la suscripción

### 2. Configurar Chainlink Automation
1. Ve a [Chainlink Automation](https://automation.chain.link/)
2. Registra un nuevo Upkeep personalizado
3. Usa la dirección de tu contrato
4. Configura con suficiente LINK para automatización

### 3. Verificar Contrato
```bash
npx hardhat verify --network base-sepolia DIRECCION_CONTRATO "0x036CbD53842c5426634e7929541eC2318f3dCF7e" "TU_SUBSCRIPTION_ID"
```

## Funciones Principales

### Para Usuarios
- `mint(uint8[4] emojis)`: Comprar un ticket de lotería
- `tokenURI(tokenId)`: Obtener metadata del ticket NFT
- `getTicketInfo(tokenId)`: Ver información completa del ticket

### Para Administrador (Owner)
- `transferOwnership(address)`: Transferir propiedad del contrato
- `checkUpkeep()`: Verificar si necesita mantenimiento automático
- `performUpkeep()`: Ejecutar mantenimiento automático

### Funciones de Vista
- `totalSupply()`: Total de tickets mintados
- `balanceOf(address)`: Tickets de una dirección
- `roundWinners(round)`: Números ganadores de una ronda
- `totalDrawsExecuted`: Total de sorteos ejecutados

## Parámetros de Configuración

```solidity
uint256 public constant TICKET_PRICE = 2 * 10**6; // 2 USDC
uint8 public constant EMOJI_COUNT = 25; // 0-24 emojis
uint256 public constant DRAW_INTERVAL = 24 hours; // Intervalo de sorteos
```

## Eventos

```solidity
event TicketMinted(address indexed player, uint256 indexed tokenId, uint8[4] emojis);
event DrawCompleted(uint256 indexed round, uint8[4] winningEmojis);
```

## Seguridad

- ✅ ReentrancyGuard en funciones críticas
- ✅ VRF verificable para aleatoriedad
- ✅ Automation para ejecución automática
- ✅ ERC721 estándar para NFTs
- ✅ Ownership para funciones administrativas

## Limitaciones Actuales

Esta es una versión simplificada del contrato para facilitar el despliegue. Las siguientes características serán agregadas en versiones futuras:

- Sistema completo de premios y distribución
- Validación avanzada de emojis
- Gestión de reservas
- Funciones de emergencia
- Metadata on-chain con Base64

## Testing

```bash
# Compilar contratos
npx hardhat compile

# Ejecutar tests (cuando estén disponibles)
npx hardhat test
```

## Estructura del Proyecto

```
contracts/
├── contracts/
│   └── LottoMojiCore.sol       # Contrato principal
├── scripts/
│   └── deploy.js               # Script de despliegue
├── hardhat.config.js           # Configuración de Hardhat
├── package.json                # Dependencias
└── README.md                   # Esta documentación
```

## Soporte

Para dudas o problemas:
1. Revisar la documentación de Chainlink VRF 2.5
2. Verificar configuración de red Base Sepolia
3. Comprobar balance de LINK en suscripciones

## Roadmap

- [ ] Sistema completo de premios
- [ ] Interfaz de administración
- [ ] Tests unitarios
- [ ] Documentación de API
- [ ] Auditoría de seguridad 