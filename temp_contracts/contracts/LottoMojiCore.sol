// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

// Base64 library
library Base64 {
    string internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";

        // Multiply by 4/3 rounded up
        uint256 encodedLen = 4 * ((data.length + 2) / 3);

        // Add some extra buffer at the end required for the writing
        string memory result = new string(encodedLen + 32);

        assembly {
            // Set the actual output length
            mstore(result, encodedLen)

            // Get the pointer to the TABLE string data
            let table := add(mload(0x40), 1)
            mstore(0x40, add(table, 64))
            mstore(table, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/")

            // Input ptr
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))

            // Result ptr, jump over length
            let resultPtr := add(result, 32)

            // Run over the input, 3 bytes at a time
            for {} lt(dataPtr, endPtr) {}
            {
                // Advance 3 bytes
                dataPtr := add(dataPtr, 3)

                // Take 3 bytes
                let input := mload(dataPtr)

                // Write 4 characters
                mstore8(resultPtr, mload(add(table, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(table, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(table, and(shr( 6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(table, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }

            // At this point, we have written out 4 characters for a
            // group of 3 bytes, but we may have 1 or 2 bytes left
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
        }

        return result;
    }
}

contract LottoMojiCore is 
    ERC721,
    ERC721Enumerable,
    ERC721Burnable,
    VRFConsumerBaseV2Plus,
    AutomationCompatibleInterface,
    ReentrancyGuard 
{
    using Strings for uint256;
    using VRFV2PlusClient for VRFV2PlusClient.RandomWordsRequest;
    using Base64 for bytes;

    // VRF Configuration
    IVRFCoordinatorV2Plus private immutable i_vrfCoordinator;
    bytes32 private constant KEY_HASH = 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71;
    uint32 private constant CALLBACK_GAS_LIMIT = 2500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 4;
    uint64 private immutable subscriptionId;

    // Automation configuration
    uint256 public constant DRAW_INTERVAL = 24 hours;
    uint256 public constant SAO_PAULO_OFFSET = 3 hours; // UTC-3
    uint256 public drawTimeUTC = 3 hours; // 00:00 AM São Paulo = 03:00 AM UTC
    
    // Emoji indices (0-24) instead of strings
    uint8 public constant EMOJI_COUNT = 25;
    
    // State tracking
    uint256 public lastDrawTime;
    uint256 public lastMaintenanceTime;
    bool public automationActive = true;
    bool public emergencyPause = false;

    // Token configuration
    IERC20 public immutable usdc;
    uint256 public constant TICKET_PRICE = 2 * 10**6; // 2 USDC (6 decimales)
    uint256 public constant MAX_TICKETS_PER_WALLET = 100;

    // Prize pools
    uint256 public constant DAILY_TO_RESERVES = 20; // 20%
    uint256 public constant DAILY_TO_MAIN_POOLS = 80; // 80%
    
    uint256 public constant FIRST_PRIZE = 80;  // 80% del 80%
    uint256 public constant SECOND_PRIZE = 10; // 10% del 80%
    uint256 public constant THIRD_PRIZE = 5;   // 5% del 80%
    uint256 public constant DEVELOPMENT = 5;   // 5% del 80%

    // Mapping de tickets a emojis
    mapping(uint256 => uint8[4]) public ticketEmojis;
    
    // Mapping de tickets a ronda
    mapping(uint256 => uint256) public ticketRound;
    
    // Mapping de ronda a números ganadores
    mapping(uint256 => uint8[4]) public roundWinners;
    
    // Mapping de ronda a premios
    mapping(uint256 => uint256) public roundPrizes;
    
    // Mapping de ronda a estado de pago
    mapping(uint256 => bool) public roundPaid;

    // Contadores
    uint256 private _tokenIdCounter;
    uint256 public totalDrawsExecuted;
    uint256 public totalReservesProcessed;
    
    // Eventos
    event TicketMinted(address indexed player, uint256 indexed tokenId, uint8[4] emojis);
    event DrawRequested(uint256 indexed requestId, uint256 indexed round);
    event DrawCompleted(uint256 indexed round, uint8[4] winningEmojis);
    event PrizeClaimed(address indexed winner, uint256 indexed tokenId, uint256 amount);
    event ReservesPaid(uint256 amount);
    event EmergencyPaused(bool paused);

    constructor(
        address _usdcAddress,
        uint64 _subscriptionId
    ) 
        ERC721("LottoMoji Ticket", "LMOJI")
        VRFConsumerBaseV2Plus(0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE) // VRF Coordinator Base Sepolia
        Ownable(msg.sender)
    {
        i_vrfCoordinator = IVRFCoordinatorV2Plus(0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE);
        usdc = IERC20(_usdcAddress);
        subscriptionId = _subscriptionId;
        lastDrawTime = block.timestamp - (block.timestamp % DRAW_INTERVAL) + drawTimeUTC;
        lastMaintenanceTime = block.timestamp;
    }

    // Funciones de mint
    function mint(uint8[4] memory emojis) public nonReentrant {
        require(!emergencyPause, "Sistema en pausa de emergencia");
        require(validateEmojiSelection(emojis), "Emoji invalido");
        require(balanceOf(msg.sender) < MAX_TICKETS_PER_WALLET, "Limite de tickets alcanzado");
        
        // Transferir USDC
        require(usdc.transferFrom(msg.sender, address(this), TICKET_PRICE), "Transferencia fallida");
        
        // Mint NFT
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        
        // Guardar emojis y ronda
        ticketEmojis[tokenId] = emojis;
        ticketRound[tokenId] = getCurrentRound();
        
        emit TicketMinted(msg.sender, tokenId, emojis);
    }

    // Funciones de sorteo
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        bool timeToMaintenance = (block.timestamp - lastMaintenanceTime) >= 1 hours;
        bool timeForDraw = block.timestamp >= lastDrawTime + DRAW_INTERVAL;
        upkeepNeeded = automationActive && !emergencyPause && (timeToMaintenance || timeForDraw);
        return (upkeepNeeded, "");
    }

    function performUpkeep(bytes calldata) external override {
        bool timeToMaintenance = (block.timestamp - lastMaintenanceTime) >= 1 hours;
        bool timeForDraw = block.timestamp >= lastDrawTime + DRAW_INTERVAL;
        
        require(automationActive && !emergencyPause && (timeToMaintenance || timeForDraw), "Upkeep no necesario");
        
        if (timeForDraw) {
            requestRandomDraw();
            lastDrawTime = block.timestamp - (block.timestamp % DRAW_INTERVAL) + drawTimeUTC;
        }
        
        if (timeToMaintenance) {
            processReserves();
            lastMaintenanceTime = block.timestamp;
        }
    }

    function requestRandomDraw() internal {
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
        
        uint256 requestId = i_vrfCoordinator.requestRandomWords(req);
        emit DrawRequested(requestId, getCurrentRound());
    }

    function fulfillRandomWords(uint256, uint256[] calldata randomWords) internal override {
        uint256 currentRound = getCurrentRound();
        uint8[4] memory winningNumbers;
        
        // Generar 4 números aleatorios entre 0 y 24
        for (uint256 i = 0; i < 4; i++) {
            winningNumbers[i] = uint8(randomWords[i] % EMOJI_COUNT);
        }
        
        roundWinners[currentRound] = winningNumbers;
        totalDrawsExecuted++;
        
        emit DrawCompleted(currentRound, winningNumbers);
    }

    // Funciones de premios
    function claimPrize(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "No eres el dueno del ticket");
        require(!roundPaid[ticketRound[tokenId]], "Premios ya pagados para esta ronda");
        
        uint256 matches = countMatches(tokenId);
        require(matches > 1, "No hay premio para reclamar");
        
        uint256 prize = calculatePrize(matches, ticketRound[tokenId]);
        require(prize > 0, "No hay premio disponible");
        
        require(usdc.transfer(msg.sender, prize), "Error en transferencia del premio");
        
        emit PrizeClaimed(msg.sender, tokenId, prize);
    }

    function countMatches(uint256 tokenId) public view returns (uint256) {
        uint256 round = ticketRound[tokenId];
        uint8[4] memory ticket = ticketEmojis[tokenId];
        uint8[4] memory winners = roundWinners[round];
        uint256 matches = 0;
        
        for (uint256 i = 0; i < 4; i++) {
            if (ticket[i] == winners[i]) matches++;
        }
        
        return matches;
    }

    function calculatePrize(uint256 matches, uint256 round) public view returns (uint256) {
        if (matches < 2 || roundPaid[round]) return 0;
        
        uint256 poolAmount = roundPrizes[round];
        uint256 prize = 0;
        
        if (matches == 4) {
            prize = (poolAmount * FIRST_PRIZE) / 100;
        } else if (matches == 3) {
            prize = (poolAmount * SECOND_PRIZE) / 100;
        } else if (matches == 2) {
            prize = (poolAmount * THIRD_PRIZE) / 100;
        }
        
        return prize;
    }

    // Funciones de reservas
    function processReserves() internal {
        uint256 balance = usdc.balanceOf(address(this));
        if (balance == 0) return;
        
        uint256 reserveAmount = (balance * DAILY_TO_RESERVES) / 100;
        uint256 poolAmount = balance - reserveAmount;
        
        // Actualizar premios de la ronda actual
        roundPrizes[getCurrentRound()] = poolAmount;
        
        // Marcar ronda anterior como pagada
        if (getCurrentRound() > 0) {
            roundPaid[getCurrentRound() - 1] = true;
        }
        
        totalReservesProcessed += reserveAmount;
        emit ReservesPaid(reserveAmount);
    }

    // Funciones de utilidad
    function getCurrentRound() public view returns (uint256) {
        return totalDrawsExecuted;
    }

    function validateEmojiSelection(uint8[4] memory emojis) public pure returns (bool) {
        for (uint256 i = 0; i < 4; i++) {
            if (emojis[i] >= EMOJI_COUNT) return false;
        }
        return true;
    }

    function getTicketInfo(uint256 tokenId) public view returns (
        address owner,
        uint8[4] memory emojis,
        uint256 round,
        uint256 matches
    ) {
        owner = ownerOf(tokenId);
        emojis = ticketEmojis[tokenId];
        round = ticketRound[tokenId];
        matches = countMatches(tokenId);
    }

    // Funciones de emergencia
    function toggleEmergencyPause() public onlyOwner {
        emergencyPause = !emergencyPause;
        emit EmergencyPaused(emergencyPause);
    }

    function toggleAutomation() public onlyOwner {
        automationActive = !automationActive;
    }

    function emergencyWithdraw() external onlyOwner nonReentrant {
        require(emergencyPause, "Sistema debe estar en pausa");
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No hay balance para retirar");
        require(usdc.transfer(msg.sender, balance), "Error en transferencia");
    }

    function setDrawTime(uint256 _drawTimeUTC) public onlyOwner {
        drawTimeUTC = _drawTimeUTC;
        lastDrawTime = block.timestamp - (block.timestamp % DRAW_INTERVAL) + drawTimeUTC;
    }

    // Funciones de ERC721
    function name() public pure override returns (string memory) {
        return "LottoMoji Ticket";
    }

    function symbol() public pure override returns (string memory) {
        return "LMOJI";
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token no existe");
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(
                bytes(
                    string(
                        abi.encodePacked(
                            '{"name":"LottoMoji Ticket #',
                            tokenId.toString(),
                            '","description":"A LottoMoji lottery ticket","attributes":[{"trait_type":"Emojis","value":"',
                            _emojiArrayToString(ticketEmojis[tokenId]),
                            '"},{"trait_type":"Round","value":"',
                            ticketRound[tokenId].toString(),
                            '"}]}'
                        )
                    )
                )
            )
        ));
    }

    function _emojiArrayToString(uint8[4] memory emojis) internal pure returns (string memory) {
        return string(abi.encodePacked(
            uint256(emojis[0]).toString(), ",",
            uint256(emojis[1]).toString(), ",",
            uint256(emojis[2]).toString(), ",",
            uint256(emojis[3]).toString()
        ));
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return ownerOf(tokenId) != address(0);
    }

    function _safeMint(address to, uint256 tokenId) internal override {
        _mint(to, tokenId);
        require(
            _checkOnERC721Received(address(0), to, tokenId, ""),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    function _mint(address to, uint256 tokenId) internal override {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);

        _afterTokenTransfer(address(0), to, tokenId);
    }

    function _burn(uint256 tokenId) internal virtual override {
        super._burn(tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal override {
        require(ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to the zero address");

        _beforeTokenTransfer(from, to, tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);

        _afterTokenTransfer(from, to, tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _afterTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
        super._afterTokenTransfer(from, to, tokenId);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) internal returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    // Funciones de ERC721Enumerable
    function totalSupply() public view override(ERC721Enumerable, IERC721Enumerable) returns (uint256) {
        return _tokenIdCounter;
    }

    function tokenByIndex(uint256 index) public view override(ERC721Enumerable, IERC721Enumerable) returns (uint256) {
        require(index < totalSupply(), "ERC721Enumerable: global index out of bounds");
        return index;
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) public view override(ERC721Enumerable, IERC721Enumerable) returns (uint256) {
        require(index < balanceOf(owner), "ERC721Enumerable: owner index out of bounds");
        uint256 count = 0;
        for (uint256 i = 0; i < totalSupply(); i++) {
            if (ownerOf(i) == owner) {
                if (count == index) return i;
                count++;
            }
        }
        revert("ERC721Enumerable: owner index out of bounds");
    }

    // Funciones de ERC721
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    function balanceOf(address owner) public view override(ERC721, IERC721) returns (uint256) {
        require(owner != address(0), "ERC721: address zero is not a valid owner");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view override(ERC721, IERC721) returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    function approve(address to, uint256 tokenId) public override(ERC721, IERC721) {
        address owner = ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");
        require(
            msg.sender == owner || isApprovedForAll(owner, msg.sender),
            "ERC721: approve caller is not token owner or approved for all"
        );
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public override(ERC721, IERC721) {
        require(msg.sender != operator, "ERC721: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function getApproved(uint256 tokenId) public view override(ERC721, IERC721) returns (address) {
        require(_exists(tokenId), "ERC721: invalid token ID");
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) public view override(ERC721, IERC721) returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not token owner or approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override(ERC721, IERC721) {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not token owner or approved");
        _safeTransfer(from, to, tokenId, data);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal override {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _increaseBalance(address account, uint128 value) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
} 