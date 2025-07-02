const { ethers } = require('ethers');
require('dotenv').config();

// Configuración
const CONTRACT_ADDRESS = '0x250af59d8E4dd4bf541c7D4c3fBD9C0726C6d822';
const USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65'; // USDC en Fuji
const TICKET_PRICE = ethers.parseUnits("0.2", 6); // 0.2 USDC (6 decimales)
const NUM_TICKETS = 20;

// ABI mínimo necesario
const USDC_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)"
];

const LOTTOMOJI_ABI = [
    "function buyTicket(uint8[4] calldata emojiNumbers) external"
];

async function main() {
    try {
        // Conexión al proveedor y wallet
        const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log("🔌 Conectado a Avalanche Fuji");
        console.log("📍 Dirección de la wallet:", wallet.address);

        // Contratos
        const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
        const lottoContract = new ethers.Contract(CONTRACT_ADDRESS, LOTTOMOJI_ABI, wallet);

        // Aprobar USDC
        const totalAmount = TICKET_PRICE * BigInt(NUM_TICKETS);
        console.log(`\n💰 Aprobando ${ethers.formatUnits(totalAmount, 6)} USDC...`);
        const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, totalAmount);
        await approveTx.wait();
        console.log("✅ USDC aprobado!");

        // Comprar tickets
        console.log(`\n🎫 Comprando ${NUM_TICKETS} tickets...`);
        for(let i = 0; i < NUM_TICKETS; i++) {
            // Generar 4 números aleatorios entre 0-24
            const numbers = Array.from({length: 4}, () => Math.floor(Math.random() * 25));
            
            console.log(`Ticket ${i + 1}: Emojis ${numbers.join(", ")}`);
            const tx = await lottoContract.buyTicket(numbers);
            await tx.wait();
            console.log(`✅ Ticket ${i + 1} comprado!`);
        }

        console.log("\n🎉 ¡Todos los tickets comprados con éxito!");

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main(); 