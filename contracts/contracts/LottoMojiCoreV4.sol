// SPDX-License-Identifier: MIT
/*
 *  ███╗   ██╗ ██████╗ ████████╗████████╗ ██████╗  ██████╗ ███╗   ███╗ ██████╗ ██╗
 *  ████╗  ██║██╔═══██╗╚══██╔══╝╚══██╔══╝██╔═══██╗██╔═══██╗████╗ ████║██╔═══██╗██║
 *  ██╔██╗ ██║██║   ██║   ██║      ██║   ██║   ██║██║   ██║██╔████╔██║██║   ██║██║
 *  ██║╚██╗██║██║   ██║   ██║      ██║   ██║   ██║██║   ██║██║╚██╔╝██║██║   ██║██║
 *  ██║ ╚████║╚██████╔╝   ██║      ██║   ╚██████╔╝╚██████╔╝██║ ╚═╝ ██║╚██████╔╝███████╗
 *  ╚═╝  ╚═══╝ ╚═════╝    ╚═╝      ╚═╝    ╚═════╝  ╚═════╝ ╚═╝     ╚═╝ ╚═════╝ ╚══════╝
 *
 *  LottoMojiCore V4 — With ERC721Enumerable (July 2025)
 *  ────────────────────────────────────────────────────────────────────────────────
 *  • Daily draw exactly at `dailyDrawHourUTC` (default 02:00 UTC)
 *  • Prize pools & reserves 80 / 20  split → 64‑8‑4‑4 and 16‑2‑2
 *  • Pools refill from matching reserves when a tier has winners
 *  • ERC‑721 tickets with Enumerable extension for easy user ticket lookup
 *  • Designed for Avalanche Fuji (block gas ≈ 8 M); ticket‑batch capped ×300
 *  • Uses Chainlink VRF v2 & Chainlink Automation (Keepers)
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title LottoMojiCoreV4
 * @notice Fully‑on‑chain emoji lottery with fair VRF, pool reserves and batch processing.
 */
