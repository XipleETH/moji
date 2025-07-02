// SPDX-License-Identifier: MIT
/*
 *  ███╗   ██╗ ██████╗ ████████╗████████╗ ██████╗  ██████╗ ███╗   ███╗ ██████╗ ██╗
 *  ████╗  ██║██╔═══██╗╚══██╔══╝╚══██╔══╝██╔═══██╗██╔═══██╗████╗ ████║██╔═══██╗██║
 *  ██╔██╗ ██║██║   ██║   ██║      ██║   ██║   ██║██║   ██║██╔████╔██║██║   ██║██║
 *  ██║╚██╗██║██║   ██║   ██║      ██║   ██║   ██║██║   ██║██║╚██╔╝██║██║   ██║██║
 *  ██║ ╚████║╚██████╔╝   ██║      ██║   ╚██████╔╝╚██████╔╝██║ ╚═╝ ██║╚██████╔╝███████╗
 *  ╚═╝  ╚═══╝ ╚═════╝    ╚═╝      ╚═╝    ╚═════╝  ╚═════╝ ╚═╝     ╚═╝ ╚═════╝ ╚══════╝
 *
 *  LottoMojiCore V2
 *  ─────────────────
 *  • Single daily draw exactly at `dailyDrawHourUTC` (default 02:00 UTC)
 *  • Supports Avalanche Fuji (block gas ~8 M) — batch‑processing to avoid gas griefing
 *  • Prize pools & reserves 80 / 20  split, with 80‑10‑5‑5 and 80‑10‑10 distributions
 *  • Automatic refill of pools from matching reserves when a tier has winners
 *  • Winners share pools pro‑rata (pool ÷ winners); pools reduced on each claim
 *  • ERC‑721 tickets (non‑enumerable) + off‑chain indexing; no Enumerable gas bloat
 *  • Fully upgrade‑less, but designed for redeploy‑migration (pause ⇒ deploy ⇒ migrate)
 *
 *  SPDX‑License‑Identifier: MIT
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// NOTE: Using dev/ paths for VRF V2Plus as they are not yet in stable paths
// @chainlink/contracts v1.4.0-beta.1 - VRF V2Plus contracts are still in development
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title LottoMojiCoreV2
 * @notice Fully‑on‑chain daily emoji lottery with fair VRF, pool reserves, and batch processing.
 */
