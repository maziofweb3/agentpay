// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/APAYToken.sol";
import "../src/AgentPayHybridZap.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Tether USD", "USDT") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockWBOT is ERC20 {
    constructor() ERC20("Wrapped BOT", "WBOT") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool s, ) = msg.sender.call{value: amount}("");
        require(s, "ETH transfer failed");
    }
}

contract MockV2Pair is ERC20 {
    address public token0;
    address public token1;
    uint112 public reserve0;
    uint112 public reserve1;

    constructor(address _token0, address _token1) ERC20("BDEX V2 LP", "BDEX-LP") {
        token0 = _token0;
        token1 = _token1;
    }

    function setReserves(uint112 _r0, uint112 _r1) external {
        reserve0 = _r0;
        reserve1 = _r1;
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, uint32(block.timestamp));
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockV2Factory {
    mapping(address => mapping(address => address)) public pairs;

    function setPair(address a, address b, address pair) external {
        pairs[a][b] = pair;
        pairs[b][a] = pair;
    }

    function getPair(address a, address b) external view returns (address) {
        return pairs[a][b];
    }
}

contract MockV2Router {
    address public factory;
    address public WETH;

    constructor(address _factory, address _weth) {
        factory = _factory;
        WETH = _weth;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint,
        uint,
        address to,
        uint
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBDesired);

        address pair = MockV2Factory(factory).getPair(tokenA, tokenB);
        liquidity = (amountADesired + amountBDesired) / 2;
        MockV2Pair(pair).mint(to, liquidity);

        return (amountADesired, amountBDesired, liquidity);
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint,
        address[] calldata path,
        address to,
        uint
    ) external returns (uint[] memory amounts) {
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn * 70000; // Simulated price ratio

        if (IERC20(path[1]).balanceOf(address(this)) >= amounts[1]) {
            IERC20(path[1]).transfer(to, amounts[1]);
        }
        return amounts;
    }
}

