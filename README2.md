# 🎰 LottoMoji - Crypto Emoji Lottery on Base Sepolia [LEGACY - SPANISH]

> **🚨 AVISO DE DESARROLLO** 
> 
> **Rama Main**: Congelada para revisión de **Chainlink Chromion Hackathon**
> 
> **Desarrollo Activo**: Continúa en la rama `post-chromion`
> 
> ```bash
> # Cambiar a rama de desarrollo activo
> git checkout post-chromion
> ```

⚠️ **NOTA**: Este archivo está archivado. Consulta README.md para la documentación actual en inglés.

Una aplicación completa de lotería de emojis blockchain con sistema automático de reservas en Base Sepolia testnet.

## 🌟 Características Principales

### 🎮 Sistema de Juego
- **25 emojis temáticos crypto/gambling**: 💰💎🚀🎰🎲🃏💸🏆🎯🔥⚡🌙⭐💫🎪🎨🦄🌈🍀🎭🎢🎮🏅🎊🎈
- **4 emojis por ticket**: Selección de 4 emojis de los 25 disponibles
- **Precio fijo**: 2 USDC por ticket
- **Sorteos automáticos**: Cada 24 horas a las 3:00 AM São Paulo (UTC-3)

### 🏆 Sistema de Premios
- **Primer premio (80%)**: 4 exactos en orden
- **Segundo premio (10%)**: 4 exactos en cualquier orden  
- **Tercer premio (5%)**: 3 exactos en orden
- **Ticket gratis**: 3 exactos en cualquier orden
- **Desarrollo (5%)**: Para mantenimiento del sistema

### 🏦 Nuevo Sistema de Reservas Mejorado
- **Reservas diarias**: 20% de cada pool va SIEMPRE a reservas antes del sorteo
- **Pools principales**: 80% se acumula cuando no hay ganadores
- **Reserve Pool 1**: Acumula 20% del primer premio TODOS LOS DÍAS
- **Reserve Pool 2**: Acumula 20% del segundo premio TODOS LOS DÍAS
- **Reserve Pool 3**: Acumula 20% del tercer premio TODOS LOS DÍAS
- **Recarga automática**: Las reservas recargan pools principales cuando es necesario
- **Doble crecimiento**: Pools principales y reservas crecen simultáneamente

### ⚡ Automatización Completa
- **Chainlink VRF v2.5**: Números aleatorios verificables
- **Chainlink Automation**: Sorteos automáticos cada 24 horas
- **Gestión automática de reservas**: Sin intervención manual
- **Eventos en tiempo real**: Updates automáticos del frontend

### 🎨 Frontend Avanzado
- **Next.js 14 + TypeScript**: Framework moderno y tipado
- **Tailwind CSS**: Estilos crypto-themed con animaciones
- **Coinbase Wallet**: Conexión exclusiva con Coinbase Wallet
- **Tiempo real**: Updates automáticos de pools y reservas
- **NFT Tickets**: Tickets como NFTs con metadata crypto

## 🚀 Deployment Completo

### 1. Configuración Inicial

```bash
# Clonar el repositorio
git clone <repository-url>
cd lotto-moji-blockchain

# Instalar dependencias
npm install

# Copiar variables de entorno
cp env.example .env.local
```

### 2. Configurar Variables de Entorno

Edita `.env.local` con tus valores:

```env
# Blockchain
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Claves privadas (para deployment)
PRIVATE_KEY=tu_clave_privada_aqui
BASESCAN_API_KEY=tu_api_key_basescan

# Chainlink
VRF_COORDINATOR=0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
KEY_HASH=0x8077df514608a09f83e4e8d300645594e5d7cd9f1e39beb9b8ebb88c6f4bb2e4
SUBSCRIPTION_ID=tu_subscription_id_chainlink

# Firebase
FIREBASE_PROJECT_ID=lottomoji-blockchain
FIREBASE_API_KEY=tu_firebase_api_key

# Coinbase Wallet - Conexión directa con extensión del navegador
# No se necesita configuración adicional
```

### 3. Deployment de Contratos

```bash
# Compilar contratos
npm run compile

# Hacer deploy en Base Sepolia
npm run deploy:contracts

# Configurar Chainlink
npm run setup:chainlink

# Configurar sistema de reservas
npm run setup:reserves

# Verificar contratos en Basescan
npm run verify:contracts
```

### 4. Configurar Chainlink

