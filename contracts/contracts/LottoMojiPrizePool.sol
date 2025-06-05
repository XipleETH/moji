// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title LottoMoji Prize Pool Contract
 * @dev Maneja el sistema de pagos, pools de premios y distribución pari-mutuel con reservas
 */
contract LottoMojiPrizePool is ReentrancyGuard, AccessControl {
    bytes32 public constant LOTTERY_ROLE = keccak256("LOTTERY_ROLE");
    bytes32 public constant DEV_ROLE = keccak256("DEV_ROLE");
    
    // Precio fijo del ticket en USD (con 6 decimales como USDC)
    uint256 public constant TICKET_PRICE_USD = 2_000_000; // $2.00 USD
    
    // Distribución de fondos (en porcentajes base 1000)
    uint256 public constant DEV_FEE = 50;           // 5%
    
    // Tercer premio: 5% total = 4% acumulable + 1% reserva
    uint256 public constant THIRD_POOL = 40;       // 4%
    uint256 public constant THIRD_RESERVE = 10;    // 1%
    
    // Segundo premio: 10% total = 8% acumulable + 2% reserva
    uint256 public constant SECOND_POOL = 80;      // 8%
    uint256 public constant SECOND_RESERVE = 20;   // 2%
    
    // Primer premio: 80% total = 64% acumulable + 16% reserva
    uint256 public constant FIRST_POOL = 640;      // 64%
    uint256 public constant FIRST_RESERVE = 160;   // 16%
    
    // Contratos y tokens
    IERC20 public immutable USDC;
    AggregatorV3Interface public immutable ETH_USD_FEED;
    address public immutable devWallet;
    
    // Pools de premios separadas por moneda (ETH y USDC)
    struct PrizePools {
        // Pools acumulables (se usan en cada sorteo)
        uint256 firstPrize;
        uint256 secondPrize;
        uint256 thirdPrize;
        
        // Pools de reserva (se activan cuando hay ganadores)
        uint256 firstReserve;
        uint256 secondReserve;
        uint256 thirdReserve;
    }
    
    PrizePools public ethPools;
    PrizePools public usdcPools;
    
    // Estructura de pago de tickets
    struct TicketPayment {
        address player;
        uint256 ethAmount;
        uint256 usdcAmount;
        uint256 roundId;
        bool prizesClaimed;
    }
    
    mapping(bytes32 => TicketPayment) public ticketPayments;
    mapping(uint256 => uint256) public roundTotalTickets;
    mapping(uint256 => uint256) public roundTotalETH;
    mapping(uint256 => uint256) public roundTotalUSDC;
    
    // Eventos
    event TicketPurchased(
        bytes32 indexed ticketHash,
        address indexed player,
        uint256 roundId,
        uint256 ethAmount,
        uint256 usdcAmount
    );
    
    event PrizesDistributed(
        uint256 indexed roundId,
        uint256 ethFirstPrize,
        uint256 ethSecondPrize,
        uint256 ethThirdPrize,
        uint256 usdcFirstPrize,
        uint256 usdcSecondPrize,
        uint256 usdcThirdPrize
    );
    
    event ReserveUsed(
        uint256 indexed roundId,
        string prizeType,
        uint256 ethReserveUsed,
        uint256 usdcReserveUsed
    );
    
    event PrizeClaimed(
        bytes32 indexed ticketHash,
        address indexed winner,
        uint256 ethAmount,
        uint256 usdcAmount
    );
    
    modifier onlyLottery() {
        require(hasRole(LOTTERY_ROLE, msg.sender), "Only lottery contract");
        _;
    }
    
    constructor(
        address _usdc,
        address _ethUsdFeed,
        address _devWallet,
        address _lotteryContract
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LOTTERY_ROLE, _lotteryContract);
        _grantRole(DEV_ROLE, _devWallet);
        
        USDC = IERC20(_usdc);
        ETH_USD_FEED = AggregatorV3Interface(_ethUsdFeed);
        devWallet = _devWallet;
    }
    
    /**
     * @dev Obtener precio actual de ETH en USD
     */
    function getETHPrice() public view returns (uint256) {
        (, int256 price, , , ) = ETH_USD_FEED.latestRoundData();
        require(price > 0, "Invalid ETH price");
        return uint256(price) / 100; // Convertir a 6 decimales
    }
    
    /**
     * @dev Calcular cuánto ETH se necesita para $2 USD
     */
    function getETHAmountForTicket() public view returns (uint256) {
        uint256 ethPrice = getETHPrice();
        return (TICKET_PRICE_USD * 1e18) / ethPrice;
    }
    
    /**
     * @dev Procesar pago de ticket con ETH
     */
    function processETHPayment(
        bytes32 ticketHash,
        address player,
        uint256 roundId
    ) external payable onlyLottery nonReentrant {
        uint256 requiredETH = getETHAmountForTicket();
        require(msg.value >= requiredETH, "Insufficient ETH");
        
        // Guardar información del pago
        ticketPayments[ticketHash] = TicketPayment({
            player: player,
            ethAmount: requiredETH,
            usdcAmount: 0,
            roundId: roundId,
            prizesClaimed: false
        });
        
        // Distribuir fondos según nueva lógica
        uint256 devFee = (requiredETH * DEV_FEE) / 1000;
        
        // Tercer premio: 4% acumulable + 1% reserva
        uint256 thirdPool = (requiredETH * THIRD_POOL) / 1000;
        uint256 thirdReserve = (requiredETH * THIRD_RESERVE) / 1000;
        
        // Segundo premio: 8% acumulable + 2% reserva
        uint256 secondPool = (requiredETH * SECOND_POOL) / 1000;
        uint256 secondReserve = (requiredETH * SECOND_RESERVE) / 1000;
        
        // Primer premio: 64% acumulable + 16% reserva
        uint256 firstPool = (requiredETH * FIRST_POOL) / 1000;
        uint256 firstReserve = (requiredETH * FIRST_RESERVE) / 1000;
        
        // Actualizar pools acumulables
        ethPools.thirdPrize += thirdPool;
        ethPools.secondPrize += secondPool;
        ethPools.firstPrize += firstPool;
        
        // Actualizar pools de reserva
        ethPools.thirdReserve += thirdReserve;
        ethPools.secondReserve += secondReserve;
        ethPools.firstReserve += firstReserve;
        
        // Transferir fee de desarrollo
        payable(devWallet).transfer(devFee);
        
        // Devolver exceso si lo hay
        if (msg.value > requiredETH) {
            payable(player).transfer(msg.value - requiredETH);
        }
        
        // Actualizar estadísticas de la ronda
        roundTotalTickets[roundId]++;
        roundTotalETH[roundId] += requiredETH;
        
        emit TicketPurchased(ticketHash, player, roundId, requiredETH, 0);
    }
    
    /**
     * @dev Procesar pago de ticket con USDC
     */
    function processUSDCPayment(
        bytes32 ticketHash,
        address player,
        uint256 roundId
    ) external onlyLottery nonReentrant {
        // Transferir USDC desde el contrato de lotería
        require(
            USDC.transferFrom(msg.sender, address(this), TICKET_PRICE_USD),
            "USDC transfer failed"
        );
        
        // Guardar información del pago
        ticketPayments[ticketHash] = TicketPayment({
            player: player,
            ethAmount: 0,
            usdcAmount: TICKET_PRICE_USD,
            roundId: roundId,
            prizesClaimed: false
        });
        
        // Distribuir fondos según nueva lógica
        uint256 devFee = (TICKET_PRICE_USD * DEV_FEE) / 1000;
        
        // Tercer premio: 4% acumulable + 1% reserva
        uint256 thirdPool = (TICKET_PRICE_USD * THIRD_POOL) / 1000;
        uint256 thirdReserve = (TICKET_PRICE_USD * THIRD_RESERVE) / 1000;
        
        // Segundo premio: 8% acumulable + 2% reserva
        uint256 secondPool = (TICKET_PRICE_USD * SECOND_POOL) / 1000;
        uint256 secondReserve = (TICKET_PRICE_USD * SECOND_RESERVE) / 1000;
        
        // Primer premio: 64% acumulable + 16% reserva
        uint256 firstPool = (TICKET_PRICE_USD * FIRST_POOL) / 1000;
        uint256 firstReserve = (TICKET_PRICE_USD * FIRST_RESERVE) / 1000;
        
        // Actualizar pools acumulables
        usdcPools.thirdPrize += thirdPool;
        usdcPools.secondPrize += secondPool;
        usdcPools.firstPrize += firstPool;
        
        // Actualizar pools de reserva
        usdcPools.thirdReserve += thirdReserve;
        usdcPools.secondReserve += secondReserve;
        usdcPools.firstReserve += firstReserve;
        
        // Transferir fee de desarrollo
        USDC.transfer(devWallet, devFee);
        
        // Actualizar estadísticas de la ronda
        roundTotalTickets[roundId]++;
        roundTotalUSDC[roundId] += TICKET_PRICE_USD;
        
        emit TicketPurchased(ticketHash, player, roundId, 0, TICKET_PRICE_USD);
    }
    
    /**
     * @dev Distribuir premios al final de una ronda (sistema pari-mutuel con reservas)
     */
    function distributePrizes(
        uint256 roundId,
        uint256 firstPrizeWinners,
        uint256 secondPrizeWinners,
        uint256 thirdPrizeWinners
    ) external onlyLottery returns (
        uint256 ethPerFirstWinner,
        uint256 ethPerSecondWinner,
        uint256 ethPerThirdWinner,
        uint256 usdcPerFirstWinner,
        uint256 usdcPerSecondWinner,
        uint256 usdcPerThirdWinner
    ) {
        // PRIMER PREMIO
        if (firstPrizeWinners > 0) {
            // Usar pool acumulable + reserva si es necesario
            uint256 totalETHFirst = ethPools.firstPrize + ethPools.firstReserve;
            uint256 totalUSDCFirst = usdcPools.firstPrize + usdcPools.firstReserve;
            
            ethPerFirstWinner = totalETHFirst / firstPrizeWinners;
            usdcPerFirstWinner = totalUSDCFirst / firstPrizeWinners;
            
            // Registrar uso de reserva si fue necesario
            if (ethPools.firstReserve > 0 || usdcPools.firstReserve > 0) {
                emit ReserveUsed(roundId, "first", ethPools.firstReserve, usdcPools.firstReserve);
            }
            
            // Resetear pools (acumulable y reserva)
            ethPools.firstPrize = 0;
            ethPools.firstReserve = 0;
            usdcPools.firstPrize = 0;
            usdcPools.firstReserve = 0;
        } else {
            // No hay ganadores: pool acumulable sigue creciendo, reserva se mantiene
            // No hacemos nada, los fondos se acumulan para el próximo sorteo
        }
        
        // SEGUNDO PREMIO
        if (secondPrizeWinners > 0) {
            // Usar pool acumulable + reserva si es necesario
            uint256 totalETHSecond = ethPools.secondPrize + ethPools.secondReserve;
            uint256 totalUSDCSecond = usdcPools.secondPrize + usdcPools.secondReserve;
            
            ethPerSecondWinner = totalETHSecond / secondPrizeWinners;
            usdcPerSecondWinner = totalUSDCSecond / secondPrizeWinners;
            
            // Registrar uso de reserva si fue necesario
            if (ethPools.secondReserve > 0 || usdcPools.secondReserve > 0) {
                emit ReserveUsed(roundId, "second", ethPools.secondReserve, usdcPools.secondReserve);
            }
            
            // Resetear pools (acumulable y reserva)
            ethPools.secondPrize = 0;
            ethPools.secondReserve = 0;
            usdcPools.secondPrize = 0;
            usdcPools.secondReserve = 0;
        }
        
        // TERCER PREMIO
        if (thirdPrizeWinners > 0) {
            // Usar pool acumulable + reserva si es necesario
            uint256 totalETHThird = ethPools.thirdPrize + ethPools.thirdReserve;
            uint256 totalUSDCThird = usdcPools.thirdPrize + usdcPools.thirdReserve;
            
            ethPerThirdWinner = totalETHThird / thirdPrizeWinners;
            usdcPerThirdWinner = totalUSDCThird / thirdPrizeWinners;
            
            // Registrar uso de reserva si fue necesario
            if (ethPools.thirdReserve > 0 || usdcPools.thirdReserve > 0) {
                emit ReserveUsed(roundId, "third", ethPools.thirdReserve, usdcPools.thirdReserve);
            }
            
            // Resetear pools (acumulable y reserva)
            ethPools.thirdPrize = 0;
            ethPools.thirdReserve = 0;
            usdcPools.thirdPrize = 0;
            usdcPools.thirdReserve = 0;
        }
        
        emit PrizesDistributed(
            roundId,
            ethPerFirstWinner,
            ethPerSecondWinner,
            ethPerThirdWinner,
            usdcPerFirstWinner,
            usdcPerSecondWinner,
            usdcPerThirdWinner
        );
    }
    
    /**
     * @dev Reclamar premio de un ticket ganador
     */
    function claimPrize(
        bytes32 ticketHash,
        uint256 ethAmount,
        uint256 usdcAmount
    ) external onlyLottery nonReentrant {
        TicketPayment storage payment = ticketPayments[ticketHash];
        require(payment.player != address(0), "Ticket not found");
        require(!payment.prizesClaimed, "Prize already claimed");
        
        payment.prizesClaimed = true;
        
        // Transferir premios
        if (ethAmount > 0) {
            payable(payment.player).transfer(ethAmount);
        }
        
        if (usdcAmount > 0) {
            USDC.transfer(payment.player, usdcAmount);
        }
        
        emit PrizeClaimed(ticketHash, payment.player, ethAmount, usdcAmount);
    }
    
    /**
     * @dev Obtener información de pools actuales (incluyendo reservas)
     */
    function getPoolsInfo() external view returns (
        PrizePools memory ethPoolsInfo,
        PrizePools memory usdcPoolsInfo
    ) {
        return (ethPools, usdcPools);
    }
    
    /**
     * @dev Obtener información detallada de pools
     */
    function getDetailedPoolsInfo() external view returns (
        uint256 ethFirstPrize,
        uint256 ethSecondPrize,
        uint256 ethThirdPrize,
        uint256 ethFirstReserve,
        uint256 ethSecondReserve,
        uint256 ethThirdReserve,
        uint256 usdcFirstPrize,
        uint256 usdcSecondPrize,
        uint256 usdcThirdPrize,
        uint256 usdcFirstReserve,
        uint256 usdcSecondReserve,
        uint256 usdcThirdReserve
    ) {
        return (
            ethPools.firstPrize,
            ethPools.secondPrize,
            ethPools.thirdPrize,
            ethPools.firstReserve,
            ethPools.secondReserve,
            ethPools.thirdReserve,
            usdcPools.firstPrize,
            usdcPools.secondPrize,
            usdcPools.thirdPrize,
            usdcPools.firstReserve,
            usdcPools.secondReserve,
            usdcPools.thirdReserve
        );
    }
    
    /**
     * @dev Verificar si un ticket está pagado
     */
    function isTicketPaid(bytes32 ticketHash) external view returns (bool) {
        return ticketPayments[ticketHash].player != address(0);
    }
    
    /**
     * @dev Obtener estadísticas de una ronda
     */
    function getRoundStats(uint256 roundId) external view returns (
        uint256 totalTickets,
        uint256 totalETH,
        uint256 totalUSDC
    ) {
        return (
            roundTotalTickets[roundId],
            roundTotalETH[roundId],
            roundTotalUSDC[roundId]
        );
    }
    
    /**
     * @dev Función de emergencia para retirar fondos
     */
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 ethBalance = address(this).balance;
        uint256 usdcBalance = USDC.balanceOf(address(this));
        
        if (ethBalance > 0) {
            payable(devWallet).transfer(ethBalance);
        }
        
        if (usdcBalance > 0) {
            USDC.transfer(devWallet, usdcBalance);
        }
    }
    
    // Función para recibir ETH
    receive() external payable {}
} 