contract AgentPayHybridZapTest is Test {
    APAYToken public apay;
    MockUSDT public usdt;
    MockWBOT public wbot;
    MockV2Factory public factory;
    MockV2Router public router;
    MockV2Pair public usdtApayPair;
    MockV2Pair public wbotApayPair;

    AgentPayHybridZap public zapImplementation;
    ERC1967Proxy public zapProxy;
    AgentPayHybridZap public zap;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function setUp() public {
        // 1. Deploy APAY UUPS Proxy
        APAYToken implementation = new APAYToken();
        bytes memory initData = abi.encodeWithSelector(
            APAYToken.initialize.selector,
            address(this),
            1_000_000 * 10**18 // 1M Initial Supply
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        apay = APAYToken(address(proxy));

        // 2. Deploy Mock Tokens
        usdt = new MockUSDT();
        wbot = new MockWBOT();

        // 3. Deploy Mock Factory & Pairs
        factory = new MockV2Factory();
        router = new MockV2Router(address(factory), address(wbot));

        // Create USDT/APAY pair: reserveUSDT = 13_000 * 1e6 (13k USDT), reserveAPAY = 1_000_000 * 1e18
        usdtApayPair = new MockV2Pair(address(usdt), address(apay));
        usdtApayPair.setReserves(13_000 * 1e6, uint112(1_000_000 * 10**18));
        usdtApayPair.mint(address(this), 100_000 * 1e18); // Initial LP supply
        factory.setPair(address(usdt), address(apay), address(usdtApayPair));

        // Create WBOT/APAY pair: reserveWBOT = 100 * 1e18, reserveAPAY = 1_000_000 * 1e18
        wbotApayPair = new MockV2Pair(address(wbot), address(apay));
        wbotApayPair.setReserves(uint112(100 * 10**18), uint112(1_000_000 * 10**18));
        wbotApayPair.mint(address(this), 100_000 * 1e18);
        factory.setPair(address(wbot), address(apay), address(wbotApayPair));

        // 4. Deploy AgentPayHybridZap via UUPS ERC1967Proxy
        zapImplementation = new AgentPayHybridZap();
        bytes memory zapInitData = abi.encodeWithSelector(
            AgentPayHybridZap.initialize.selector,
            address(this),
            address(apay),
            address(wbot),
            address(usdt),
            address(router)
        );
        zapProxy = new ERC1967Proxy(address(zapImplementation), zapInitData);
        zap = AgentPayHybridZap(payable(address(zapProxy)));

        // 5. Authorize Zap Proxy as Minter on APAY
        apay.setMinter(address(zap), true);

        // Fund Alice
        usdt.mint(alice, 10_000 * 1e6); // 10k USDT
        vm.deal(alice, 100 ether); // 100 native BOT

        // Fund Router with APAY for simulated Stage 2 swaps
        apay.mint(address(router), 10_000_000 * 10**18);
    }

    function test_InitialConfiguration() public view {
        assertEq(address(zap.apayToken()), address(apay));
        assertEq(zap.wbot(), address(wbot));
        assertEq(zap.usdt(), address(usdt));
        assertEq(address(zap.router()), address(router));
        assertEq(zap.owner(), address(this));
        assertTrue(apay.isMinter(address(zap)));
    }

    function test_UUPS_Upgrade() public {
        AgentPayHybridZap newImpl = new AgentPayHybridZap();
        zap.upgradeToAndCall(address(newImpl), "");

        // State remains intact
        assertEq(address(zap.apayToken()), address(apay));
        assertEq(zap.wbot(), address(wbot));
        assertEq(zap.usdt(), address(usdt));
        assertEq(zap.owner(), address(this));
    }

    function test_Stage1_ZapInUSDT_Success() public {
        uint256 usdtDeposit = 100 * 1e6; // 100 USDT
        uint256 supplyBefore = apay.totalSupply();

        vm.startPrank(alice);
        usdt.approve(address(zap), usdtDeposit);

        uint256 lpAmount = zap.zapInToken(
            address(usdt),
            usdtDeposit,
            0,
            alice,
            block.timestamp + 15 minutes
        );
        vm.stopPrank();

        assertTrue(lpAmount > 0);
        assertEq(usdtApayPair.balanceOf(alice), lpAmount);

        // Verify that APAY total supply increased (Minter phase active)
        uint256 supplyAfter = apay.totalSupply();
        assertTrue(supplyAfter > supplyBefore);
    }

    function test_Stage1_ZapInNativeBOT_Success() public {
        uint256 botDeposit = 1 ether; // 1 native BOT
        uint256 supplyBefore = apay.totalSupply();

        vm.startPrank(alice);
        uint256 lpAmount = zap.zapInETH{value: botDeposit}(
            0,
            alice,
            block.timestamp + 15 minutes
        );
        vm.stopPrank();

        assertTrue(lpAmount > 0);
        assertEq(wbotApayPair.balanceOf(alice), lpAmount);

        // Verify supply increase
        uint256 supplyAfter = apay.totalSupply();
        assertTrue(supplyAfter > supplyBefore);
    }

    function test_Stage2_TransitionWhenCapReached() public {
        // Mint APAY until total supply is at 1 Billion cap
        uint256 neededToCap = zap.MAX_SUPPLY_CAP() - apay.totalSupply();
        apay.mint(address(this), neededToCap);
        assertEq(apay.totalSupply(), zap.MAX_SUPPLY_CAP());

        // Alice zaps with USDT -> Should execute Stage 2 (Classic Zap, 0 new mints)
        uint256 usdtDeposit = 100 * 1e6;
        uint256 supplyBefore = apay.totalSupply();

        vm.startPrank(alice);
        usdt.approve(address(zap), usdtDeposit);

        uint256 lpAmount = zap.zapInToken(
            address(usdt),
            usdtDeposit,
            0,
            alice,
            block.timestamp + 15 minutes
        );
        vm.stopPrank();

        assertTrue(lpAmount > 0);
        // Total supply MUST NOT exceed 1B cap
        assertEq(apay.totalSupply(), supplyBefore);
        assertEq(apay.totalSupply(), zap.MAX_SUPPLY_CAP());
    }

    function test_EstimateZapIn() public view {
        (bool isMintPhase, uint256 expectedApay, uint256 expectedLp) = zap.estimateZapIn(address(usdt), 100 * 1e6);
        assertTrue(isMintPhase);
        assertTrue(expectedApay > 0);
        assertTrue(expectedLp > 0);
    }

    function test_GetPoolStats() public view {
        (
            address pairAddr,
            uint256 reserveToken,
            uint256 reserveApay,
            uint256 totalLpSupply,
            uint256 currentApaySupply,
            bool isMintingActive
        ) = zap.getPoolStats(address(usdt));

        assertEq(pairAddr, address(usdtApayPair));
        assertEq(reserveToken, 13_000 * 1e6);
        assertEq(reserveApay, 1_000_000 * 1e18);
        assertEq(totalLpSupply, 100_000 * 1e18);
        assertEq(currentApaySupply, apay.totalSupply());
        assertTrue(isMintingActive);
    }

    function test_Revert_Paused() public {
        zap.pause();

        vm.startPrank(alice);
        usdt.approve(address(zap), 100 * 1e6);
        vm.expectRevert();
        zap.zapInToken(address(usdt), 100 * 1e6, 0, alice, block.timestamp + 15 minutes);
        vm.stopPrank();
    }

    function test_Revert_DeadlineExpired() public {
        vm.warp(1000);
        vm.startPrank(alice);
        usdt.approve(address(zap), 100 * 1e6);
        vm.expectRevert("ZAP: deadline expired");
        zap.zapInToken(address(usdt), 100 * 1e6, 0, alice, 500);
        vm.stopPrank();
    }
}
