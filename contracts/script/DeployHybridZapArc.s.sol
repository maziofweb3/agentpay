// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/APAYToken.sol";
import "../src/AgentPayHybridZap.sol";

/// @notice Broadcast only when an Arc AMM exists. Reads APAY / quote / wrapped native / router from env.
contract DeployHybridZapArc is Script {
    function run() external returns (address proxyAddress, address implementationAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address apay = vm.envAddress("APAY_TOKEN_ADDRESS_ARC");
        address quote = vm.envAddress("ARC_QUOTE_TOKEN");
        address wrappedNative = vm.envAddress("ARC_WRAPPED_NATIVE");
        address router = vm.envAddress("ARC_V2_ROUTER");

        require(
            block.chainid == 5042002 || block.chainid == 5042,
            "DeployHybridZapArc: not Arc (5042002/5042)"
        );
        require(apay != address(0) && quote != address(0) && wrappedNative != address(0) && router != address(0), "DeployHybridZapArc: zero address");

        vm.startBroadcast(deployerPrivateKey);

        AgentPayHybridZap implementation = new AgentPayHybridZap();
        bytes memory initData = abi.encodeWithSelector(
            AgentPayHybridZap.initialize.selector,
            deployer,
            apay,
            wrappedNative,
            quote,
            router
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        APAYToken(apay).setMinter(address(proxy), true);

        vm.stopBroadcast();

        console.log("Zap proxy:", address(proxy));
        console.log("Zap implementation:", address(implementation));
        return (address(proxy), address(implementation));
    }
}
