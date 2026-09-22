// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/APAYToken.sol";

contract UpgradeAPAYTokenArc is Script {
    function run() external returns (address newImplementationAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("APAY_TOKEN_ADDRESS_ARC");

        require(
            block.chainid == 5042002 || block.chainid == 5042,
            "UpgradeAPAYTokenArc: not Arc (5042002/5042)"
        );

        vm.startBroadcast(deployerPrivateKey);
        APAYToken newImplementation = new APAYToken();
        APAYToken(proxyAddress).upgradeToAndCall(address(newImplementation), "");
        vm.stopBroadcast();

        console.log("APAY proxy:", proxyAddress);
        console.log("New implementation:", address(newImplementation));
        return address(newImplementation);
    }
}
