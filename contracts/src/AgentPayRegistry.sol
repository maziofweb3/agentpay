// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AgentPayRegistry
 * @dev Upgradeable (UUPS ERC-1967) on-chain registry & vault for recording AgentPay AI micropayments and prompt activity.
 */
contract AgentPayRegistry is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    event PromptRecorded(
        address indexed user,
        string agentId,
        string toolType,
        uint256 amountPaid,
        address indexed paymentAsset,
        uint256 timestamp
    );
    event PaymentReceived(
        address indexed user,
        address indexed token,
        uint256 amount,
        string tool
    );
    event TokensWithdrawn(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );
    event NativeWithdrawn(address indexed recipient, uint256 amount);

    /// @notice Arc USDC ERC-20 (6 decimals). Same address on Arc testnet and mainnet.
    address public constant USDC = 0x3600000000000000000000000000000000000000;

    mapping(address => uint256) public userPromptCounts;
    mapping(address => uint256) public totalVolumePerAsset;
    uint256 public totalPromptsRecorded;

    /// @notice Default x402 asset. address(0) on BotChain deploys until configured.
    address public defaultPaymentToken;
    /// @notice APAY on this chain. address(0) until setApayToken.
    address public apayToken;
    mapping(address => bool) public acceptedTokens;

    event DefaultPaymentTokenUpdated(address indexed token);
    event ApayTokenSet(address indexed token);
    event TokenAccepted(address indexed token, bool accepted);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function paymentToken() public view returns (address) {
        return defaultPaymentToken;
    }

    /// @notice Arc-only: USDC default, APAY slot empty. Reverts on other chain ids.
    function configureArc() external onlyOwner {
        require(block.chainid == 5042002 || block.chainid == 5042, "AgentPayRegistry: not Arc");
        acceptedTokens[USDC] = true;
        defaultPaymentToken = USDC;
        emit TokenAccepted(USDC, true);
        emit DefaultPaymentTokenUpdated(USDC);
    }

    function setApayToken(address token) external onlyOwner {
        require(token != address(0), "AgentPayRegistry: zero APAY");
        apayToken = token;
        acceptedTokens[token] = true;
        emit ApayTokenSet(token);
        emit TokenAccepted(token, true);
    }

    function setTokenAccepted(address token, bool accepted) external onlyOwner {
        require(token != address(0), "AgentPayRegistry: zero token");
        acceptedTokens[token] = accepted;
        emit TokenAccepted(token, accepted);
    }

    function setDefaultPaymentToken(address token) external onlyOwner {
        require(acceptedTokens[token], "AgentPayRegistry: token not accepted");
        defaultPaymentToken = token;
        emit DefaultPaymentTokenUpdated(token);
    }

    function _requireAccepted(address token) internal view {
        if (defaultPaymentToken != address(0)) {
            require(acceptedTokens[token], "AgentPayRegistry: token not accepted");
        }
    }

    receive() external payable {}

    fallback() external payable {}

    function recordPrompt(
        address user,
        string calldata agentId,
        string calldata toolType,
        uint256 amountPaid,
        address paymentAsset
    ) external onlyOwner whenNotPaused {
        _requireAccepted(paymentAsset);
        userPromptCounts[user] += 1;
        totalPromptsRecorded += 1;
        if (amountPaid > 0) {
            totalVolumePerAsset[paymentAsset] += amountPaid;
        }
        emit PromptRecorded(
            user,
            agentId,
            toolType,
            amountPaid,
            paymentAsset,
            block.timestamp
        );
    }

    function recordPaymentAndPrompt(
        address user,
        string calldata tool,
        address token,
        uint256 amount
    ) external onlyOwner whenNotPaused {
        _requireAccepted(token);
        userPromptCounts[user] += 1;
        totalPromptsRecorded += 1;
        if (amount > 0) {
            totalVolumePerAsset[token] += amount;
        }
        emit PromptRecorded(
            user,
            "agentpay-ai",
            tool,
            amount,
            token,
            block.timestamp
        );
        emit PaymentReceived(user, token, amount, tool);
    }

    function withdrawTokens(
        address token,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than zero");
        IERC20(token).transfer(recipient, amount);
        emit TokensWithdrawn(token, recipient, amount);
    }

    function withdrawNative(
        address payable recipient,
        uint256 amount
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than zero");
        require(address(this).balance >= amount, "Insufficient native balance");
        recipient.transfer(amount);
        emit NativeWithdrawn(recipient, amount);
    }
}
