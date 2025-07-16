// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
/// @dev The on-chain address of the XCM (Cross-Consensus Messaging) precompile.
address constant XCM_PRECOMPILE_ADDRESS = address(0xA0000);

/// @title XCM Precompile Interface
/// @notice A low-level interface for interacting with `pallet_xcm`.
/// It forwards calls directly to the corresponding dispatchable functions,
/// providing access to XCM execution and message passing.
/// @dev Documentation:
/// @dev - XCM: https://docs.polkadot.com/develop/interoperability
/// @dev - SCALE codec: https://docs.polkadot.com/polkadot-protocol/parachain-basics/data-encoding
/// @dev - Weights: https://docs.polkadot.com/polkadot-protocol/parachain-basics/blocks-transactions-fees/fees/#transactions-weights-and-fees
interface IXcm {
    /// @notice Weight v2 used for measurement for an XCM execution
    struct Weight {
        /// @custom:property The computational time used to execute some logic based on reference hardware.
        uint64 refTime;
        /// @custom:property The size of the proof needed to execute some logic.
        uint64 proofSize;
    }

    /// @notice Executes an XCM message locally on the current chain with the caller's origin.
    /// @dev Internally calls `pallet_xcm::execute`.
    /// @param message A SCALE-encoded Versioned XCM message.
    /// @param weight The maximum allowed `Weight` for execution.
    /// @dev Call @custom:function weighMessage(message) to ensure sufficient weight allocation.
    function execute(bytes calldata message, Weight calldata weight) external;

    /// @notice Sends an XCM message to another parachain or consensus system.
    /// @dev Internally calls `pallet_xcm::send`.
    /// @param destination SCALE-encoded destination MultiLocation.
    /// @param message SCALE-encoded Versioned XCM message.
    function send(bytes calldata destination, bytes calldata message) external;

    /// @notice Estimates the `Weight` required to execute a given XCM message.
    /// @param message SCALE-encoded Versioned XCM message to analyze.
    /// @return weight Struct containing estimated `refTime` and `proofSize`.
    function weighMessage(bytes calldata message)
        external
        view
        returns (Weight memory weight);
}

/// @title XcmNFTMarketPlace
/// @dev NFT marketplace contract enabling cross-chain trading via XCM messages
/// @notice Allows minting NFTs with listing fees and trading via cross-chain messaging
contract XcmNFTMarketPlace is ERC721URIStorage, ERC721Holder {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    /// @dev Emitted when an NFT is successfully traded via XCM
    /// @param tokenId The ID of the traded NFT
    /// @param tokensRecieved Amount of tokens received in the trade
    /// @param xcmMessage The XCM message used for the trade
    event NFTTraded(
        uint256 indexed tokenId,
        uint256 indexed tokensRecieved,
        bytes indexed xcmMessage
    );

    /// @dev Thrown when NFT trade execution fails
    /// @param reason The failure reason from the XCM execution
    /// @param message The XCM message that failed
    /// @param tokenId The token ID that failed to trade
    error NFTTradeFailed(bytes reason, bytes message, uint256 tokenId);

    /// @dev Thrown when the marketplace is not approved to transfer the NFT
    error MarketPlaceNotApproved();

    /// @dev Thrown when insufficient ether is provided for operations
    error NotEnoughEther();

    /// @dev Mapping of token IDs to their listing status/metadata
    mapping(uint256 => string) public listedTokens;

    /// @dev Mapping of player addresses to their owned NFT token IDs
    /// @notice This isnt ideal but because its a showcase
    /// @notice Will allow it :XD
    mapping(address => uint256[]) public playerNFTs;

    /// @dev Minimum tokens required for exchange operations
    uint256 public MIN_EXCHANGE_TOKENS = 10 ether;

    /// @dev Minimum ether required to list/mint an NFT
    uint256 public MIN_LISTING_COST = 0.5 ether;

    /// @dev Initializes the NFT marketplace contract
    constructor() ERC721("XCM NFT MarketPlace", "XCMNFT") {}

    /// @dev Mints a new NFT with the provided metadata URI
    /// @param tokenURI The metadata URI for the NFT
    /// @notice Requires exact payment of MIN_LISTING_COST
    /// @notice Automatically adds the minted NFT to the sender's collection
    function mintNFT(string memory tokenURI) public payable {
        require(msg.value == MIN_LISTING_COST, NotEnoughEther());
        uint256 tokenId = _tokenIds.current();
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        playerNFTs[msg.sender].push(tokenId);
    }

    /// @dev Trades an NFT by executing an XCM message and burning the token
    /// @param tokenId The ID of the NFT to trade
    /// @param message The XCM message to execute for the trade
    /// @notice The xcm message being execute essentially transfers 
    /// @notice The tokens to a Polkadot address 
    /// @notice Requires the marketplace to be approved for the token
    /// @notice Burns the NFT upon successful trade execution
    /// @notice Emits NFTTraded event on success, reverts on failure
    function tradeToken(uint256 tokenId, bytes memory message) public {
        require(
            getApproved(tokenId) == address(this),
            MarketPlaceNotApproved()
        );
        IXcm.Weight memory weight = IXcm(XCM_PRECOMPILE_ADDRESS).weighMessage(
            message
        );

        try IXcm(XCM_PRECOMPILE_ADDRESS).execute(message, weight) {
            _burn(tokenId);
            emit NFTTraded(tokenId, MIN_EXCHANGE_TOKENS, message);
        } catch (bytes memory reason) {
            revert NFTTradeFailed(reason, message, tokenId);
        }
    }
}
