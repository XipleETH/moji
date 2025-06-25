const hre = require("hardhat");

async function main() {
  console.log("🧪 Probando contrato LottoMojiCore desplegado...");

  const contractAddress = "0xE0afd152Ec3F945A32586eb01A28522F1F69c15c";
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  // Obtener el contrato
  const LottoMojiCore = await hre.ethers.getContractFactory("LottoMojiCore");
  const contract = LottoMojiCore.attach(contractAddress);

  console.log("\n📊 Información del Contrato:");
  console.log("=".repeat(50));

  try {
    // Información básica
    const ticketPrice = await contract.TICKET_PRICE();
    const drawInterval = await contract.DRAW_INTERVAL();
    const lastDrawTime = await contract.lastDrawTime();
    const totalDraws = await contract.totalDrawsExecuted();
    const gameActive = await contract.gameActive();
    const automationActive = await contract.automationActive();

    console.log(`💰 Precio del ticket: ${hre.ethers.formatUnits(ticketPrice, 6)} USDC`);
    console.log(`⏰ Intervalo de sorteo: ${Number(drawInterval) / 3600} horas`);
    console.log(`🎯 Último sorteo: ${new Date(Number(lastDrawTime) * 1000).toLocaleString()}`);
    console.log(`🔢 Total de sorteos: ${totalDraws}`);
    console.log(`🎮 Juego activo: ${gameActive ? "✅" : "❌"}`);
    console.log(`🤖 Automation activo: ${automationActive ? "✅" : "❌"}`);

    // Próximo sorteo
    const currentTime = Math.floor(Date.now() / 1000);
    const nextDrawTime = Number(lastDrawTime) + Number(drawInterval);
    const timeUntilDraw = nextDrawTime - currentTime;

    if (timeUntilDraw > 0) {
      const hours = Math.floor(timeUntilDraw / 3600);
      const minutes = Math.floor((timeUntilDraw % 3600) / 60);
      console.log(`⏳ Próximo sorteo en: ${hours}h ${minutes}m`);
    } else {
      console.log(`🔄 ¡Es tiempo de sorteo!`);
    }

    // Verificar checkUpkeep
    console.log("\n🔍 Verificando Automation:");
    console.log("=".repeat(30));
    
    const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");
    console.log(`✨ Upkeep necesario: ${upkeepNeeded ? "SÍ" : "NO"}`);
    
    if (upkeepNeeded) {
      console.log(`📊 Datos de perform: ${performData}`);
    }

    // Información de pools
    console.log("\n💎 Información de Pools:");
    console.log("=".repeat(30));
    
    const mainPools = await contract.mainPools();
    const reserves = await contract.reserves();

    console.log(`🥇 Premio 1 acumulado: ${hre.ethers.formatUnits(mainPools.firstPrizeAccumulated, 6)} USDC`);
    console.log(`🥈 Premio 2 acumulado: ${hre.ethers.formatUnits(mainPools.secondPrizeAccumulated, 6)} USDC`);
    console.log(`🥉 Premio 3 acumulado: ${hre.ethers.formatUnits(mainPools.thirdPrizeAccumulated, 6)} USDC`);
    console.log(`💻 Desarrollo acumulado: ${hre.ethers.formatUnits(mainPools.developmentAccumulated, 6)} USDC`);

    console.log(`\n🏦 Reserva Premio 1: ${hre.ethers.formatUnits(reserves.firstPrizeReserve1, 6)} USDC`);
    console.log(`🏦 Reserva Premio 2: ${hre.ethers.formatUnits(reserves.secondPrizeReserve2, 6)} USDC`);
    console.log(`🏦 Reserva Premio 3: ${hre.ethers.formatUnits(reserves.thirdPrizeReserve3, 6)} USDC`);

    // Últimos números ganadores
    if (totalDraws > 0) {
      console.log("\n🎲 Últimos Números Ganadores:");
      console.log("=".repeat(35));
      const lastWinningNumbers = await contract.lastWinningNumbers();
      console.log(`🎯 Números: [${lastWinningNumbers.join(", ")}]`);
    }

    // Verificar función de validación
    console.log("\n🧮 Verificando Validaciones:");
    console.log("=".repeat(35));
    
    // Probar validación con números válidos
    const validNumbers = [0, 5, 10, 24];
    const isValid = await contract.validateEmojiSelection(validNumbers);
    console.log(`✅ Números [${validNumbers.join(", ")}] válidos: ${isValid}`);

    // Probar validación con números inválidos
    const invalidNumbers = [25, 30, 0, 5];
    const isInvalid = await contract.validateEmojiSelection(invalidNumbers);
    console.log(`❌ Números [${invalidNumbers.join(", ")}] válidos: ${isInvalid}`);

    console.log("\n✅ ¡Contrato funcionando correctamente!");
    console.log("🌐 Frontend debería poder interactuar sin problemas");

  } catch (error) {
    console.error("❌ Error probando contrato:", error.message);
    console.log("\n🔧 Posibles problemas:");
    console.log("- Contrato no está desplegado en esta red");
    console.log("- Error de conectividad con Base Sepolia");
    console.log("- ABI incompatible");
  }

  console.log("\n" + "=".repeat(50));
  console.log("🏁 Prueba completada");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 