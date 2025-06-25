// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title LottoMojiCore
 * @dev Core contract combining lottery, VRF, automation and NFT functionality
 * VERSION 3: Removed maintenance system, integrated reserve processing into draw flow
 */
contract LottoMojiCore is 
    VRFConsumerBaseV2Plus, 
    AutomationCompatibleInterface, 
    ReentrancyGuard, 
    ERC721,
    ERC721Enumerable
{
    using Strings for uint256;

    // VRF Configuration for Base Sepolia
    IVRFCoordinatorV2Plus private immutable i_vrfCoordinator;
    bytes32 constant KEY_HASH = 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71;
    uint32 constant CALLBACK_GAS_LIMIT = 2500000;
    uint16 constant REQUEST_CONFIRMATIONS = 3;
    uint32 constant NUM_WORDS = 4;
    
    // Lottery Constants
    uint256 public constant DAILY_RESERVE_PERCENTAGE = 20; // 20% goes to reserve DAILY
    uint256 public constant MAIN_POOL_PERCENTAGE = 80;     // 80% stays in main pools
    uint256 public constant TICKET_PRICE = 2 * 10**5;      // 0.2 USDC (6 decimals)
    
    // Prize distribution percentages (applied to the 80% main pool portion)
    uint256 public constant FIRST_PRIZE_PERCENTAGE = 80;
    uint256 public constant SECOND_PRIZE_PERCENTAGE = 10;
    uint256 public constant THIRD_PRIZE_PERCENTAGE = 5;
    uint256 public constant DEVELOPMENT_PERCENTAGE = 5;
    
    // Automation configuration
    uint256 public constant DRAW_INTERVAL = 24 hours;
    uint256 public drawTimeUTC = 3 hours; // 00:00 AM São Paulo = 03:00 AM UTC
    
    // Emoji indices (0-24) instead of strings
    uint8 public constant EMOJI_COUNT = 25;
    
    // Contract references
    IERC20 public immutable usdcToken;
    uint256 public immutable subscriptionId;
    
    // VRF state
    uint8[4] public lastWinningNumbers;
    
    // Game state
    uint256 public currentGameDay;
    bool public gameActive = true;
    bool public automationActive = true;
    bool public emergencyPause = false;
    
    // Accumulated pools
    struct AccumulatedPools {
        uint256 firstPrizeAccumulated;   // Accumulates when no first prize winners
        uint256 secondPrizeAccumulated;  // Accumulates when no second prize winners
        uint256 thirdPrizeAccumulated;   // Accumulates when no third prize winners
        uint256 developmentAccumulated;  // Always gets paid to development
    }
    
    AccumulatedPools public mainPools;
    
    // Reserve pools - accumulated from daily 20% portions
    struct ReservePools {
        uint256 firstPrizeReserve;     // Accumulates 80% of daily reserves (16% of total revenue)
        uint256 secondPrizeReserve;    // Accumulates 10% of daily reserves (2% of total revenue)
        uint256 thirdPrizeReserve;     // Accumulates 10% of daily reserves (2% of total revenue)
    }
    
    ReservePools public reserves;
    
    // Daily pool structure
    struct DailyPool {
        uint256 totalCollected;          // Total USDC collected this day
        uint256 mainPoolPortion;         // 80% portion that goes to main pools
        uint256 reservePortion;          // 20% portion that goes to reserves
        uint256 firstPrizeDaily;         // Daily contribution to first prize
        uint256 secondPrizeDaily;        // Daily contribution to second prize
        uint256 thirdPrizeDaily;         // Daily contribution to third prize
        uint256 developmentDaily;        // Daily contribution to development
        bool distributed;
        uint256 distributionTime;
        uint8[4] winningNumbers;
        bool drawn;
        bool reservesSent;
    }
    
    // Ticket structure
    struct Ticket {
        uint256 tokenId;
        address ticketOwner;
        uint8[4] numbers;
        uint256 gameDay;
        bool isActive;
        uint256 purchaseTime;
        bool eligibleForReserve;
    }
    
    // Mappings
    mapping(uint256 => DailyPool) public dailyPools;
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => uint256[]) public gameDayTickets;
    mapping(address => uint256[]) public userTickets;
    
    // Counters
    uint256 public ticketCounter;
    uint256 public totalDrawsExecuted;
    uint256 public totalReservesProcessed;
    
    // State tracking
    uint256 public lastDrawTime;
    
    // Events
    event TicketPurchased(
        uint256 indexed ticketId,
        address indexed buyer,
        uint8[4] numbers,
        uint256 gameDay
    );
    
    event DrawExecuted(
        uint256 indexed gameDay,
        uint8[4] winningNumbers,
        uint256 totalMainPools
    );
    
    event PrizeClaimed(
        uint256 indexed ticketId,
        address indexed winner,
        uint256 amount,
        uint8 prizeLevel,
        bool reserveUsedForRefill
    );
    
    event DailyReservesSent(
        uint256 indexed gameDay,
        uint256 firstReserveAmount,
        uint256 secondReserveAmount,
        uint256 thirdReserveAmount,
        uint256 totalSent
    );
    
    event LastDrawTimeUpdated(
        uint256 oldTime,
        uint256 newTime,
        uint256 newGameDay
    );
    
    event DrawTimeUTCUpdated(
        uint256 oldTime,
        uint256 newTime,
        uint256 newGameDay
    );
    
    event ReserveUsedForRefill(
        uint256 indexed gameDay,
        uint8 prizeLevel,
        uint256 amountTransferred
    );
    
    constructor(
        address _usdcToken
    ) 
        VRFConsumerBaseV2Plus(0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE)
        ERC721("LottoMoji Ticket", "LMOJI")
    {
        i_vrfCoordinator = IVRFCoordinatorV2Plus(0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE);
        usdcToken = IERC20(_usdcToken);
        subscriptionId = 105961847727705490544354750783936451991128107961690295417839588082464327658827;
        currentGameDay = getCurrentDay();
        lastDrawTime = block.timestamp;
    }
    
    /**
     * @dev Buy ticket with 4 emoji selection (0-24 indices)
     */
    function buyTicket(uint8[4] memory _numbers) external nonReentrant {
        require(gameActive && !emergencyPause, "Game not active");
        require(validateEmojiSelection(_numbers), "Invalid emoji selection");
        
        // Transfer USDC from user
        require(
            usdcToken.transferFrom(msg.sender, address(this), TICKET_PRICE),
            "USDC transfer failed"
        );
        
        // Create ticket
        ticketCounter++;
        uint256 gameDay = getCurrentDay();
        
        tickets[ticketCounter] = Ticket({
            tokenId: ticketCounter,
            ticketOwner: msg.sender,
            numbers: _numbers,
            gameDay: gameDay,
            isActive: true,
            purchaseTime: block.timestamp,
            eligibleForReserve: true
        });
        
        // Add to mappings
        gameDayTickets[gameDay].push(ticketCounter);
        userTickets[msg.sender].push(ticketCounter);
        
        // Update daily pool
        dailyPools[gameDay].totalCollected += TICKET_PRICE;
        _updateDailyPoolDistribution(gameDay);
        
        // Mint NFT
        _mint(msg.sender, ticketCounter);
        
        emit TicketPurchased(ticketCounter, msg.sender, _numbers, gameDay);
    }
    
    /**
     * @dev Admin function to toggle automation
     */
    function toggleAutomation() external {
        require(msg.sender == address(this) || msg.sender == tx.origin, "Not authorized");
        automationActive = !automationActive;
    }
    
    /**
     * @dev Admin function to toggle emergency pause
     */
    function toggleEmergencyPause() external {
        require(msg.sender == address(this) || msg.sender == tx.origin, "Not authorized");
        emergencyPause = !emergencyPause;
    }
    
    /**
     * @dev Admin function to set last draw time (for timing corrections)
     */
    function setLastDrawTime(uint256 _timestamp) external {
        require(msg.sender == address(this) || msg.sender == tx.origin, "Not authorized");
        uint256 oldTime = lastDrawTime;
        lastDrawTime = _timestamp;
        currentGameDay = getCurrentDay();
        
        emit LastDrawTimeUpdated(oldTime, _timestamp, currentGameDay);
    }
    
    /**
     * @dev Admin function to set draw time UTC (for timing corrections)
     */
    function setDrawTimeUTC(uint256 _hours) external {
        require(msg.sender == address(this) || msg.sender == tx.origin, "Not authorized");
        require(_hours < 24, "Invalid hour");
        uint256 oldTime = drawTimeUTC;
        drawTimeUTC = _hours * 1 hours;
        currentGameDay = getCurrentDay();
        
        emit DrawTimeUTCUpdated(oldTime, drawTimeUTC, currentGameDay);
    }
    
    /**
     * @dev Chainlink VRF callback
     */
    function fulfillRandomWords(uint256, uint256[] calldata randomWords) internal override {
        require(randomWords.length == NUM_WORDS, "Invalid number of random words");
        
        uint8[4] memory randomNumbers;
        for (uint256 i = 0; i < NUM_WORDS; i++) {
            randomNumbers[i] = uint8(randomWords[i] % EMOJI_COUNT);
        }
        
        lastWinningNumbers = randomNumbers;
        lastDrawTime = block.timestamp;
        
        uint256 gameDay = getCurrentDay() - 1; // Draw for previous day
        dailyPools[gameDay].winningNumbers = randomNumbers;
        dailyPools[gameDay].drawn = true;
        
        // Process complete draw flow
        _processCompleteDrawFlow(gameDay, randomNumbers);
        totalDrawsExecuted++;
        
        emit DrawExecuted(gameDay, randomNumbers, _getTotalMainPools());
    }
    
    /**
     * @dev Chainlink Automation checkUpkeep - ONLY for draws, no maintenance
     */
    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory) {
        if (!automationActive || emergencyPause) {
            return (false, "");
        }
        
        // Check if it's time for draw
        if (_shouldExecuteDraw()) {
            return (true, abi.encode(true));
        }
        
        return (false, "");
    }
    
    /**
     * @dev Chainlink Automation performUpkeep - ONLY for draws
     */
    function performUpkeep(bytes calldata performData) external override {
        require(automationActive && !emergencyPause, "Automation paused");
        
        bool isDraw = abi.decode(performData, (bool));
        
        if (isDraw && _shouldExecuteDraw()) {
            _requestRandomWords();
        }
    }
    
    /**
     * @dev Claim prize for a winning ticket
     */
    function claimPrize(uint256 _ticketId) external nonReentrant {
        require(tickets[_ticketId].ticketOwner == msg.sender, "Not ticket owner");
        require(tickets[_ticketId].isActive, "Ticket already claimed");
        
        uint256 gameDay = tickets[_ticketId].gameDay;
        require(dailyPools[gameDay].drawn, "Draw not executed yet");
        
        uint8 matches = _countMatches(_ticketId);
        require(matches >= 2, "No prize for this ticket");
        
        uint256 prizeAmount = _calculatePrize(_ticketId, matches);
        require(prizeAmount > 0, "No prize available");
        
        // Mark ticket as claimed
        tickets[_ticketId].isActive = false;
        
        // Transfer prize
        require(usdcToken.transfer(msg.sender, prizeAmount), "Prize transfer failed");
        
        emit PrizeClaimed(_ticketId, msg.sender, prizeAmount, matches, false);
    }
    
    // Internal functions
    function _requestRandomWords() internal {
        VRFV2PlusClient.RandomWordsRequest memory req = VRFV2PlusClient.RandomWordsRequest({
            keyHash: KEY_HASH,
            subId: subscriptionId,
            requestConfirmations: REQUEST_CONFIRMATIONS,
            callbackGasLimit: CALLBACK_GAS_LIMIT,
            numWords: NUM_WORDS,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({
                nativePayment: false
            }))
        });
        
        i_vrfCoordinator.requestRandomWords(req);
    }
    
    function _shouldExecuteDraw() internal view returns (bool) {
        uint256 nextDrawTime = lastDrawTime + DRAW_INTERVAL;
        return block.timestamp >= nextDrawTime;
    }
    
    /**
     * @dev Complete draw flow: reserves -> draw -> distribution -> auto-refill
     */
    function _processCompleteDrawFlow(uint256 gameDay, uint8[4] memory winningNumbers) internal {
        // STEP 1: Move daily reserves to accumulated reserve pools (BEFORE processing winners)
        _sendDailyReservesToAccumulated(gameDay);
        
        // STEP 2: Process draw results and determine winners
        _processDrawResults(gameDay, winningNumbers);
        
        // STEP 3: Auto-refill main pools from accumulated reserves if there are winners
        _autoRefillFromReserves(gameDay, winningNumbers);
    }
    
    /**
     * @dev Move daily reserves to accumulated reserve pools
     */
    function _sendDailyReservesToAccumulated(uint256 gameDay) internal {
        DailyPool storage pool = dailyPools[gameDay];
        
        if (pool.reservesSent) return; // Already processed
        
        // Distribute reserves proportionally to prize percentages
        uint256 firstPrizeReserve = (pool.reservePortion * FIRST_PRIZE_PERCENTAGE) / 100;  // 80% of reserves
        uint256 secondPrizeReserve = (pool.reservePortion * SECOND_PRIZE_PERCENTAGE) / 100; // 10% of reserves  
        uint256 thirdPrizeReserve = (pool.reservePortion * THIRD_PRIZE_PERCENTAGE) / 100;   // 10% of reserves
        // No reserve for development (5% remains in contract as buffer)
        
        reserves.firstPrizeReserve += firstPrizeReserve;
        reserves.secondPrizeReserve += secondPrizeReserve;
        reserves.thirdPrizeReserve += thirdPrizeReserve;
        
        pool.reservesSent = true;
        totalReservesProcessed++;
        
        emit DailyReservesSent(gameDay, firstPrizeReserve, secondPrizeReserve, thirdPrizeReserve, pool.reservePortion);
    }
    
    function _updateDailyPoolDistribution(uint256 gameDay) internal {
        DailyPool storage pool = dailyPools[gameDay];
        
        // Calculate distributions
        pool.mainPoolPortion = (pool.totalCollected * MAIN_POOL_PERCENTAGE) / 100;
        pool.reservePortion = (pool.totalCollected * DAILY_RESERVE_PERCENTAGE) / 100;
        
        // Calculate main pool distributions
        pool.firstPrizeDaily = (pool.mainPoolPortion * FIRST_PRIZE_PERCENTAGE) / 100;
        pool.secondPrizeDaily = (pool.mainPoolPortion * SECOND_PRIZE_PERCENTAGE) / 100;
        pool.thirdPrizeDaily = (pool.mainPoolPortion * THIRD_PRIZE_PERCENTAGE) / 100;
        pool.developmentDaily = (pool.mainPoolPortion * DEVELOPMENT_PERCENTAGE) / 100;
    }
    
    function _processDrawResults(uint256 gameDay, uint8[4] memory winningNumbers) internal {
        uint256[] memory dayTickets = gameDayTickets[gameDay];
        
        bool hasFirstPrizeWinner = false;
        bool hasSecondPrizeWinner = false;
        bool hasThirdPrizeWinner = false;
        
        // Check all tickets for winners
        for (uint256 i = 0; i < dayTickets.length; i++) {
            uint256 ticketId = dayTickets[i];
            uint8 matches = _countMatchesForTicket(ticketId, winningNumbers);
            
            if (matches == 4) hasFirstPrizeWinner = true;
            else if (matches == 3) hasSecondPrizeWinner = true;
            else if (matches == 2) hasThirdPrizeWinner = true;
        }
        
        // Distribute main pool portions
        DailyPool storage pool = dailyPools[gameDay];
        
        if (!hasFirstPrizeWinner) {
            // No winner: accumulate to main pool
            mainPools.firstPrizeAccumulated += pool.firstPrizeDaily;
        }
        
        if (!hasSecondPrizeWinner) {
            // No winner: accumulate to main pool
            mainPools.secondPrizeAccumulated += pool.secondPrizeDaily;
        }
        
        if (!hasThirdPrizeWinner) {
            // No winner: accumulate to main pool
            mainPools.thirdPrizeAccumulated += pool.thirdPrizeDaily;
        }
        
        // Development always gets paid (no reserve for development)
        mainPools.developmentAccumulated += pool.developmentDaily;
        
        pool.distributed = true;
        pool.distributionTime = block.timestamp;
    }
    
    /**
     * @dev Auto-refill main pools from accumulated reserves when there are winners
     */
    function _autoRefillFromReserves(uint256 gameDay, uint8[4] memory winningNumbers) internal {
        uint256[] memory dayTickets = gameDayTickets[gameDay];
        
        bool hasFirstPrizeWinner = false;
        bool hasSecondPrizeWinner = false;
        bool hasThirdPrizeWinner = false;
        
        // Check for winners again
        for (uint256 i = 0; i < dayTickets.length; i++) {
            uint256 ticketId = dayTickets[i];
            uint8 matches = _countMatchesForTicket(ticketId, winningNumbers);
            
            if (matches == 4) hasFirstPrizeWinner = true;
            else if (matches == 3) hasSecondPrizeWinner = true;
            else if (matches == 2) hasThirdPrizeWinner = true;
        }
        
        // Auto-refill main pools from reserves if there are winners and main pool is low
        if (hasFirstPrizeWinner && mainPools.firstPrizeAccumulated == 0 && reserves.firstPrizeReserve > 0) {
            uint256 refillAmount = reserves.firstPrizeReserve;
            mainPools.firstPrizeAccumulated = refillAmount;
            reserves.firstPrizeReserve = 0;
            emit ReserveUsedForRefill(gameDay, 1, refillAmount);
        }
        
        if (hasSecondPrizeWinner && mainPools.secondPrizeAccumulated == 0 && reserves.secondPrizeReserve > 0) {
            uint256 refillAmount = reserves.secondPrizeReserve;
            mainPools.secondPrizeAccumulated = refillAmount;
            reserves.secondPrizeReserve = 0;
            emit ReserveUsedForRefill(gameDay, 2, refillAmount);
        }
        
        if (hasThirdPrizeWinner && mainPools.thirdPrizeAccumulated == 0 && reserves.thirdPrizeReserve > 0) {
            uint256 refillAmount = reserves.thirdPrizeReserve;
            mainPools.thirdPrizeAccumulated = refillAmount;
            reserves.thirdPrizeReserve = 0;
            emit ReserveUsedForRefill(gameDay, 3, refillAmount);
        }
    }
    
    function _countMatches(uint256 ticketId) internal view returns (uint8) {
        uint256 gameDay = tickets[ticketId].gameDay;
        return _countMatchesForTicket(ticketId, dailyPools[gameDay].winningNumbers);
    }
    
    function _countMatchesForTicket(uint256 ticketId, uint8[4] memory winningNumbers) internal view returns (uint8) {
        uint8[4] memory ticketNumbers = tickets[ticketId].numbers;
        uint8 matches = 0;
        
        for (uint256 i = 0; i < 4; i++) {
            if (ticketNumbers[i] == winningNumbers[i]) {
                matches++;
            }
        }
        
        return matches;
    }
    
    function _calculatePrize(uint256 ticketId, uint8 matches) internal view returns (uint256) {
        uint256 gameDay = tickets[ticketId].gameDay;
        DailyPool memory pool = dailyPools[gameDay];
        
        if (matches == 4) {
            return pool.firstPrizeDaily + mainPools.firstPrizeAccumulated;
        } else if (matches == 3) {
            return pool.secondPrizeDaily + mainPools.secondPrizeAccumulated;
        } else if (matches == 2) {
            return pool.thirdPrizeDaily + mainPools.thirdPrizeAccumulated;
        }
        
        return 0;
    }
    
    function _getTotalMainPools() internal view returns (uint256) {
        return mainPools.firstPrizeAccumulated + 
               mainPools.secondPrizeAccumulated + 
               mainPools.thirdPrizeAccumulated + 
               mainPools.developmentAccumulated;
    }
    
    // View functions
    function getCurrentDay() public view returns (uint256) {
        return (block.timestamp + drawTimeUTC) / DRAW_INTERVAL;
    }
    
    function validateEmojiSelection(uint8[4] memory numbers) public pure returns (bool) {
        for (uint256 i = 0; i < 4; i++) {
            if (numbers[i] >= EMOJI_COUNT) return false;
        }
        return true;
    }
    
    function getTicketInfo(uint256 ticketId) external view returns (
        address ticketOwner,
        uint8[4] memory numbers,
        uint256 gameDay,
        bool isActive,
        uint8 matches
    ) {
        Ticket memory ticket = tickets[ticketId];
        return (
            ticket.ticketOwner,
            ticket.numbers,
            ticket.gameDay,
            ticket.isActive,
            _countMatches(ticketId)
        );
    }
    
    function getFullTicketInfo(uint256 ticketId) external view returns (
        address ticketOwner,
        uint8[4] memory numbers,
        uint256 gameDay,
        bool isActive,
        uint256 purchaseTime,
        bool eligibleForReserve,
        uint8 matches
    ) {
        Ticket memory ticket = tickets[ticketId];
        return (
            ticket.ticketOwner,
            ticket.numbers,
            ticket.gameDay,
            ticket.isActive,
            ticket.purchaseTime,
            ticket.eligibleForReserve,
            _countMatches(ticketId)
        );
    }
    
    function getGameDayTickets(uint256 gameDay) external view returns (uint256[] memory) {
        return gameDayTickets[gameDay];
    }
    
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }
    
    function getDailyPoolInfo(uint256 gameDay) external view returns (
        uint256 totalCollected,
        uint256 mainPoolPortion,
        uint256 reservePortion,
        bool distributed,
        bool drawn,
        uint8[4] memory winningNumbers
    ) {
        DailyPool memory pool = dailyPools[gameDay];
        return (
            pool.totalCollected,
            pool.mainPoolPortion,
            pool.reservePortion,
            pool.distributed,
            pool.drawn,
            pool.winningNumbers
        );
    }
    
    function getReserveBalances() external view returns (
        uint256 firstPrizeReserve,
        uint256 secondPrizeReserve,
        uint256 thirdPrizeReserve
    ) {
        return (
            reserves.firstPrizeReserve,
            reserves.secondPrizeReserve,
            reserves.thirdPrizeReserve
        );
    }
    
    function getMainPoolBalances() external view returns (
        uint256 firstPrizeAccumulated,
        uint256 secondPrizeAccumulated,
        uint256 thirdPrizeAccumulated,
        uint256 developmentAccumulated
    ) {
        return (
            mainPools.firstPrizeAccumulated,
            mainPools.secondPrizeAccumulated,
            mainPools.thirdPrizeAccumulated,
            mainPools.developmentAccumulated
        );
    }
    
    // ERC721 required overrides
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
    
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(tokenId > 0 && tokenId <= ticketCounter, "Token does not exist");
        
        Ticket memory ticket = tickets[tokenId];
        
        // Simple metadata
        return string(abi.encodePacked(
            "data:application/json;base64,",
            "eyJuYW1lIjoiTG90dG9Nb2ppIFRpY2tldCIsImRlc2NyaXB0aW9uIjoiTG90dG9Nb2ppIGdhbWUgdGlja2V0In0="
        ));
    }
} 