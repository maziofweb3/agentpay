// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./APAYToken.sol";

interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function totalSupply() external view returns (uint256);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
}

/**
 * @title AgentPayHybridZap
 * @notice UUPS Upgradeable Production Single-Sided Liquidity Router for BotChain Mainnet (Chain ID 677).
 *
 * Lifecycle:
 * - Phase 1 (APAY Total Supply < 1B): Mints matching APAY based on live pool reserves,
 *   pairs 100% of user USDT/BOT deposit with minted APAY into BDEX V2, and delivers LP tokens to user.
 * - Phase 2 (APAY Total Supply = 1B Cap): Zero new mints. Optimally swaps ~50% deposit for APAY
 *   on BDEX V2, pairs with remaining deposit, and delivers LP tokens to user.
 */
contract AgentPayHybridZap is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;
    using SafeERC20 for APAYToken;

    uint256 public constant MAX_SUPPLY_CAP = 1_000_000_000 * 10**18; // 1 Billion APAY

    APAYToken public apayToken;
    address public wbot;
    address public usdt;
    IUniswapV2Router02 public router;
    IUniswapV2Factory public factory;

    event ZapIn(
        address indexed recipient,
        address indexed inputToken,
        uint256 amountIn,
        uint256 apayMinted,
        uint256 lpReceived,
        bool isMintPhase
    );
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the UUPS Proxy instance
     */
    function initialize(
        address initialOwner,
        address _apayToken,
        address _wbot,
        address _usdt,
        address _router
    ) external initializer {
        require(initialOwner != address(0), "ZAP: invalid owner");
        require(_apayToken != address(0), "ZAP: invalid apay");
        require(_wbot != address(0), "ZAP: invalid wbot");
        require(_usdt != address(0), "ZAP: invalid usdt");
        require(_router != address(0), "ZAP: invalid router");

        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        apayToken = APAYToken(_apayToken);
        wbot = _wbot;
        usdt = _usdt;
        router = IUniswapV2Router02(_router);
        factory = IUniswapV2Factory(IUniswapV2Router02(_router).factory());
    }

    receive() external payable {
        // Accept native BOT refunds from WBOT
    }

    /**
     * @notice Add single-sided liquidity using ERC-20 tokens (e.g. USDT, WBOT)
     */
    function zapInToken(
        address inputToken,
        uint256 amountIn,
        uint256 minLpOut,
        address recipient,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256 lpAmount) {
        require(amountIn > 0, "ZAP: zero amount");
        require(recipient != address(0), "ZAP: zero recipient");
        require(block.timestamp <= deadline, "ZAP: deadline expired");
        require(inputToken == usdt || inputToken == wbot, "ZAP: unsupported token");

        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), amountIn);
        return _executeZap(inputToken, amountIn, minLpOut, recipient, deadline);
    }

    /**
     * @notice Add single-sided liquidity using native BOT
     */
    function zapInETH(
        uint256 minLpOut,
        address recipient,
        uint256 deadline
    ) external payable nonReentrant whenNotPaused returns (uint256 lpAmount) {
        require(msg.value > 0, "ZAP: zero native amount");
        require(recipient != address(0), "ZAP: zero recipient");
        require(block.timestamp <= deadline, "ZAP: deadline expired");

        IWETH(wbot).deposit{value: msg.value}();
        lpAmount = _executeZap(wbot, msg.value, minLpOut, recipient, deadline);

        // Refund any leftover native BOT
        uint256 leftoverWbot = IERC20(wbot).balanceOf(address(this));
        if (leftoverWbot > 0) {
            IWETH(wbot).withdraw(leftoverWbot);
            (bool success, ) = recipient.call{value: leftoverWbot}("");
            require(success, "ZAP: BOT refund failed");
        }
        return lpAmount;
    }

    /**
     * @dev Internal execution routing between Phase 1 (Mint) and Phase 2 (Classic Swap Zap)
     */
    function _executeZap(
        address inputToken,
        uint256 amountIn,
        uint256 minLpOut,
        address recipient,
        uint256 deadline
    ) internal returns (uint256 lpAmount) {
        address pair = factory.getPair(inputToken, address(apayToken));
        require(pair != address(0), "ZAP: pair does not exist");

        (uint256 reserveIn, uint256 reserveApay) = _getReserves(pair, inputToken);
        require(reserveIn > 0 && reserveApay > 0, "ZAP: empty pool reserves");

        uint256 currentSupply = apayToken.totalSupply();

        if (currentSupply < MAX_SUPPLY_CAP) {
            uint256 targetMint = (amountIn * reserveApay) / reserveIn;
            uint256 maxMintable = MAX_SUPPLY_CAP - currentSupply;

            if (targetMint <= maxMintable) {
                return _executeMintZap(inputToken, amountIn, targetMint, minLpOut, recipient, deadline);
            }
        }

        return _executeClassicZap(inputToken, amountIn, reserveIn, minLpOut, recipient, deadline);
    }

    /**
     * @dev Stage 1: Mint matching APAY and add 100% of user token into pool
     */
    function _executeMintZap(
        address inputToken,
        uint256 amountIn,
        uint256 targetMint,
        uint256 minLpOut,
        address recipient,
        uint256 deadline
    ) internal returns (uint256 lpAmount) {
        apayToken.mint(address(this), targetMint);

        IERC20(inputToken).forceApprove(address(router), amountIn);
        apayToken.forceApprove(address(router), targetMint);

        (, , lpAmount) = router.addLiquidity(
            inputToken,
            address(apayToken),
            amountIn,
            targetMint,
            0,
            0,
            recipient,
            deadline
        );

        require(lpAmount >= minLpOut, "ZAP: slippage limit exceeded");

        _refundTokenDust(inputToken, recipient);

        emit ZapIn(recipient, inputToken, amountIn, targetMint, lpAmount, true);
        return lpAmount;
    }

    /**
     * @dev Stage 2: 50/50 swap and add liquidity with zero minting
     */
    function _executeClassicZap(
        address inputToken,
        uint256 amountIn,
        uint256 reserveIn,
        uint256 minLpOut,
        address recipient,
        uint256 deadline
    ) internal returns (uint256 lpAmount) {
        uint256 swapAmount = _calculateOptimalSwapAmount(amountIn, reserveIn);
        require(swapAmount > 0 && swapAmount < amountIn, "ZAP: invalid swap calculation");

        IERC20(inputToken).forceApprove(address(router), swapAmount);

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = address(apayToken);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            address(this),
            deadline
        );

        uint256 apayBought = amounts[1];
        uint256 remainingInput = amountIn - swapAmount;

        IERC20(inputToken).forceApprove(address(router), remainingInput);
        apayToken.forceApprove(address(router), apayBought);

        (, , lpAmount) = router.addLiquidity(
            inputToken,
            address(apayToken),
            remainingInput,
            apayBought,
            0,
            0,
            recipient,
            deadline
        );

        require(lpAmount >= minLpOut, "ZAP: slippage limit exceeded");

        _refundTokenDust(inputToken, recipient);
        _refundTokenDust(address(apayToken), recipient);

        emit ZapIn(recipient, inputToken, amountIn, 0, lpAmount, false);
        return lpAmount;
    }

    /**
     * @notice Estimate the output of a single-token zap
     */
    function estimateZapIn(
        address inputToken,
        uint256 amountIn
    ) external view returns (bool isMintPhase, uint256 expectedApay, uint256 expectedLp) {
        if (amountIn == 0) return (false, 0, 0);

        address pair = factory.getPair(inputToken, address(apayToken));
        if (pair == address(0)) return (false, 0, 0);

        (uint256 reserveIn, uint256 reserveApay) = _getReserves(pair, inputToken);
        if (reserveIn == 0 || reserveApay == 0) return (false, 0, 0);

        uint256 totalLp = IUniswapV2Pair(pair).totalSupply();
        uint256 currentSupply = apayToken.totalSupply();

        if (currentSupply < MAX_SUPPLY_CAP) {
            uint256 targetMint = (amountIn * reserveApay) / reserveIn;
            if (currentSupply + targetMint <= MAX_SUPPLY_CAP) {
                uint256 estLp = totalLp > 0 ? (amountIn * totalLp) / reserveIn : Math.sqrt(amountIn * targetMint);
                return (true, targetMint, estLp);
            }
        }

        // Stage 2 estimation
        uint256 swapAmount = _calculateOptimalSwapAmount(amountIn, reserveIn);
        uint256 amountInWithFee = swapAmount * 997;
        uint256 apayBought = (amountInWithFee * reserveApay) / (reserveIn * 1000 + amountInWithFee);
        uint256 remainingInput = amountIn - swapAmount;
        uint256 estLpStage2 = totalLp > 0 ? Math.min(
            (remainingInput * totalLp) / (reserveIn + swapAmount),
            (apayBought * totalLp) / (reserveApay - apayBought)
        ) : 0;

        return (false, apayBought, estLpStage2);
    }

    /**
     * @notice Get pool statistics for UI display
     */
    function getPoolStats(
        address inputToken
    ) external view returns (
        address pairAddress,
        uint256 reserveToken,
        uint256 reserveApay,
        uint256 totalLpSupply,
        uint256 currentApaySupply,
        bool isMintingActive
    ) {
        pairAddress = factory.getPair(inputToken, address(apayToken));
        if (pairAddress != address(0)) {
            (reserveToken, reserveApay) = _getReserves(pairAddress, inputToken);
            totalLpSupply = IUniswapV2Pair(pairAddress).totalSupply();
        }
        currentApaySupply = apayToken.totalSupply();
        isMintingActive = currentApaySupply < MAX_SUPPLY_CAP;
    }

    /**
     * @dev Calculates optimal swap amount for Uniswap V2 (0.3% fee)
     */
    function _calculateOptimalSwapAmount(
        uint256 amountIn,
        uint256 reserveIn
    ) internal pure returns (uint256) {
        uint256 term1 = 1997 * 1997 * reserveIn;
        uint256 term2 = 3988000 * amountIn;
        uint256 root = Math.sqrt(reserveIn * (term1 + term2));
        uint256 numerator = root - (1997 * reserveIn);
        return numerator / 1994;
    }

    /**
     * @dev Resolves pair reserves in correct orientation
     */
    function _getReserves(
        address pair,
        address inputToken
    ) internal view returns (uint256 reserveIn, uint256 reserveApay) {
        IUniswapV2Pair v2Pair = IUniswapV2Pair(pair);
        (uint112 reserve0, uint112 reserve1, ) = v2Pair.getReserves();
        if (inputToken == v2Pair.token0()) {
            reserveIn = uint256(reserve0);
            reserveApay = uint256(reserve1);
        } else {
            reserveIn = uint256(reserve1);
            reserveApay = uint256(reserve0);
        }
    }

    /**
     * @dev Helper to refund any remaining dust
     */
    function _refundTokenDust(address token, address recipient) internal {
        if (token == wbot) return;
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(recipient, balance);
        }
    }

    // --- Admin & UUPS Upgrade Functions ---
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address token, address to) external onlyOwner {
        require(to != address(0), "ZAP: zero address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
            emit EmergencyWithdraw(token, to, balance);
        }
    }

    /**
     * @notice UUPS Upgrade Authorization Function (Owner Only)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
