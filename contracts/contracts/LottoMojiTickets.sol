// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LottoMoji Soulbound Tickets
 * @dev NFTs soulbound que representan tickets de lotería válidos solo por un día
 */
contract LottoMojiTickets is ERC721, AccessControl, ReentrancyGuard {
    bytes32 public constant LOTTERY_ROLE = keccak256("LOTTERY_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint256 private _nextTokenId = 1;
    
    // Estructura del ticket
    struct Ticket {
        uint256[4] emojis;      // 4 emojis del ticket
        uint256 roundId;        // ID de la ronda
        address player;         // Dueño del ticket
        bool isUsed;           // Si ya se usó para reclamar premio
        bool isFreeTicket;     // Si es un ticket gratis
        uint256 mintTimestamp; // Cuándo se mintó
        bytes32 paymentHash;   // Hash del pago asociado
    }
    
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256[]) public playerTickets;
    mapping(uint256 => uint256[]) public roundTickets;
    mapping(bytes32 => uint256) public paymentToTicket;
    
    // Eventos
    event TicketMinted(
        uint256 indexed tokenId,
        address indexed player,
        uint256 roundId,
        uint256[4] emojis,
        bool isFreeTicket
    );
    
    event TicketUsed(
        uint256 indexed tokenId,
        address indexed player,
        uint256 prizeAmount
    );
    
    event TicketBurned(
        uint256 indexed tokenId,
        address indexed player,
        uint256 roundId
    );
    
    modifier onlyLottery() {
        require(hasRole(LOTTERY_ROLE, msg.sender), "Only lottery contract");
        _;
    }
    
    modifier ticketOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        _;
    }
    
    constructor(address _lotteryContract) ERC721("LottoMoji Ticket", "LMTKT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LOTTERY_ROLE, _lotteryContract);
        _grantRole(MINTER_ROLE, _lotteryContract);
    }
    
    /**
     * @dev Mintear un nuevo ticket (solo por contrato de lotería)
     */
    function mintTicket(
        address player,
        uint256[4] memory emojis,
        uint256 roundId,
        bool isFreeTicket,
        bytes32 paymentHash
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(player != address(0), "Invalid player address");
        require(roundId > 0, "Invalid round ID");
        
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        
        // Mintear el NFT
        _safeMint(player, tokenId);
        
        // Guardar información del ticket
        tickets[tokenId] = Ticket({
            emojis: emojis,
            roundId: roundId,
            player: player,
            isUsed: false,
            isFreeTicket: isFreeTicket,
            mintTimestamp: block.timestamp,
            paymentHash: paymentHash
        });
        
        // Actualizar mapeos
        playerTickets[player].push(tokenId);
        roundTickets[roundId].push(tokenId);
        if (paymentHash != bytes32(0)) {
            paymentToTicket[paymentHash] = tokenId;
        }
        
        emit TicketMinted(tokenId, player, roundId, emojis, isFreeTicket);
        
        return tokenId;
    }
    
    /**
     * @dev Marcar ticket como usado para reclamar premio
     */
    function useTicket(uint256 tokenId) external onlyLottery {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        require(!tickets[tokenId].isUsed, "Ticket already used");
        require(isTicketValid(tokenId), "Ticket is not valid");
        
        tickets[tokenId].isUsed = true;
        
        emit TicketUsed(tokenId, tickets[tokenId].player, 0);
    }
    
    /**
     * @dev Verificar si un ticket es válido para la ronda actual
     */
    function isTicketValid(uint256 tokenId) public view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) return false;
        
        Ticket memory ticket = tickets[tokenId];
        
        // Ticket ya usado
        if (ticket.isUsed) return false;
        
        // Verificar que el ticket no haya expirado (válido solo por 24 horas)
        if (block.timestamp > ticket.mintTimestamp + 24 hours) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Obtener todos los tickets de un jugador para una ronda
     */
    function getPlayerTicketsForRound(
        address player, 
        uint256 roundId
    ) external view returns (uint256[] memory validTickets) {
        uint256[] memory allPlayerTickets = playerTickets[player];
        uint256 validCount = 0;
        
        // Contar tickets válidos primero
        for (uint256 i = 0; i < allPlayerTickets.length; i++) {
            uint256 tokenId = allPlayerTickets[i];
            if (tickets[tokenId].roundId == roundId && isTicketValid(tokenId)) {
                validCount++;
            }
        }
        
        // Crear array con el tamaño correcto
        validTickets = new uint256[](validCount);
        uint256 index = 0;
        
        // Llenar array con tickets válidos
        for (uint256 i = 0; i < allPlayerTickets.length; i++) {
            uint256 tokenId = allPlayerTickets[i];
            if (tickets[tokenId].roundId == roundId && isTicketValid(tokenId)) {
                validTickets[index] = tokenId;
                index++;
            }
        }
    }
    
    /**
     * @dev Obtener todos los tickets válidos de una ronda
     */
    function getRoundValidTickets(uint256 roundId) external view returns (uint256[] memory) {
        uint256[] memory allRoundTickets = roundTickets[roundId];
        uint256 validCount = 0;
        
        // Contar tickets válidos
        for (uint256 i = 0; i < allRoundTickets.length; i++) {
            if (isTicketValid(allRoundTickets[i])) {
                validCount++;
            }
        }
        
        // Crear array con tickets válidos
        uint256[] memory validTickets = new uint256[](validCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allRoundTickets.length; i++) {
            uint256 tokenId = allRoundTickets[i];
            if (isTicketValid(tokenId)) {
                validTickets[index] = tokenId;
                index++;
            }
        }
        
        return validTickets;
    }
    
    /**
     * @dev Obtener información completa de un ticket
     */
    function getTicketInfo(uint256 tokenId) external view returns (
        uint256[4] memory emojis,
        uint256 roundId,
        address player,
        bool isUsed,
        bool isFreeTicket,
        bool isValid,
        uint256 mintTimestamp,
        bytes32 paymentHash
    ) {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        
        Ticket memory ticket = tickets[tokenId];
        
        return (
            ticket.emojis,
            ticket.roundId,
            ticket.player,
            ticket.isUsed,
            ticket.isFreeTicket,
            isTicketValid(tokenId),
            ticket.mintTimestamp,
            ticket.paymentHash
        );
    }
    
    /**
     * @dev Quemar tickets expirados de una ronda (limpieza)
     */
    function burnExpiredTickets(uint256 roundId) external onlyLottery {
        uint256[] memory roundTicketsList = roundTickets[roundId];
        
        for (uint256 i = 0; i < roundTicketsList.length; i++) {
            uint256 tokenId = roundTicketsList[i];
            
            // Si el ticket existe y ha expirado, quemarlo
            if (_ownerOf(tokenId) != address(0) && !isTicketValid(tokenId) && !tickets[tokenId].isUsed) {
                address owner = ownerOf(tokenId);
                _burn(tokenId);
                
                emit TicketBurned(tokenId, owner, roundId);
            }
        }
    }
    
    /**
     * @dev Obtener ticket por hash de pago
     */
    function getTicketByPayment(bytes32 paymentHash) external view returns (uint256) {
        return paymentToTicket[paymentHash];
    }
    
    /**
     * @dev Override para hacer los tokens soulbound (no transferibles)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Permitir mint (from = address(0)) y burn (to = address(0))
        require(
            from == address(0) || to == address(0), 
            "Tickets are soulbound and cannot be transferred"
        );
        
        return super._update(to, tokenId, auth);
    }
    

    
    /**
     * @dev Obtener conteo total de tickets minteados
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
    
    /**
     * @dev Interface support
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
} 