contract LottoMojiCoreV2 is ERC721, ReentrancyGuard, VRFConsumerBaseV2Plus {
    using SafeERC20 for IERC20;

    // ───────────────────────────────────────────────────────────────────────────────
    // Constants & immutable configuration
    // ───────────────────────────────────────────────────────────────────────────────

    uint8   public immutable dailyDrawHourUTC;        // 0‑23, e.g. 2 means 02:00 UTC
    uint256 public immutable ticketPrice;             // price in `paymentToken` smallest unit
    IERC20  public immutable paymentToken;            // e.g. USDC on Fuji (6 dec)

    // Chainlink VRF Plus
    IVRFCoordinatorV2Plus private immutable i_vrfCoordinator;
    uint64  public immutable vrfSubId;
    bytes32 public immutable vrfKeyHash;
    uint32  public constant CALLBACK_GAS_LIMIT = 14000000;  // Updated gas limit
    uint16  public constant VRF_REQUEST_CONFIRMATIONS = 3;
    uint32  public constant VRF_NUM_WORDS = 1;               // need only one 256‑bit word

    // Percentages (base 100)
    uint256 private constant MAIN_POOL_PCT            = 80;  // 80 % daily → main prize pools
    uint256 private constant RESERVE_POOL_PCT         = 20;  // 20 % daily → reserves

    uint256 private constant FIRST_MAIN_PCT           = 80;  // of mainPool (64 % total)
    uint256 private constant SECOND_MAIN_PCT          = 10;  // (8 %)
    uint256 private constant THIRD_MAIN_PCT           = 5;   // (4 %)
    uint256 private constant DEV_MAIN_PCT             = 5;   // (4 %)

    uint256 private constant FIRST_RESERVE_PCT        = 80;  // of reservePool (16 % total)
    uint256 private constant SECOND_RESERVE_PCT       = 10;  // (2 %)
    uint256 private constant THIRD_RESERVE_PCT        = 10;  // (2 %)

    uint256 private constant MAX_BATCH_SIZE           = 300; // tickets per batch process step

    uint256 private constant EMOJI_MAX                = 24;  // emojis are 0‑24 inclusive

    // ───────────────────────────────────────────────────────────────────────────────
    // State variables
    // ───────────────────────────────────────────────────────────────────────────────

    uint256 public nextDrawTs;           // UNIX time of the next draw at HH:00 UTC
    uint24  public currentGameDay = 1;   // logical day counter (starts at 1)
    uint24  private pendingDrawDay;      // day being drawn (for VRF callback)

    // Ticket bookkeeping
    struct Ticket {
        uint40  purchaseTime;
        uint24  gameDay;
        uint32  packedNumbers; // 4 emojis packed: 8 bits each (0-24)
        bool    claimed;
    }
    uint256 private _nextTicketId = 1;
    mapping(uint256 => Ticket) public tickets;            // ticketId → data
    mapping(uint24 => uint256[]) internal ticketsByDay;   // day → array of ticket IDs

    // Pools & reserves
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

    // Winning data
    struct DayResult {
        uint32 packedWinningNumbers; // 4 emojis packed: 8 bits each
        uint32 processingIndex;      // index for batch verification
        uint32 winnersFirst;
        uint32 winnersSecond;
        uint32 winnersThird;
        bool   fullyProcessed;
    }
    mapping(uint24 => DayResult) public dayResults;       // gameDay → result data

    // Automation flags
    bool public automationActive = true;
    bool public emergencyPause   = false;

    // ───────────────────────────────────────────────────────────────────────────────
    // Events
    // ───────────────────────────────────────────────────────────────────────────────

    event TicketPurchased(address indexed player, uint256 indexed ticketId, uint24 indexed day);
    event NextDrawScheduled(uint24 indexed nextDay, uint256 drawTimestamp);
    event VRFRequested(uint256 indexed requestId, uint24 indexed day);
    event DrawNumbers(uint24 indexed day, uint8[4] numbers);
    event BatchProcessed(uint24 indexed day, uint256 fromIndex, uint256 toIndex);
    event PrizesCalculated(uint24 indexed day, uint32 firstWinners, uint32 secondWinners, uint32 thirdWinners);
    event PrizeClaimed(uint24 indexed day, uint256 indexed ticketId, address winner, uint8 prizeLevel, uint256 amount);

    // ───────────────────────────────────────────────────────────────────────────────
    // Errors (custom — cheaper than revert strings)
    // ───────────────────────────────────────────────────────────────────────────────

    error AutomationPaused();
    error EmergencyPaused();
    error DrawNotReady();
    error TooEarly();
    error InvalidEmoji();
    error InvalidNumbers();
    error AlreadyClaimed();
    error NotWinner();
    error BatchOOB();
    error NothingToProcess();

    // ───────────────────────────────────────────────────────────────────────────────
    // Constructor
    // ───────────────────────────────────────────────────────────────────────────────

    constructor(
        uint8  _dailyDrawHourUTC,
        address _paymentToken,
        uint256 _ticketPrice,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64  _subId
    ) ERC721("LottoMoji Ticket", "LMJTK") VRFConsumerBaseV2Plus(_vrfCoordinator) {
        require(_dailyDrawHourUTC < 24, "hour<24");
        i_vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);
        paymentToken   = IERC20(_paymentToken);
        ticketPrice    = _ticketPrice;
        dailyDrawHourUTC = _dailyDrawHourUTC;
        vrfKeyHash     = _keyHash;
        vrfSubId       = _subId;

        // compute first nextDrawTs (>= now)
        nextDrawTs = _roundToNextHour(block.timestamp, _dailyDrawHourUTC);
        emit NextDrawScheduled(currentGameDay, nextDrawTs);
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Ticket purchase
    // ───────────────────────────────────────────────────────────────────────────────

    function buyTicket(uint8[4] calldata emojiNumbers) external nonReentrant {
        if (emergencyPause) revert EmergencyPaused();
        if (block.timestamp >= nextDrawTs) revert TooEarly(); // draw imminent; wait next day

        // validate emojis 0‑24, duplicates allowed
        unchecked {
            for (uint256 i; i < 4; ++i) {
                if (emojiNumbers[i] > EMOJI_MAX) revert InvalidEmoji();
            }
        }

        // transfer payment
        paymentToken.safeTransferFrom(msg.sender, address(this), ticketPrice);

        // mint ticket
        uint256 tokenId = _nextTicketId++;
        _safeMint(msg.sender, tokenId);

        tickets[tokenId] = Ticket({
            purchaseTime: uint40(block.timestamp),
            gameDay:      currentGameDay,
            packedNumbers: _packNumbers(emojiNumbers),
            claimed:      false
        });
        ticketsByDay[currentGameDay].push(tokenId);

        emit TicketPurchased(msg.sender, tokenId, currentGameDay);
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Chainlink Automation – external Keeper compatible
    // ───────────────────────────────────────────────────────────────────────────────

    /**
     * @notice view function for Chainlink Keepers
     */
    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = automationActive && !emergencyPause && block.timestamp >= nextDrawTs;
        performData = "";
    }

    /**
     * @dev Called by Keeper to run the daily draw (02:00 UTC by default)
     */
    function performUpkeep(bytes calldata) external {
        if (!automationActive || emergencyPause) revert AutomationPaused();
        if (block.timestamp < nextDrawTs) revert TooEarly();

        uint24 dayToDraw = currentGameDay;
        pendingDrawDay = dayToDraw; // Save the day being drawn for VRF callback
        
        _distributeDailyFunds(dayToDraw);
        _requestRandom(dayToDraw);

        // Program next day
        currentGameDay += 1;
        nextDrawTs += 1 days;
        emit NextDrawScheduled(currentGameDay, nextDrawTs);
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Internal: fund allocation
    // ───────────────────────────────────────────────────────────────────────────────

    function _distributeDailyFunds(uint24 day) internal {
        uint256 ticketsSold = ticketsByDay[day].length;
        if (ticketsSold == 0) return; // nothing collected

        uint256 collected = ticketsSold * ticketPrice;

        uint256 mainPool   = (collected * MAIN_POOL_PCT)    / 100;
        uint256 reservePool= (collected * RESERVE_POOL_PCT) / 100;

        // ─ main prize pools
        pools.firstPrize  += (mainPool * FIRST_MAIN_PCT)   / 100; // 64 %
        pools.secondPrize += (mainPool * SECOND_MAIN_PCT)  / 100; // 8 %
        pools.thirdPrize  += (mainPool * THIRD_MAIN_PCT)   / 100; // 4 %
        pools.devPool     += (mainPool * DEV_MAIN_PCT)     / 100; // 4 %

        // ─ reserves
        pools.firstReserve  += (reservePool * FIRST_RESERVE_PCT)  / 100; // 16 %
        pools.secondReserve += (reservePool * SECOND_RESERVE_PCT) / 100; // 2 %
        pools.thirdReserve  += (reservePool * THIRD_RESERVE_PCT)  / 100; // 2 %
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Internal: VRF request
    // ───────────────────────────────────────────────────────────────────────────────

    function _requestRandom(uint24 day) internal {
        VRFV2PlusClient.RandomWordsRequest memory req = VRFV2PlusClient.RandomWordsRequest({
            keyHash: vrfKeyHash,
            subId: vrfSubId,
            requestConfirmations: VRF_REQUEST_CONFIRMATIONS,
            callbackGasLimit: CALLBACK_GAS_LIMIT,
            numWords: VRF_NUM_WORDS,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({
                nativePayment: false
            }))
        });
        
        uint256 requestId = i_vrfCoordinator.requestRandomWords(req);
        emit VRFRequested(requestId, day);
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // VRF callback – store winning numbers & prepare batch processing
    // ───────────────────────────────────────────────────────────────────────────────

    function fulfillRandomWords(uint256, uint256[] calldata randomWords) internal override {
        uint24 day = pendingDrawDay; // Use the correct day that was being drawn
        DayResult storage dr = dayResults[day];

        uint256 r = randomWords[0];
        // derive 4 pseudo‑random emojis 0‑24 (duplicates allowed)
        uint8[4] memory winningNums = [
            uint8(r % 25),        
            uint8((r >> 8) % 25), 
            uint8((r >> 16) % 25),
            uint8((r >> 24) % 25)
        ];
        
        dr.packedWinningNumbers = _packNumbers(winningNums);
        dr.processingIndex = 0;
        dr.fullyProcessed  = false;

        // Clear pending draw day after successful VRF callback
        pendingDrawDay = 0;

        emit DrawNumbers(day, winningNums);
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Public: batch process tickets to count winners (can be permissionless, Keeper, or manual)
    // ───────────────────────────────────────────────────────────────────────────────

    function processDrawBatch(uint24 day, uint256 batchSize) external {
        if (batchSize == 0 || batchSize > MAX_BATCH_SIZE) batchSize = MAX_BATCH_SIZE;

        DayResult storage dr = dayResults[day];
        if (dr.fullyProcessed) revert NothingToProcess();

        uint256[] storage arr = ticketsByDay[day];
        uint256 from = dr.processingIndex;
        if (from >= arr.length) revert BatchOOB();

        uint256 to = from + batchSize;
        if (to > arr.length) to = arr.length;

        for (uint256 i = from; i < to; ++i) {
            _evaluateTicket(arr[i], dr);
        }

        dr.processingIndex = uint32(to);
        emit BatchProcessed(day, from, to);

        // If completed, finalise prizes & refill from reserves
        if (to == arr.length) {
            dr.fullyProcessed = true;
            emit PrizesCalculated(day, dr.winnersFirst, dr.winnersSecond, dr.winnersThird);

            // ─ refill pools from reserves only if there were winners
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

    // ───────────────────────────────────────────────────────────────────────────────
    // Internal: evaluate a single ticket vs winning numbers
    // ───────────────────────────────────────────────────────────────────────────────

    function _evaluateTicket(uint256 ticketId, DayResult storage dr) internal {
        Ticket storage t = tickets[ticketId];
        uint8[4] memory ticketNums = _unpackNumbers(t.packedNumbers);
        uint8[4] memory w = _unpackNumbers(dr.packedWinningNumbers);

        // Count exact & any‑order matches
        uint8 exact;
        uint8 anyOrder;

        // quick exact
        unchecked {
            for (uint256 i; i < 4; ++i) {
                if (ticketNums[i] == w[i]) ++exact;
            }
        }
        if (exact == 4) {
            ++dr.winnersFirst;
            return;
        }
        if (exact == 3) {
            ++dr.winnersThird;
            return;
        }

        // any order count via freq table (cheap, O(25))
        uint8[25] memory freq;
        unchecked {
            for (uint256 i; i < 4; ++i) {
                ++freq[ticketNums[i]];
            }
            for (uint256 i; i < 4; ++i) {
                if (freq[w[i]] > 0) {
                    ++anyOrder;
                    --freq[w[i]];
                }
            }
        }

        if (anyOrder == 4) ++dr.winnersSecond;
        else if (anyOrder == 3) {
            // free‑ticket prize — handled implicitly during claim by refunding price
        }
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Claim prize
    // ───────────────────────────────────────────────────────────────────────────────

    function claimPrize(uint256 ticketId) external nonReentrant {
        Ticket storage t = tickets[ticketId];
        if (t.claimed) revert AlreadyClaimed();
        if (ownerOf(ticketId) != msg.sender) revert NotWinner(); // only owner can claim

        DayResult storage dr = dayResults[t.gameDay];
        require(dr.fullyProcessed, "day not processed yet");

        // Determine prize level again (cheaper than storing per ticket)
        uint8 prizeLevel = _determinePrizeLevel(_unpackNumbers(t.packedNumbers), _unpackNumbers(dr.packedWinningNumbers));
        uint256 amount;

        if (prizeLevel == 1) {
            if (dr.winnersFirst == 0) revert NotWinner();
            amount = pools.firstPrize / dr.winnersFirst;
            pools.firstPrize -= amount;
        } else if (prizeLevel == 2) {
            if (dr.winnersSecond == 0) revert NotWinner();
            amount = pools.secondPrize / dr.winnersSecond;
            pools.secondPrize -= amount;
        } else if (prizeLevel == 3) {
            if (dr.winnersThird == 0) revert NotWinner();
            amount = pools.thirdPrize / dr.winnersThird;
            pools.thirdPrize -= amount;
        } else if (prizeLevel == 4) {
            amount = ticketPrice; // free ticket ⇒ refund price
        } else {
            revert NotWinner();
        }

        t.claimed = true;
        paymentToken.safeTransfer(msg.sender, amount);
        emit PrizeClaimed(t.gameDay, ticketId, msg.sender, prizeLevel, amount);
    }

    function _determinePrizeLevel(uint8[4] memory nums, uint8[4] memory win) internal pure returns (uint8) {
        uint8 exact;
        unchecked {
            for (uint256 i; i < 4; ++i) if (nums[i] == win[i]) ++exact;
        }
        if (exact == 4) return 1;
        if (exact == 3) return 3;

        // any‑order
        uint8[25] memory freq;
        uint8 anyOrder;
        unchecked {
            for (uint256 i; i < 4; ++i) ++freq[nums[i]];
            for (uint256 i; i < 4; ++i) {
                if (freq[win[i]] > 0) { ++anyOrder; --freq[win[i]]; }
            }
        }
        if (anyOrder == 4) return 2;
        if (anyOrder == 3) return 4;
        return 0;
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Admin controls (onlyOwner)
    // ───────────────────────────────────────────────────────────────────────────────

    function toggleAutomation() external onlyOwner { automationActive = !automationActive; }
    function toggleEmergencyPause() external onlyOwner { emergencyPause = !emergencyPause; }

    function resetPendingDrawDay() external onlyOwner {
        pendingDrawDay = 0;
    }

    function sweepDevPool(address to) external onlyOwner {
        uint256 amount = pools.devPool;
        pools.devPool = 0;
        paymentToken.safeTransfer(to, amount);
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Utils
    // ───────────────────────────────────────────────────────────────────────────────

    function _packNumbers(uint8[4] memory nums) internal pure returns (uint32) {
        return uint32(nums[0]) | (uint32(nums[1]) << 8) | (uint32(nums[2]) << 16) | (uint32(nums[3]) << 24);
    }

    function _unpackNumbers(uint32 packed) internal pure returns (uint8[4] memory) {
        return [
            uint8(packed & 0xFF),
            uint8((packed >> 8) & 0xFF),
            uint8((packed >> 16) & 0xFF),
            uint8((packed >> 24) & 0xFF)
        ];
    }

    function _roundToNextHour(uint256 nowTs, uint8 hourUTC) internal pure returns (uint256) {
        uint256 day = nowTs / 1 days;
        uint256 candidate = (day * 1 days) + hourUTC * 1 hours;
        if (candidate <= nowTs) candidate += 1 days;
        return candidate;
    }
}