contract LottoMojiCoreV4 is
    ERC721,
    ERC721Enumerable,
    ReentrancyGuard,
    VRFConsumerBaseV2Plus,
    AutomationCompatibleInterface
{
    using SafeERC20 for IERC20;

    // ───────────────────────────────────────────────────────────────────────────
    // Immutable configuration
    // ───────────────────────────────────────────────────────────────────────────

    uint8   public immutable dailyDrawHourUTC;  // 0‑23 ⇒ HH:00 UTC
    uint256 public immutable ticketPrice;       // in smallest unit of paymentToken
    IERC20  public immutable paymentToken;      // e.g. USDC‑e on Fuji (6 dec)

    // Chainlink VRF
    IVRFCoordinatorV2Plus private immutable COORDINATOR;
    bytes32 public immutable vrfKeyHash;
    uint256 public immutable vrfSubId;
    uint32  public constant VRF_CALLBACK_GAS_LIMIT = 300_000; // keep callback cheap
    uint16  public constant VRF_CONFIRMATIONS      = 3;
    uint32  public constant VRF_NUM_WORDS          = 1;

    // Percentages (base 100)
    uint256 private constant MAIN_POOL_PCT      = 80; // → 64‑8‑4‑4
    uint256 private constant RESERVE_POOL_PCT   = 20; // → 16‑2‑2

    uint256 private constant FIRST_MAIN_PCT     = 80; // 64 %
    uint256 private constant SECOND_MAIN_PCT    = 10; //  8 %
    uint256 private constant THIRD_MAIN_PCT     = 5;  //  4 %
    uint256 private constant DEV_MAIN_PCT       = 5;  //  4 %

    uint256 private constant FIRST_RESERVE_PCT  = 80; // 16 %
    uint256 private constant SECOND_RESERVE_PCT = 10; //  2 %
    uint256 private constant THIRD_RESERVE_PCT  = 10; //  2 %

    uint256 private constant MAX_BATCH_SIZE     = 300; // tickets per loop step
    uint8   private constant EMOJI_MAX          = 24;  // emojis are 0‑24 inclusive

    // ───────────────────────────────────────────────────────────────────────────
    // State
    // ───────────────────────────────────────────────────────────────────────────

    uint256 public nextDrawTs;        // UNIX ts of next HH:00 UTC draw
    uint24  public currentGameDay = 1;

    struct Ticket {
        uint40  purchaseTime;
        uint24  gameDay;
        uint8[4] numbers;  // emojis
        bool    claimed;
    }
    uint256 private _nextTicketId = 1;
    mapping(uint256 => Ticket) public tickets;            // ticketId → data
    mapping(uint24 => uint256[]) internal ticketsByDay;   // day → ticket IDs

    struct Pools {
        uint256 firstPrize;
        uint256 secondPrize;
        uint256 thirdPrize;
        uint256 devPool;
        uint256 firstReserve;
        uint256 secondReserve;
        uint256 thirdReserve;
    }
    Pools public pools;

    struct DayResult {
        uint8[4] winningNumbers;
        uint32 processingIndex;
        uint32 winnersFirst;
        uint32 winnersSecond;
        uint32 winnersThird;
        bool   fullyProcessed;
    }
    mapping(uint24 => DayResult) public dayResults;
    mapping(uint256 => uint24)   private requestIdToDay; // VRF reqId → day

    bool public automationActive = true;
    bool public emergencyPause   = false;

    // ───────────────────────────────────────────────────────────────────────────
    // Events
    // ───────────────────────────────────────────────────────────────────────────

    event TicketPurchased(address indexed player, uint256 indexed ticketId, uint24 indexed day);
    event NextDrawScheduled(uint24 indexed nextDay, uint256 drawTimestamp);
    event VRFRequested(uint256 indexed requestId, uint24 indexed day);
    event DrawNumbers(uint24 indexed day, uint8[4] numbers);
    event BatchProcessed(uint24 indexed day, uint256 from, uint256 to);
    event PrizesCalculated(uint24 indexed day, uint32 first, uint32 second, uint32 third);
    event PrizeClaimed(uint24 indexed day, uint256 indexed ticketId, address winner, uint8 level, uint256 amount);
    event DevelopmentWithdrawn(address to, uint256 amount);

    // ───────────────────────────────────────────────────────────────────────────
    // Errors
    // ───────────────────────────────────────────────────────────────────────────

    error AutomationPaused();
    error EmergencyPaused();
    error TooLate();
    error TooEarly();
    error InvalidEmoji();
    error AlreadyClaimed();
    error NotWinner();
    error BatchDone();

    // ───────────────────────────────────────────────────────────────────────────
    // Constructor
    // ───────────────────────────────────────────────────────────────────────────

    constructor(
        uint8   _drawHourUTC,
        address _paymentToken,
        uint256 _ticketPrice,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint256 _subId
    )
        ERC721("LottoMoji Ticket V4", "LMJV4")
        VRFConsumerBaseV2Plus(_vrfCoordinator)
    {
        require(_drawHourUTC < 24, "hour<24");
        dailyDrawHourUTC = _drawHourUTC;
        paymentToken     = IERC20(_paymentToken);
        ticketPrice      = _ticketPrice;

        COORDINATOR = IVRFCoordinatorV2Plus(_vrfCoordinator);
        vrfKeyHash  = _keyHash;
        vrfSubId    = _subId;

        nextDrawTs = _roundToNextHour(block.timestamp, _drawHourUTC);
        emit NextDrawScheduled(currentGameDay, nextDrawTs);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // ERC721Enumerable override requirement
    // ───────────────────────────────────────────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Ticket purchase
    // ───────────────────────────────────────────────────────────────────────────

    function buyTicket(uint8[4] calldata emojiNumbers) external nonReentrant {
        if (emergencyPause) revert EmergencyPaused();
        if (block.timestamp >= nextDrawTs) revert TooLate();

        unchecked {
            for (uint256 i; i < 4; ++i) {
                if (emojiNumbers[i] > EMOJI_MAX) revert InvalidEmoji();
            }
        }

        paymentToken.safeTransferFrom(msg.sender, address(this), ticketPrice);

        uint256 tokenId = _nextTicketId++;
        _safeMint(msg.sender, tokenId);

        tickets[tokenId] = Ticket({
            purchaseTime: uint40(block.timestamp),
            gameDay:      currentGameDay,
            numbers:      emojiNumbers,
            claimed:      false
        });
        ticketsByDay[currentGameDay].push(tokenId);

        emit TicketPurchased(msg.sender, tokenId, currentGameDay);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Chainlink Automation (Keepers)
    // ───────────────────────────────────────────────────────────────────────────

    function checkUpkeep(bytes calldata)
        external view override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = automationActive && !emergencyPause && block.timestamp >= nextDrawTs;
        performData  = "";
    }

    function performUpkeep(bytes calldata) external override {
        if (!automationActive || emergencyPause) revert AutomationPaused();
        if (block.timestamp < nextDrawTs) revert TooEarly();

        uint24 dayToDraw = currentGameDay;
        _distributeDailyFunds(dayToDraw);
        _requestRandom(dayToDraw);

        currentGameDay += 1;
        nextDrawTs += 1 days;
        emit NextDrawScheduled(currentGameDay, nextDrawTs);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Fund allocation (called once/day)
    // ───────────────────────────────────────────────────────────────────────────

    function _distributeDailyFunds(uint24 day) internal {
        uint256 sold = ticketsByDay[day].length;
        if (sold == 0) return;

        uint256 collected   = sold * ticketPrice;
        uint256 mainPortion = (collected * MAIN_POOL_PCT)    / 100;
        uint256 resPortion  = (collected * RESERVE_POOL_PCT) / 100;

        pools.firstPrize  += (mainPortion * FIRST_MAIN_PCT)   / 100;
        pools.secondPrize += (mainPortion * SECOND_MAIN_PCT)  / 100;
        pools.thirdPrize  += (mainPortion * THIRD_MAIN_PCT)   / 100;
        pools.devPool     += (mainPortion * DEV_MAIN_PCT)     / 100;

        pools.firstReserve  += (resPortion * FIRST_RESERVE_PCT)  / 100;
        pools.secondReserve += (resPortion * SECOND_RESERVE_PCT) / 100;
        pools.thirdReserve  += (resPortion * THIRD_RESERVE_PCT)  / 100;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // VRF request / callback
    // ───────────────────────────────────────────────────────────────────────────

    function _requestRandom(uint24 day) internal {
        uint256 requestId = COORDINATOR.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: vrfKeyHash,
                subId: vrfSubId,
                requestConfirmations: VRF_CONFIRMATIONS,
                callbackGasLimit: VRF_CALLBACK_GAS_LIMIT,
                numWords: VRF_NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        requestIdToDay[requestId] = day;
        emit VRFRequested(requestId, day);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint24 day = requestIdToDay[requestId];
        DayResult storage dr = dayResults[day];

        uint256 r = randomWords[0];
        // 4 pseudo‑random emojis 0‑24 (duplicates allowed)
        dr.winningNumbers[0] = uint8(r % 25); r >>= 8;
        dr.winningNumbers[1] = uint8(r % 25); r >>= 8;
        dr.winningNumbers[2] = uint8(r % 25); r >>= 8;
        dr.winningNumbers[3] = uint8(r % 25);

        dr.processingIndex = 0;
        dr.fullyProcessed  = false;
        emit DrawNumbers(day, dr.winningNumbers);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Batch processing of tickets (permissionless)
    // ───────────────────────────────────────────────────────────────────────────

    function processDrawBatch(uint24 day, uint256 batchSize) external {
        if (batchSize == 0 || batchSize > MAX_BATCH_SIZE) batchSize = MAX_BATCH_SIZE;
        DayResult storage dr = dayResults[day];
        if (dr.fullyProcessed) revert BatchDone();

        uint256[] storage arr = ticketsByDay[day];
        uint256 from = dr.processingIndex;
        uint256 to   = from + batchSize;
        if (to > arr.length) to = arr.length;

        for (uint256 i = from; i < to; ++i) _evaluateTicket(arr[i], dr);

        dr.processingIndex = uint32(to);
        emit BatchProcessed(day, from, to);

        if (to == arr.length) {
            dr.fullyProcessed = true;
            emit PrizesCalculated(day, dr.winnersFirst, dr.winnersSecond, dr.winnersThird);

            if (dr.winnersFirst > 0 && pools.firstReserve > 0) {
                pools.firstPrize += pools.firstReserve;
                pools.firstReserve = 0;
            }
            if (dr.winnersSecond > 0 && pools.secondReserve > 0) {
                pools.secondPrize += pools.secondReserve;
                pools.secondReserve = 0;
            }
            if (dr.winnersThird > 0 && pools.thirdReserve > 0) {
                pools.thirdPrize += pools.thirdReserve;
                pools.thirdReserve = 0;
            }
        }
    }

    function _evaluateTicket(uint256 ticketId, DayResult storage dr) internal {
        Ticket storage t = tickets[ticketId];
        uint8[4] memory w = dr.winningNumbers;

        uint8 exact;
        unchecked {
            for (uint256 i; i < 4; ++i) if (t.numbers[i] == w[i]) ++exact;
        }
        if (exact == 4)      { ++dr.winnersFirst; return; }
        if (exact == 3)      { ++dr.winnersThird; return; }

        uint8[25] memory freq;
        uint8 any;
        unchecked {
            for (uint256 i; i < 4; ++i) ++freq[t.numbers[i]];
            for (uint256 i; i < 4; ++i) if (freq[w[i]] > 0) { ++any; --freq[w[i]]; }
        }
        if (any == 4) ++dr.winnersSecond;
        else if (any == 3) { /* free ticket refund later */ }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Claim prize
    // ───────────────────────────────────────────────────────────────────────────

    function claimPrize(uint256 ticketId) external nonReentrant {
        Ticket storage t = tickets[ticketId];
        if (t.claimed) revert AlreadyClaimed();
        if (ownerOf(ticketId) != msg.sender) revert NotWinner();

        DayResult storage dr = dayResults[t.gameDay];
        require(dr.fullyProcessed, "day not ready");

        uint8 level = _determinePrizeLevel(t.numbers, dr.winningNumbers);
        uint256 amount;

        if (level == 1 && dr.winnersFirst > 0) {
            amount = pools.firstPrize / dr.winnersFirst;
            pools.firstPrize -= amount;
        } else if (level == 2 && dr.winnersSecond > 0) {
            amount = pools.secondPrize / dr.winnersSecond;
            pools.secondPrize -= amount;
        } else if (level == 3 && dr.winnersThird > 0) {
            amount = pools.thirdPrize / dr.winnersThird;
            pools.thirdPrize -= amount;
        } else if (level == 4) {
            amount = ticketPrice;
        } else {
            revert NotWinner();
        }

        t.claimed = true;
        paymentToken.safeTransfer(msg.sender, amount);
        emit PrizeClaimed(t.gameDay, ticketId, msg.sender, level, amount);
    }

    function _determinePrizeLevel(uint8[4] memory nums, uint8[4] memory win) internal pure returns (uint8) {
        uint8 exact;
        unchecked {
            for (uint256 i; i < 4; ++i) if (nums[i] == win[i]) ++exact;
        }
        if (exact == 4) return 1;
        if (exact == 3) return 3;

        uint8[25] memory freq;
        uint8 any;
        unchecked {
            for (uint256 i; i < 4; ++i) ++freq[nums[i]];
            for (uint256 i; i < 4; ++i) if (freq[win[i]] > 0) { ++any; --freq[win[i]]; }
        }
        if (any == 4) return 2;
        if (any == 3) return 4;
        return 0;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Admin
    // ───────────────────────────────────────────────────────────────────────────

    function toggleAutomation() external onlyOwner { automationActive = !automationActive; }
    function toggleEmergencyPause() external onlyOwner { emergencyPause = !emergencyPause; }

    function withdrawDevelopment(address to) external onlyOwner {
        uint256 amt = pools.devPool;
        pools.devPool = 0;
        paymentToken.safeTransfer(to, amt);
        emit DevelopmentWithdrawn(to, amt);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Utils
    // ───────────────────────────────────────────────────────────────────────────

    function _roundToNextHour(uint256 nowTs, uint8 hourUTC) internal pure returns (uint256) {
        uint256 dayStart = (nowTs / 1 days) * 1 days;
        uint256 candidate = dayStart + uint256(hourUTC) * 1 hours;
        if (candidate <= nowTs) candidate += 1 days;
        return candidate;
    }
} 