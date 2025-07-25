const { ethers } = require("hardhat");

async function main() {
    console.log(" AGREGANDO NUEVO CONTRATO COMO VRF CONSUMER");
    console.log("=".repeat(50));
    
    const CONTRACT_ADDRESS = "0x599D73443e2fE18b03dfD8d28cad40af26C04155";
    const SUBSCRIPTION_ID = "101248313039346717932007347873879037803370624422039457111978592264303680124860";
    const VRF_COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    
    const [deployer] = await ethers.getSigners();
    console.log(" Cuenta:", deployer.address);
    
    const vrfCoordinatorABI = [
        "function addConsumer(uint256 subId, address consumer) external",
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)"
    ];
    
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, vrfCoordinatorABI, deployer);
    
    console.log(" Agregando consumer...");
    const addConsumerTx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, CONTRACT_ADDRESS);
    await addConsumerTx.wait();
    
    console.log(" Consumer agregado exitosamente!");
    console.log(" Contrato:", CONTRACT_ADDRESS);
    console.log(" Configurado para sorteos HORARIOS");
}

main().catch(console.error);
