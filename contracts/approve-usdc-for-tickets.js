const { ethers } = require("hardhat");

async function main() {
    console.log(" APROVANDO USDC PARA COMPRA DE 100 TICKETS");
    console.log("=" + "=".repeat(45));
    
    const CONTRACT_ADDRESS = "0x900ebdF6C0807E4d3007e07009BDeDFc5E63fbB1";
    const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
    const AMOUNT_TO_APPROVE = ethers.parseUnits("25", 6); // 25 USDC (por seguridad)
    
    const [deployer] = await ethers.getSigners();
    console.log(" Cuenta:", deployer.address);
    console.log(" Contrato LottoMoji:", CONTRACT_ADDRESS);
    console.log(" USDC Address:", USDC_ADDRESS);
    console.log(" Cantidad a aprobar:", ethers.formatUnits(AMOUNT_TO_APPROVE, 6), "USDC");
    
    // Conectar con contrato USDC
    const usdcABI = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address account) view returns (uint256)"
    ];
    
    const usdc = new ethers.Contract(USDC_ADDRESS, usdcABI, deployer);
    
    // Verificar balance
    console.log(" VERIFICANDO BALANCE Y ALLOWANCE...");
    const balance = await usdc.balanceOf(deployer.address);
    const currentAllowance = await usdc.allowance(deployer.address, CONTRACT_ADDRESS);
    
    console.log(" Balance USDC:", ethers.formatUnits(balance, 6), "USDC");
    console.log(" Allowance actual:", ethers.formatUnits(currentAllowance, 6), "USDC");
    
    if (balance < AMOUNT_TO_APPROVE) {
        console.log(" ERROR: Balance insuficiente de USDC");
        console.log(" Necesitas al menos 25 USDC para comprar 100 tickets");
        return;
    }
    
    if (currentAllowance >= ethers.parseUnits("20", 6)) {
        console.log(" Ya tienes suficiente allowance para 100 tickets");
        console.log(" Puedes proceder a comprar tickets");
        return;
    }
    
    // Aprobar gasto
    console.log(" APROBANDO GASTO DE USDC...");
    const approveTx = await usdc.approve(CONTRACT_ADDRESS, AMOUNT_TO_APPROVE);
    console.log(" Transaction hash:", approveTx.hash);
    
    console.log(" Esperando confirmación...");
    await approveTx.wait();
    
    // Verificar nueva allowance
    const newAllowance = await usdc.allowance(deployer.address, CONTRACT_ADDRESS);
    console.log(" Nueva allowance:", ethers.formatUnits(newAllowance, 6), "USDC");
    
    console.log("");
    console.log(" APROBACIÓN COMPLETADA");
    console.log(" Puedes comprar hasta", Math.floor(Number(ethers.formatUnits(newAllowance, 6)) / 0.2), "tickets");
    console.log(" Listo para comprar 100 tickets");
}

main().catch(console.error);
