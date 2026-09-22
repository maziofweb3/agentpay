// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/APAYToken.sol";

/**
 * @title UpgradeAPAYTokenMainnet
 * @notice Upgrades the APAYToken UUPS Proxy on BotChain Mainnet (Chain ID 677) to support authorized minter roles
 */
contract UpgradeAPAYTokenMainnet is Script {
    address public constant MAINNET_PROXY_ADDRESS = 0x4a781889Ce38c08B86b02e084A5A19609376b857;

    function run() external returns (address newImplementationAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new implementation contract with isMinter/setMinter support
        APAYToken newImplementation = new APAYToken();

        // 2. Upgrade existing proxy to point to new implementation
        APAYToken proxyToken = APAYToken(MAINNET_PROXY_ADDRESS);
        proxyToken.upgradeToAndCall(address(newImplementation), "");

        vm.stopBroadcast();

        console.log("=== APAYToken Mainnet Upgrade Complete ===");
        console.log("APAYToken Proxy Address:", MAINNET_PROXY_ADDRESS);
        console.log("New Implementation deployed at:", address(newImplementation));

        return address(newImplementation);
    }
}
