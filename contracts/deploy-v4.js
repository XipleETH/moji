const hre = require("hardhat");

async function main() {
  // Contract config
  const DRAW_HOUR_UTC = 2; // 2:00 UTC daily draw
  const TICKET_PRICE = ethers.parseUnits("0.2", 6); // 0.2 USDC (6 decimals)
  const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65"; // Fuji USDC
  const VRF_COORDINATOR = "0x2eD832Ba664535e5886b75D64C46EB9a228C2610"; // Fuji
  const KEY_HASH = "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61"; // Fuji
  const SUB_ID = "115219711696345395920320818068130094129726319678991844124002335643645462793035";

  console.log("Deploying LottoMojiCoreV4...");
  
  const LottoMojiCore = await hre.ethers.getContractFactory("LottoMojiCoreV4");
  const contract = await LottoMojiCore.deploy(
    DRAW_HOUR_UTC,
    USDC_ADDRESS,
    TICKET_PRICE,
    VRF_COORDINATOR,
    KEY_HASH,
    SUB_ID
  );

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`LottoMojiCoreV4 deployed to: ${address}`);
  console.log("\nContract configuration:");
  console.log(`- Draw hour (UTC): ${DRAW_HOUR_UTC}:00`);
  console.log(`- Ticket price: 0.2 USDC`);
  console.log(`- USDC address: ${USDC_ADDRESS}`);
  console.log(`- VRF Coordinator: ${VRF_COORDINATOR}`);
  console.log(`- VRF Key Hash: ${KEY_HASH}`);
  console.log(`- VRF Subscription ID: ${SUB_ID}`);
  
  console.log("\nVerification command:");
  console.log(`npx hardhat verify --network fuji ${address} "${DRAW_HOUR_UTC}" "${USDC_ADDRESS}" "${TICKET_PRICE}" "${VRF_COORDINATOR}" "${KEY_HASH}" "${SUB_ID}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 