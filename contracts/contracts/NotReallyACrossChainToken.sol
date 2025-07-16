// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev The on-chain address of the XCM (Cross-Consensus Messaging) precompile.
address constant XCM_PRECOMPILE_ADDRESS = address(0xA0000);

interface IXcm {
    struct Weight {
        uint64 refTime;
        uint64 proofSize;
    }

    function execute(bytes calldata message, Weight calldata weight) external;
    function send(bytes calldata destination, bytes calldata message) external;
    function weighMessage(bytes calldata message) external view returns (Weight memory weight);
}

contract NotReallyACrossChainToken is ERC20 {    
    // Errors
    error NoValueSent();
    error InsufficientTokens();
    error XcmExecutionFailed(bytes reason);

    // Events
    event RedeemSuccess(address indexed user, uint256 amount);

    constructor() ERC20("NotReallyACrossChainToken", "NRXCT") {}

    function mint() public payable {
        if (msg.value == 0) revert NoValueSent();
        _mint(msg.sender, msg.value);
    }

    function redeem(uint256 amount, bytes memory message) public {
        if (balanceOf(msg.sender) < amount) revert InsufficientTokens();
        _burn(msg.sender, amount);

        IXcm.Weight memory weight = IXcm(XCM_PRECOMPILE_ADDRESS).weighMessage(message);

        try IXcm(XCM_PRECOMPILE_ADDRESS).execute(message, weight) {
            emit RedeemSuccess(msg.sender, amount);
        } catch (bytes memory reason) {
            revert XcmExecutionFailed(reason);
        }
    }
}
