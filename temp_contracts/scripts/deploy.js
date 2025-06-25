const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Desplegando contrato con la cuenta:", deployer.address);

  // Constantes
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // USDC en Base Sepolia
  const VRF_SUBSCRIPTION_ID = BigInt(process.env.VRF_SUBSCRIPTION_ID);

  console.log("\nDesplegando LottoMojiCore...");
  const LottoMojiCore = await hre.ethers.getContractFactory("LottoMojiCore");
  const core = await LottoMojiCore.deploy(
    USDC_ADDRESS,
    VRF_SUBSCRIPTION_ID
  );
  await core.waitForDeployment();
  
  const coreAddress = await core.getAddress();
  console.log("✅ LottoMojiCore desplegado en:", coreAddress);

  console.log("\n✨ Deployment completado!");
  console.log("--------------------");
  console.log("📄 Dirección del contrato:", coreAddress);
  console.log("--------------------");

  // Verificar el contrato
  console.log("\nVerificando contrato en BaseScan...");
  try {
    await hre.run("verify:verify", {
      address: coreAddress,
      constructorArguments: [USDC_ADDRESS, VRF_SUBSCRIPTION_ID],
    });
    console.log("✅ Contrato verificado exitosamente");
  } catch (error) {
    console.log("❌ Error en la verificación:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 