const hre = require("hardhat");

async function main() {
  const SUBSCRIPTION_ID = "115219711696345395920320818068130094129726319678991844124002335643645462793035";
  const CONSUMER_ADDRESS = "0xb0565a978766e7E3d4D5264f5480Ca50E93c51bc"; // V4 contract
  const VRF_COORDINATOR = "0x2eD832Ba664535e5886b75D64C46EB9a228C2610"; // Fuji

  console.log(`Adding consumer ${CONSUMER_ADDRESS} to VRF subscription ${SUBSCRIPTION_ID}...`);

  const coordinator = await hre.ethers.getContractAt(
    "VRFCoordinatorV2Interface",
    VRF_COORDINATOR
  );

  const tx = await coordinator.addConsumer(SUBSCRIPTION_ID, CONSUMER_ADDRESS);
  await tx.wait();

  console.log("Consumer added successfully!");
  console.log(`Transaction hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 