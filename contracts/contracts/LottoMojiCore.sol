// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LottoMojiTickets.sol";
import "./LottoMojiPrizePool.sol";

/**
 * @title LottoMoji Core Contract
 * @dev Contrato principal que maneja la lógica de lotería, sorteos automáticos y VRF
 */
contract LottoMojiCore is 
    VRFConsumerBaseV2, 
    AutomationCompatibleInterface, 
    AccessControl, 
    ReentrancyGuard 
{
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // Chainlink VRF
    VRFCoordinatorV2Interface private immutable COORDINATOR;
    uint256 private immutable s_subscriptionId;
    bytes32 private immutable s_keyHash;
    uint32 private constant CALLBACK_GAS_LIMIT = 2500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    
    // Contratos conectados
    LottoMojiTickets public immutable ticketContract;
    LottoMojiPrizePool public immutable prizePoolContract;
    
    // Array de emojis disponibles (indices de 0 a 24)
    string[25] public EMOJIS = [
        unicode"🌟", unicode"🎈", unicode"🎨", unicode"🌈", unicode"🦄", 
        unicode"🍭", unicode"🎪", unicode"🎠", unicode"🎡", unicode"🎢",
        unicode"🌺", unicode"🦋", unicode"🐬", unicode"🌸", unicode"🍦", 
        unicode"🎵", unicode"🎯", unicode"🌴", unicode"🎩", unicode"🎭",
        unicode"🎁", unicode"🎮", unicode"🚀", unicode"🌍", unicode"🍀"
    ];
    
    // Estado de la lotería
    struct Round {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        uint256[4] winningNumbers;
        bool isActive;
        bool numbersDrawn;
        uint256 vrfRequestId;
        bool prizesDistributed;
    }
    
    mapping(uint256 => Round) public rounds;
    uint256 public currentRoundId;
    uint256 public lastDrawTime;
    uint256 public constant ROUND_DURATION = 24 hours; // 24 horas por ronda
    
    // VRF requests
    mapping(uint256 => uint256) public vrfRequestToRound;
    
    // Eventos
    event RoundStarted(uint256 indexed roundId, uint256 startTime, uint256 endTime);
    event TicketPurchased(uint256 indexed roundId, address indexed player, uint256 ticketId);
    event NumbersRequested(uint256 indexed roundId, uint256 vrfRequestId);
    event NumbersDrawn(uint256 indexed roundId, uint256[4] winningNumbers);
    event PrizesDistributed(uint256 indexed roundId, uint256 totalWinners);
    event RoundCompleted(uint256 indexed roundId);
    
    modifier onlyActiveRound() {
        require(rounds[currentRoundId].isActive, "No active round");
        _;
    }
    
    constructor(
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        address _ticketContract,
        address _prizePoolContract
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        s_subscriptionId = _subscriptionId;
        s_keyHash = _keyHash;
        
        ticketContract = LottoMojiTickets(_ticketContract);
        prizePoolContract = LottoMojiPrizePool(payable(_prizePoolContract));
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        
        // Iniciar primera ronda
        _startNewRound();
    }
    
    /**
     * @dev Comprar ticket con ETH
     */
    function buyTicketWithETH(uint256[4] memory emojis) 
        external 
        payable 
        onlyActiveRound 
        nonReentrant 
    {
        require(_validateEmojis(emojis), "Invalid emoji selection");
        require(block.timestamp < rounds[currentRoundId].endTime, "Round ended");
        
        // Crear hash del pago
        bytes32 paymentHash = keccak256(
            abi.encodePacked(msg.sender, currentRoundId, block.timestamp, msg.value)
        );
        
        // Procesar pago en prize pool
        prizePoolContract.processETHPayment{value: msg.value}(
            paymentHash, 
            msg.sender, 
            currentRoundId
        );
        
        // Mintear ticket NFT
        uint256 ticketId = ticketContract.mintTicket(
            msg.sender,
            emojis,
            currentRoundId,
            false,
            paymentHash
        );
        
        emit TicketPurchased(currentRoundId, msg.sender, ticketId);
    }
    
    /**
     * @dev Comprar ticket con USDC (requiere previa aprobación)
     */
    function buyTicketWithUSDC(uint256[4] memory emojis) 
        external 
        onlyActiveRound 
        nonReentrant 
    {
        require(_validateEmojis(emojis), "Invalid emoji selection");
        require(block.timestamp < rounds[currentRoundId].endTime, "Round ended");
        
        // Crear hash del pago
        bytes32 paymentHash = keccak256(
            abi.encodePacked(msg.sender, currentRoundId, block.timestamp, "USDC")
        );
        
        // Procesar pago en prize pool
        prizePoolContract.processUSDCPayment(
            paymentHash, 
            msg.sender, 
            currentRoundId
        );
        
        // Mintear ticket NFT
        uint256 ticketId = ticketContract.mintTicket(
            msg.sender,
            emojis,
            currentRoundId,
            false,
            paymentHash
        );
        
        emit TicketPurchased(currentRoundId, msg.sender, ticketId);
    }
    
    /**
     * @dev Chainlink Automation - Verificar si necesita ejecutar sorteo
     */
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        Round storage round = rounds[currentRoundId];
        
        // Necesita sorteo si:
        // 1. La ronda está activa
        // 2. Ha pasado el tiempo de finalización
        // 3. No se han sorteado números aún
        upkeepNeeded = round.isActive && 
                       block.timestamp >= round.endTime && 
                       !round.numbersDrawn;
        
        performData = abi.encode(currentRoundId);
    }
    
    /**
     * @dev Chainlink Automation - Ejecutar sorteo automático
     */
    function performUpkeep(bytes calldata performData) external override {
        uint256 roundId = abi.decode(performData, (uint256));
        require(roundId == currentRoundId, "Invalid round");
        require(rounds[roundId].isActive, "Round not active");
        require(block.timestamp >= rounds[roundId].endTime, "Round not ended");
        require(!rounds[roundId].numbersDrawn, "Numbers already drawn");
        
        _requestRandomNumbers(roundId);
    }
    
    /**
     * @dev Solicitar números aleatorios a Chainlink VRF
     */
    function _requestRandomNumbers(uint256 roundId) internal {
        uint256 requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            uint64(s_subscriptionId),
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );
        
        rounds[roundId].vrfRequestId = requestId;
        vrfRequestToRound[requestId] = roundId;
        
        emit NumbersRequested(roundId, requestId);
    }
    
    /**
     * @dev Callback de Chainlink VRF con números aleatorios
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 roundId = vrfRequestToRound[requestId];
        require(roundId > 0, "Invalid request");
        
        // Generar 4 números aleatorios de 0-24 (indices de emojis)
        uint256[4] memory winningNumbers;
        uint256 randomValue = randomWords[0];
        
        for (uint256 i = 0; i < 4; i++) {
            winningNumbers[i] = (randomValue >> (i * 8)) % 25;
        }
        
        rounds[roundId].winningNumbers = winningNumbers;
        rounds[roundId].numbersDrawn = true;
        
        emit NumbersDrawn(roundId, winningNumbers);
        
        // Procesar ganadores y distribuir premios
        _processWinners(roundId);
    }
    
    /**
     * @dev Procesar ganadores y distribuir premios
     */
    function _processWinners(uint256 roundId) internal {
        uint256[] memory validTickets = ticketContract.getRoundValidTickets(roundId);
        uint256[4] memory winningNumbers = rounds[roundId].winningNumbers;
        
        // Arrays para ganadores por categoría
        uint256[] memory firstPrizeTickets = new uint256[](validTickets.length);
        uint256[] memory secondPrizeTickets = new uint256[](validTickets.length);
        uint256[] memory thirdPrizeTickets = new uint256[](validTickets.length);
        uint256[] memory freePrizeTickets = new uint256[](validTickets.length);
        
        uint256 firstCount = 0;
        uint256 secondCount = 0;
        uint256 thirdCount = 0;
        uint256 freeCount = 0;
        
        // Verificar cada ticket
        for (uint256 i = 0; i < validTickets.length; i++) {
            uint256 ticketId = validTickets[i];
            (uint256[4] memory ticketEmojis,,,,,,,) = ticketContract.getTicketInfo(ticketId);
            
            (bool first, bool second, bool third, bool free) = _checkWin(ticketEmojis, winningNumbers);
            
            if (first) {
                firstPrizeTickets[firstCount++] = ticketId;
            } else if (second) {
                secondPrizeTickets[secondCount++] = ticketId;
            } else if (third) {
                thirdPrizeTickets[thirdCount++] = ticketId;
            } else if (free) {
                freePrizeTickets[freeCount++] = ticketId;
            }
        }
        
        // Distribuir premios usando el sistema pari-mutuel
        (
            uint256 ethPerFirst, uint256 ethPerSecond, uint256 ethPerThird,
            uint256 usdcPerFirst, uint256 usdcPerSecond, uint256 usdcPerThird
        ) = prizePoolContract.distributePrizes(roundId, firstCount, secondCount, thirdCount);
        
        // Procesar ganadores
        _processWinnerCategory(firstPrizeTickets, firstCount, ethPerFirst, usdcPerFirst);
        _processWinnerCategory(secondPrizeTickets, secondCount, ethPerSecond, usdcPerSecond);
        _processWinnerCategory(thirdPrizeTickets, thirdCount, ethPerThird, usdcPerThird);
        _processFreeTickets(freePrizeTickets, freeCount, roundId);
        
        rounds[roundId].prizesDistributed = true;
        rounds[roundId].isActive = false;
        
        emit PrizesDistributed(roundId, firstCount + secondCount + thirdCount + freeCount);
        emit RoundCompleted(roundId);
        
        // Iniciar nueva ronda
        _startNewRound();
    }
    
    /**
     * @dev Procesar ganadores de una categoría
     */
    function _processWinnerCategory(
        uint256[] memory tickets,
        uint256 count,
        uint256 ethPerWinner,
        uint256 usdcPerWinner
    ) internal {
        for (uint256 i = 0; i < count; i++) {
            uint256 ticketId = tickets[i];
            
            // Marcar ticket como usado
            ticketContract.useTicket(ticketId);
            
            // Obtener hash de pago para reclamar premio
            (,,,,,,, bytes32 paymentHash) = ticketContract.getTicketInfo(ticketId);
            
            // Transferir premio
            if (ethPerWinner > 0 || usdcPerWinner > 0) {
                prizePoolContract.claimPrize(paymentHash, ethPerWinner, usdcPerWinner);
            }
        }
    }
    
    /**
     * @dev Procesar tickets gratis
     */
    function _processFreeTickets(uint256[] memory tickets, uint256 count, uint256 roundId) internal {
        for (uint256 i = 0; i < count; i++) {
            uint256 ticketId = tickets[i];
            
            // Marcar ticket original como usado
            ticketContract.useTicket(ticketId);
            
            // Obtener dueño del ticket
            (,, address player,,,,,) = ticketContract.getTicketInfo(ticketId);
            
            // Generar ticket gratis para la próxima ronda (nueva ronda que se acaba de crear)
            uint256[4] memory freeEmojis = _generateRandomEmojis();
            uint256 newTicketId = ticketContract.mintTicket(
                player,
                freeEmojis,
                currentRoundId, // Nueva ronda (ya incrementada en _startNewRound)
                true, // Es ticket gratis
                bytes32(0) // Sin hash de pago
            );
            
            // Emitir evento de ticket gratis generado
            emit TicketPurchased(currentRoundId, player, newTicketId);
        }
    }
    
    /**
     * @dev Verificar si un ticket es ganador (lógica de Firebase)
     */
    function _checkWin(
        uint256[4] memory ticketNumbers,
        uint256[4] memory winningNumbers
    ) internal pure returns (bool first, bool second, bool third, bool free) {
        // Verificar coincidencias exactas (mismo emoji en la misma posición)
        uint256 exactMatches = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (ticketNumbers[i] == winningNumbers[i]) {
                exactMatches++;
            }
        }
        
        // Contar emojis que coinciden (cualquier posición)
        uint256 matchCount = 0;
        bool[4] memory used = [false, false, false, false];
        
        for (uint256 i = 0; i < 4; i++) {
            for (uint256 j = 0; j < 4; j++) {
                if (!used[j] && ticketNumbers[i] == winningNumbers[j]) {
                    matchCount++;
                    used[j] = true;
                    break;
                }
            }
        }
        
        // Determinar premio según lógica de Firebase
        first = exactMatches == 4;                    // 4 aciertos en orden exacto
        second = matchCount == 4 && exactMatches != 4; // 4 aciertos en cualquier orden
        third = exactMatches == 3;                     // 3 aciertos en orden exacto
        free = matchCount == 3 && exactMatches != 3;   // 3 aciertos en cualquier orden
    }
    
    /**
     * @dev Iniciar nueva ronda
     */
    function _startNewRound() internal {
        currentRoundId++;
        
        rounds[currentRoundId] = Round({
            id: currentRoundId,
            startTime: block.timestamp,
            endTime: block.timestamp + ROUND_DURATION,
            winningNumbers: [uint256(0), 0, 0, 0],
            isActive: true,
            numbersDrawn: false,
            vrfRequestId: 0,
            prizesDistributed: false
        });
        
        lastDrawTime = block.timestamp;
        
        emit RoundStarted(currentRoundId, block.timestamp, block.timestamp + ROUND_DURATION);
    }
    
    /**
     * @dev Validar selección de emojis
     */
    function _validateEmojis(uint256[4] memory emojis) internal pure returns (bool) {
        for (uint256 i = 0; i < 4; i++) {
            if (emojis[i] >= 25) return false; // Fuera de rango
        }
        return true;
    }
    
    /**
     * @dev Generar emojis aleatorios para tickets gratis
     */
    function _generateRandomEmojis() internal view returns (uint256[4] memory) {
        uint256[4] memory emojis;
        uint256 randomValue = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        
        for (uint256 i = 0; i < 4; i++) {
            emojis[i] = (randomValue >> (i * 8)) % 25;
        }
        
        return emojis;
    }
    
    /**
     * @dev Obtener información de la ronda actual
     */
    function getCurrentRoundInfo() external view returns (
        uint256 roundId,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        bool numbersDrawn,
        uint256[4] memory winningNumbers
    ) {
        Round storage round = rounds[currentRoundId];
        return (
            round.id,
            round.startTime,
            round.endTime,
            round.isActive,
            round.numbersDrawn,
            round.winningNumbers
        );
    }
    
    /**
     * @dev Obtener emoji por índice
     */
    function getEmoji(uint256 index) external view returns (string memory) {
        require(index < 25, "Index out of range");
        return EMOJIS[index];
    }
    
    /**
     * @dev Función manual de sorteo (solo para emergencias)
     */
    function manualDraw(uint256 roundId) external onlyRole(OPERATOR_ROLE) {
        require(rounds[roundId].isActive, "Round not active");
        require(block.timestamp >= rounds[roundId].endTime, "Round not ended");
        require(!rounds[roundId].numbersDrawn, "Numbers already drawn");
        
        _requestRandomNumbers(roundId);
    }
    
    /**
     * @dev Función de emergencia para completar ronda sin VRF
     */
    function emergencyCompleteRound(uint256 roundId, uint256[4] memory winningNumbers) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(rounds[roundId].isActive, "Round not active");
        require(!rounds[roundId].numbersDrawn, "Numbers already drawn");
        
        rounds[roundId].winningNumbers = winningNumbers;
        rounds[roundId].numbersDrawn = true;
        
        emit NumbersDrawn(roundId, winningNumbers);
        _processWinners(roundId);
    }
} 