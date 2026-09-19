// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/APAYToken.sol";

contract APAYTokenTest is Test {
    APAYToken public implementation;
    APAYToken public token; // Proxy wrapped instance
    ERC1967Proxy public proxy;

    uint256 internal alicePrivateKey = 0xA11CE;
    uint256 internal bobPrivateKey = 0xB0B;

    address public alice;
    address public bob;
    address public recipient = address(0x9999);

    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH =
        keccak256("CancelAuthorization(address authorizer,bytes32 nonce)");

    function setUp() public {
        alice = vm.addr(alicePrivateKey);
        bob = vm.addr(bobPrivateKey);

        implementation = new APAYToken();

        bytes memory initData = abi.encodeWithSelector(
            APAYToken.initialize.selector,
            address(this),
            1_000_000 * 10**18
        );

        proxy = new ERC1967Proxy(address(implementation), initData);
        token = APAYToken(address(proxy));

        token.transfer(alice, 10_000 * 10**18);
    }

    function test_InitialState() public view {
        assertEq(token.name(), "AgentPay Token");
        assertEq(token.symbol(), "APAY");
        assertEq(token.decimals(), 18);
        assertEq(token.balanceOf(alice), 10_000 * 10**18);
        assertEq(token.owner(), address(this));
    }

    function test_TransferWithAuthorization_Success() public {
        uint256 value = 100 * 10**18;
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp + 1 hours;
        bytes32 nonce = keccak256("nonce-uups-1");

        bytes32 digest = _getTransferDigest(alice, recipient, value, validAfter, validBefore, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePrivateKey, digest);

        assertFalse(token.authorizationState(alice, nonce));

        token.transferWithAuthorization(alice, recipient, value, validAfter, validBefore, nonce, v, r, s);

        assertTrue(token.authorizationState(alice, nonce));
        assertEq(token.balanceOf(recipient), value);
    }

    function test_TransferWithAuthorization_RevertIfNonceReused() public {
        uint256 value = 100 * 10**18;
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp + 1 hours;
        bytes32 nonce = keccak256("nonce-uups-2");

        bytes32 digest = _getTransferDigest(alice, recipient, value, validAfter, validBefore, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePrivateKey, digest);

        token.transferWithAuthorization(alice, recipient, value, validAfter, validBefore, nonce, v, r, s);

        vm.expectRevert("APAY: authorization already used or canceled");
        token.transferWithAuthorization(alice, recipient, value, validAfter, validBefore, nonce, v, r, s);
    }

    function test_UUPS_Upgrade() public {
        APAYToken newImplementation = new APAYToken();

        token.upgradeToAndCall(address(newImplementation), "");

        assertEq(token.name(), "AgentPay Token");
        assertEq(token.symbol(), "APAY");

        // Verify burn functionality post-upgrade
        vm.prank(alice);
        token.burn(100 * 10**18);
        assertEq(token.balanceOf(alice), 9_900 * 10**18);
    }

    function test_Burn_Success() public {
        uint256 burnAmount = 500 * 10**18;
        uint256 initialBalance = token.balanceOf(alice);

        vm.prank(alice);
        token.burn(burnAmount);

        assertEq(token.balanceOf(alice), initialBalance - burnAmount);
    }

    function test_BurnFrom_Success() public {
        uint256 burnAmount = 250 * 10**18;
        uint256 initialBalance = token.balanceOf(alice);

        vm.prank(alice);
        token.approve(bob, burnAmount);

        vm.prank(bob);
        token.burnFrom(alice, burnAmount);

        assertEq(token.balanceOf(alice), initialBalance - burnAmount);
        assertEq(token.allowance(alice, bob), 0);
    }

    function _getTransferDigest(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    token.DOMAIN_SEPARATOR(),
                    keccak256(
                        abi.encode(
                            TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                            from,
                            to,
                            value,
                            validAfter,
                            validBefore,
                            nonce
                        )
                    )
                )
            );
    }
}
