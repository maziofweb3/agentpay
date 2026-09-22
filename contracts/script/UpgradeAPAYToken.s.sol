// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/APAYToken.sol";

/**
 * @title UpgradeAPAYToken
 * @notice Upgrades the APAYToken UUPS Proxy on BotChain Testnet to the burnable implementation
 */
contract UpgradeAPAYToken is Script {
    address public constant PROXY_ADDRESS = 0xFd7bF688d5a772A81DfE39da502F69FD99cE92c7;

    function run() external returns (address newImplementationAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new implementation contract with burn/burnFrom support
        APAYToken newImplementation = new APAYToken();

        // 2. Upgrade existing proxy to point to new implementation
        APAYToken proxyToken = APAYToken(PROXY_ADDRESS);
        proxyToken.upgradeToAndCall(address(newImplementation), "");

        vm.stopBroadcast();

        console.log("APAYToken Proxy Address:", PROXY_ADDRESS);
        console.log("New APAYToken Implementation deployed at:", address(newImplementation));

        return address(newImplementation);
    }
}
