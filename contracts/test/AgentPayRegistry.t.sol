// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentPayRegistry.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract AgentPayRegistryTest is Test {
    AgentPayRegistry public implementation;
    ERC1967Proxy public proxy;
    AgentPayRegistry public registry;

    address public owner = address(1);
    address public user1 = address(2);
    address public recipient = address(3);
    address public usdtAsset = address(0x75edC9335175Fc0552D51D48439F229c10420fe3);

    function setUp() public {
        vm.startPrank(owner);
        implementation = new AgentPayRegistry();
        bytes memory initData = abi.encodeWithSelector(AgentPayRegistry.initialize.selector, owner);
        proxy = new ERC1967Proxy(address(implementation), initData);
        registry = AgentPayRegistry(payable(address(proxy)));
        vm.stopPrank();
    }

    function test_Initialization() public view {
        assertEq(registry.owner(), owner);
        assertEq(registry.totalPromptsRecorded(), 0);
        assertFalse(registry.paused());
    }

    function test_RecordPrompt() public {
        vm.prank(owner);
        registry.recordPrompt(user1, "agent-001", "chat", 10000, usdtAsset);

        assertEq(registry.userPromptCounts(user1), 1);
        assertEq(registry.totalPromptsRecorded(), 1);
        assertEq(registry.totalVolumePerAsset(usdtAsset), 10000);
    }

    function test_RecordPaymentAndPrompt() public {
        vm.prank(owner);
        registry.recordPaymentAndPrompt(user1, "image", usdtAsset, 50000);

        assertEq(registry.userPromptCounts(user1), 1);
        assertEq(registry.totalPromptsRecorded(), 1);
        assertEq(registry.totalVolumePerAsset(usdtAsset), 50000);
    }

    function test_PauseAndUnpauseControls() public {
        vm.prank(owner);
        registry.pause();
        assertTrue(registry.paused());

        vm.prank(owner);
        vm.expectRevert();
        registry.recordPrompt(user1, "agent-001", "chat", 10000, usdtAsset);

        vm.prank(owner);
        registry.unpause();
        assertFalse(registry.paused());

        vm.prank(owner);
        registry.recordPrompt(user1, "agent-001", "chat", 10000, usdtAsset);
        assertEq(registry.userPromptCounts(user1), 1);
    }

    function test_ReceiveNativeDeposit() public {
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        (bool ok, ) = address(registry).call{value: 2 ether}("");
        assertTrue(ok);
        assertEq(address(registry).balance, 2 ether);
    }

    function test_WithdrawNative() public {
        vm.deal(user1, 5 ether);
        vm.prank(user1);
        (bool ok, ) = address(registry).call{value: 5 ether}("");
        assertTrue(ok);

        uint256 recipientBalanceBefore = recipient.balance;
        vm.prank(owner);
        registry.withdrawNative(payable(recipient), 3 ether);

        assertEq(recipient.balance, recipientBalanceBefore + 3 ether);
        assertEq(address(registry).balance, 2 ether);
    }

    function testRevert_RecordPromptNonOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.recordPrompt(user1, "agent-001", "chat", 10000, usdtAsset);
    }

    function testRevert_PauseNonOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.pause();
    }

    function test_InitializeLeavesPaymentTokenUnset() public view {
        assertEq(registry.defaultPaymentToken(), address(0));
        assertEq(registry.apayToken(), address(0));
        assertEq(registry.paymentToken(), address(0));
    }

    function testRevert_ConfigureArcOnWrongChain() public {
        vm.prank(owner);
        vm.expectRevert("AgentPayRegistry: not Arc");
        registry.configureArc();
    }

    function test_ConfigureArcOnTestnet() public {
        vm.chainId(5042002);
        vm.prank(owner);
        registry.configureArc();
        assertEq(registry.defaultPaymentToken(), registry.USDC());
        assertTrue(registry.acceptedTokens(registry.USDC()));
        assertEq(registry.apayToken(), address(0));
    }

    function test_SetApayTokenThenDefault() public {
        vm.chainId(5042);
        address fakeApay = address(0xA11CE);
        vm.startPrank(owner);
        registry.configureArc();
        registry.setApayToken(fakeApay);
        registry.setDefaultPaymentToken(fakeApay);
        vm.stopPrank();
        assertEq(registry.apayToken(), fakeApay);
        assertEq(registry.paymentToken(), fakeApay);
        assertTrue(registry.acceptedTokens(fakeApay));
        assertTrue(registry.acceptedTokens(registry.USDC()));
    }

    function testRevert_RecordUnacceptedTokenAfterConfigure() public {
        vm.chainId(5042002);
        vm.startPrank(owner);
        registry.configureArc();
        vm.expectRevert("AgentPayRegistry: token not accepted");
        registry.recordPrompt(user1, "agent-001", "chat", 10000, usdtAsset);
        vm.stopPrank();
    }

    function test_RecordUsdcAfterConfigure() public {
        vm.chainId(5042002);
        vm.startPrank(owner);
        registry.configureArc();
        registry.recordPrompt(user1, "agent-001", "chat", 1_000_000, registry.USDC());
        vm.stopPrank();
        assertEq(registry.totalVolumePerAsset(registry.USDC()), 1_000_000);
    }
}
