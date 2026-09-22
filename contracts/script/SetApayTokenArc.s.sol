// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentPayRegistry.sol";

/// @notice Wire Arc registry to an APAY proxy. Optional SET_APAY_AS_DEFAULT=true.
contract SetApayTokenArc is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address registryProxy = vm.envAddress("ARC_REGISTRY_PROXY");
        address apay = vm.envAddress("APAY_TOKEN_ADDRESS_ARC");
        bool setDefault = vm.envOr("SET_APAY_AS_DEFAULT", false);

        require(
            block.chainid == 5042002 || block.chainid == 5042,
            "SetApayTokenArc: not Arc (5042002/5042)"
        );

        vm.startBroadcast(deployerPrivateKey);
        AgentPayRegistry registry = AgentPayRegistry(payable(registryProxy));
        registry.setApayToken(apay);
        if (setDefault) {
            registry.setDefaultPaymentToken(apay);
        }
        vm.stopBroadcast();

        console.log("apayToken:", registry.apayToken());
        console.log("paymentToken:", registry.paymentToken());
    }
}
