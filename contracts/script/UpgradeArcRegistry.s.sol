// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentPayRegistry.sol";

contract UpgradeArcRegistry is Script {
    function run() external returns (address newImplementationAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("ARC_REGISTRY_PROXY");

        require(
            block.chainid == 5042002 || block.chainid == 5042,
            "UpgradeArcRegistry: not Arc (5042002/5042)"
        );

        vm.startBroadcast(deployerPrivateKey);
        AgentPayRegistry newImplementation = new AgentPayRegistry();
        AgentPayRegistry(payable(proxyAddress)).upgradeToAndCall(address(newImplementation), "");
        vm.stopBroadcast();

        console.log("Registry proxy:", proxyAddress);
        console.log("New implementation:", address(newImplementation));
        return address(newImplementation);
    }
}