1. **VRF Subscription**:
   - Ir a [vrf.chain.link](https://vrf.chain.link)
   - Crear nueva subscription
   - Fondear con LINK tokens
   - Agregar el contrato `LottoMojiRandom` como consumer

2. **Automation**:
   - Ir a [automation.chain.link](https://automation.chain.link)
   - Crear nuevo Upkeep
   - Configurar el contrato `LottoMojiAutomation`
   - Fondear con LINK tokens

### 5. Deployment del Frontend

```bash
# Build del proyecto
npm run build

# Deploy en Vercel
npm run deploy:vercel
```

### 6. Configurar Firebase Functions

```bash
# Deploy Firebase Functions
npm run deploy:firebase
```

## 🔧 Configuración Avanzada

### Chainlink Automation
El sistema ejecuta automáticamente:
- Sorteos cada 24 horas
- Gestión de reservas
- Procesamiento de ganadores
- Mantenimiento del sistema

### Nuevo Sistema de Reservas
```solidity
// TODOS LOS DÍAS (antes del sorteo):
80% va a pools principales
20% va SIEMPRE a las reservas correspondientes

// Pools principales:
- Cuando NO hay ganadores: Se acumulan completamente
- Cuando SÍ hay ganadores: Pagan el premio

// Reservas (crecimiento continuo):
- Reciben 20% diariamente sin excepción
- Se usan para recargar pools principales si es necesario
- NO se resetean - crecen independientemente
- Garantizan liquidez permanente
```

### Integración USDC
- **Red**: Base Sepolia testnet
- **Contrato**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Decimales**: 6
- **Precio por ticket**: 2 USDC

## 🎮 Uso de la Aplicación

### Para Usuarios

1. **Conectar Coinbase Wallet**
2. **Obtener USDC en Base Sepolia**
3. **Seleccionar 4 emojis crypto**
4. **Comprar ticket por 2 USDC**
5. **Esperar sorteo automático**
6. **Reclamar premios si ganas**

### Para Administradores

```bash
# Monitorear estado del sistema
npx hardhat run scripts/check-system-status.js

# Emergencia: pausar sistema
npx hardhat run scripts/emergency-pause.js

# Verificar reservas
npx hardhat run scripts/check-reserves.js
```

## 📊 Monitoreo y Analytics

### Métricas del Sistema
- Total de tickets vendidos
- Pools diarias históricas
- Estado de las 3 reservas
- Activaciones de reservas
- Ganadores y premios reclamados

### Dashboard de Reservas Mejorado
- **Reserve Pool 1**: Crecimiento diario del primer premio (20% diario)
- **Reserve Pool 2**: Crecimiento diario del segundo premio (20% diario)
- **Reserve Pool 3**: Crecimiento diario del tercer premio (20% diario)
- **Pools Principales**: Acumulación cuando no hay ganadores
- **Recargas automáticas**: Historial de reservas usadas para recargar pools
- **Métricas**: Eficiencia de reservas y cobertura de liquidez

## 🔍 Verificación del Sistema

### Smart Contracts
Todos los contratos están verificados en Basescan:
- `LottoMojiMain`: Contrato principal de lotería
- `LottoMojiReserves`: Gestión automática de reservas
- `LottoMojiTickets`: NFTs de tickets
- `LottoMojiRandom`: Chainlink VRF para aleatoriedad
- `LottoMojiAutomation`: Chainlink Automation

### Auditoría de Reservas
```bash
# Verificar estado completo de reservas
npm run test:reserves

# Simular flujo de reservas
npm run test:reserve-flow

# Validar matemáticas del sistema
npm run validate:emojis
```

## 🛠️ Desarrollo Local

```bash
# Desarrollo frontend
npm run dev

# Testing de contratos
npm test

# Validación de emojis
npm run validate:emojis

# Compilación
npm run compile
```

## 🎯 Roadmap

### Fase 1 ✅
- [x] Sistema básico de lotería
- [x] Integración USDC
- [x] Chainlink VRF/Automation
- [x] Sistema de reservas automático

### Fase 2 🚧
- [ ] Mainnet deployment
- [ ] Mobile app
- [ ] Más redes blockchain
- [ ] Sistema de referidos

### Fase 3 📋
- [ ] DAO governance
- [ ] Staking de tokens
- [ ] NFT marketplace
- [ ] Cross-chain bridge

## 📱 Interfaces

### Web App
- **URL**: [lottomoji.vercel.app](https://lottomoji.vercel.app)
- **Wallet**: Coinbase Wallet exclusivamente
- **Red**: Base Sepolia testnet

### Smart Contracts
- **Explorador**: [sepolia.basescan.org](https://sepolia.basescan.org)
- **RPC**: `https://sepolia.base.org`
- **Chain ID**: `84532`

## 🔐 Seguridad

### Auditorías
- Contratos optimizados para gas
- ReentrancyGuard en funciones críticas
- Validación exhaustiva de inputs
- Emergency pause functionality

### Chainlink Integration
- VRF v2.5 para aleatoriedad verificable
- Automation para ejecución confiable
- Múltiples confirmaciones de red

## 🤝 Contribuir

1. Fork el repositorio
2. Crear branch feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

- **Email**: soporte@lottomoji.io
- **Discord**: [discord.gg/lottomoji](https://discord.gg/lottomoji)
- **Twitter**: [@LottoMoji](https://twitter.com/LottoMoji)
- **Documentación**: [docs.lottomoji.io](https://docs.lottomoji.io)

## 🎉 Agradecimientos

- **Chainlink**: Por VRF y Automation
- **Base**: Por la infraestructura L2
- **OpenZeppelin**: Por los contratos seguros
- **Next.js**: Por el framework increíble
- **Tailwind CSS**: Por los estilos hermosos

---

**¡Que tengas suerte con tus emojis crypto! 🚀💎💰** 