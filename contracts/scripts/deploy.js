const { ethers } = require("hardhat");

// Direcciones de contratos en Base
const BASE_CONTRACTS = {
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet
  ETH_USD_FEED: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // Chainlink ETH/USD Base
  VRF_COORDINATOR: "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634", // Base VRF Coordinator
  VRF_KEY_HASH: "0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899", // Base VRF Key Hash
};

// Direcciones para testnet (Base Sepolia)
const BASE_SEPOLIA_CONTRACTS = {
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  ETH_USD_FEED: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1", // Chainlink ETH/USD Base Sepolia
  VRF_COORDINATOR: "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE", // Base Sepolia VRF
  VRF_KEY_HASH: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae", // Base Sepolia Key Hash
};

async function main() {
  console.log("🚀 Iniciando deployment de LottoMoji Contracts...");
  
  // Obtener deployer
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployando con la cuenta:", deployer.address);
  
  // Obtener balance usando provider
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance de la cuenta:", ethers.formatEther(balance), "ETH");
  
  // Seleccionar contratos según la red
  const network = await ethers.provider.getNetwork();
  const isTestnet = network.chainId === 84532n; // Base Sepolia
  const contracts = isTestnet ? BASE_SEPOLIA_CONTRACTS : BASE_CONTRACTS;
  
  console.log(`🌐 Red detectada: ${isTestnet ? 'Base Sepolia (Testnet)' : 'Base Mainnet'}`);
  console.log(`📋 Chain ID: ${network.chainId}`);
  
  // 1. Deploy Prize Pool Contract
  console.log("\n📦 1. Deployando LottoMojiPrizePool...");
  const PrizePool = await ethers.getContractFactory("LottoMojiPrizePool");
  
  // Placeholder para lottery contract (se actualizará después)
  const tempLotteryAddress = "0x0000000000000000000000000000000000000001";
  
  const prizePool = await PrizePool.deploy(
    contracts.USDC,
    contracts.ETH_USD_FEED,
    deployer.address, // Dev wallet
    tempLotteryAddress // Placeholder
  );
  
  await prizePool.waitForDeployment();
  const prizePoolAddress = await prizePool.getAddress();
  console.log("✅ LottoMojiPrizePool deployed to:", prizePoolAddress);
  
  // 2. Deploy Tickets Contract
  console.log("\n📦 2. Deployando LottoMojiTickets...");
  const Tickets = await ethers.getContractFactory("LottoMojiTickets");
  
  const tickets = await Tickets.deploy(tempLotteryAddress); // Placeholder
  await tickets.waitForDeployment();
  const ticketsAddress = await tickets.getAddress();
  console.log("✅ LottoMojiTickets deployed to:", ticketsAddress);
  
  // 3. Deploy Core Lottery Contract
  console.log("\n📦 3. Deployando LottoMojiCore...");
  const LotteryCore = await ethers.getContractFactory("LottoMojiCore");
  
  // Para testnet, necesitarás crear una subscripción VRF manualmente
  const vrfSubscriptionId = process.env.VRF_SUBSCRIPTION_ID || "1"; // Placeholder
  
  const lotteryCore = await LotteryCore.deploy(
    contracts.VRF_COORDINATOR,
    vrfSubscriptionId,
    contracts.VRF_KEY_HASH,
    ticketsAddress,
    prizePoolAddress
  );
  
  await lotteryCore.waitForDeployment();
  const lotteryAddress = await lotteryCore.getAddress();
  console.log("✅ LottoMojiCore deployed to:", lotteryAddress);
  
  // 4. Configurar permisos y conexiones
  console.log("\n🔧 4. Configurando permisos y conexiones...");
  
  // Otorgar rol LOTTERY_ROLE al contrato principal en PrizePool
  console.log("   - Otorgando LOTTERY_ROLE a LottoMojiCore en PrizePool...");
  const LOTTERY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LOTTERY_ROLE"));
  await prizePool.grantRole(LOTTERY_ROLE, lotteryAddress);
  
  // Otorgar roles en Tickets
  console.log("   - Otorgando roles a LottoMojiCore en Tickets...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await tickets.grantRole(LOTTERY_ROLE, lotteryAddress);
  await tickets.grantRole(MINTER_ROLE, lotteryAddress);
  
  // 5. Verificar configuración
  console.log("\n✅ 5. Verificando configuración...");
  
  // Verificar que los contratos están conectados correctamente
  const connectedTickets = await lotteryCore.ticketContract();
  const connectedPrizePool = await lotteryCore.prizePoolContract();
  
  console.log("   - Tickets conectados:", connectedTickets === ticketsAddress ? "✅" : "❌");
  console.log("   - PrizePool conectado:", connectedPrizePool === prizePoolAddress ? "✅" : "❌");
  
  // Obtener información de la primera ronda
  const roundInfo = await lotteryCore.getCurrentRoundInfo();
  console.log("   - Primera ronda creada:", roundInfo[0] > 0 ? "✅" : "❌");
  console.log("   - Round ID:", roundInfo[0].toString());
  
  // 6. Mostrar resumen
  console.log("\n🎉 ¡DEPLOYMENT COMPLETADO! 🎉");
  console.log("=" .repeat(50));
  console.log("📋 DIRECCIONES DE CONTRATOS:");
  console.log("=" .repeat(50));
  console.log(`🏆 LottoMojiCore:     ${lotteryAddress}`);
  console.log(`🎫 LottoMojiTickets:  ${ticketsAddress}`);
  console.log(`💰 LottoMojiPrizePool: ${prizePoolAddress}`);
  console.log("=" .repeat(50));
  
  // 7. Guardar direcciones en archivo
  const deploymentInfo = {
    network: isTestnet ? "base-sepolia" : "base-mainnet",
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      LottoMojiCore: lotteryAddress,
      LottoMojiTickets: ticketsAddress,
      LottoMojiPrizePool: prizePoolAddress
    },
    externalContracts: contracts,
    vrfSubscriptionId: vrfSubscriptionId
  };
  
  const fs = require('fs');
  const deploymentFile = `deployment-${isTestnet ? 'testnet' : 'mainnet'}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Información guardada en: ${deploymentFile}`);
  
  // 8. Instrucciones post-deployment
  console.log("\n📋 PRÓXIMOS PASOS:");
  console.log("=" .repeat(50));
  console.log("1. 🔗 Configurar Chainlink VRF subscription:");
  console.log(`   - Ve a https://vrf.chain.link/`);
  console.log(`   - Agrega el contrato ${lotteryAddress} como consumer`);
  console.log(`   - Asegúrate de tener LINK suficiente en la subscription`);
  
  console.log("\n2. 🤖 Configurar Chainlink Automation:");
  console.log(`   - Ve a https://automation.chain.link/`);
  console.log(`   - Crea un nuevo Upkeep con el contrato ${lotteryAddress}`);
  console.log(`   - Configura para que se ejecute cada 24 horas`);
  
  console.log("\n3. ✅ Verificar contratos:");
  console.log(`   - npx hardhat verify ${lotteryAddress} --network ${isTestnet ? 'base-sepolia' : 'base-mainnet'}`);
  console.log(`   - npx hardhat verify ${ticketsAddress} --network ${isTestnet ? 'base-sepolia' : 'base-mainnet'}`);
  console.log(`   - npx hardhat verify ${prizePoolAddress} --network ${isTestnet ? 'base-sepolia' : 'base-mainnet'}`);
  
  console.log("\n4. 🌐 Integrar con frontend:");
  console.log(`   - Actualizar addresses en src/contracts/addresses.js`);
  console.log(`   - Importar ABIs generados en artifacts/`);
  
  if (isTestnet) {
    console.log("\n⚠️  TESTNET: Necesitarás tokens de prueba:");
    console.log("   - ETH: https://www.alchemy.com/faucets/base-sepolia");
    console.log("   - USDC: Usar faucet del contrato USDC en testnet");
    console.log("   - LINK: https://faucets.chain.link/base-sepolia");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error durante el deployment:", error);
    process.exit(1);
  }); 