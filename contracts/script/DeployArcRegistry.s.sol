// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/AgentPayRegistry.sol";

/// @notice UUPS AgentPayRegistry on Arc. USDC default, APAY pointer empty.
contract DeployArcRegistry is Script {
    function run() external returns (address proxyAddress, address implementationAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        require(
            block.chainid == 5042002 || block.chainid == 5042,
            "DeployArcRegistry: not Arc (5042002/5042)"
        );

        vm.startBroadcast(deployerPrivateKey);

        AgentPayRegistry implementation = new AgentPayRegistry();
        bytes memory initData = abi.encodeWithSelector(AgentPayRegistry.initialize.selector, deployer);
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        AgentPayRegistry registry = AgentPayRegistry(payable(address(proxy)));
        registry.configureArc();

        vm.stopBroadcast();

        console.log("Chain ID:", block.chainid);
        console.log("AgentPayRegistry implementation:", address(implementation));
        console.log("AgentPayRegistry proxy (payTo):", address(proxy));
        console.log("paymentToken (USDC):", registry.paymentToken());
        console.log("apayToken:", registry.apayToken());
        if (block.chainid == 5042002) {
            console.log("Set AGENT_PAY_REGISTRY_ARC_TESTNET and PAYMENT_RECIPIENT_ADDRESS_ARC_TESTNET to the proxy");
            console.log("Set NEXT_PUBLIC_AGENT_PAY_REGISTRY_ARC_TESTNET_ADDRESS and NEXT_PUBLIC_PAYMENT_RECIPIENT_ARC_TESTNET to the proxy");
        } else {
            console.log("Set AGENT_PAY_REGISTRY_ARC_MAINNET and PAYMENT_RECIPIENT_ADDRESS_ARC_MAINNET to the proxy");
            console.log("Set NEXT_PUBLIC_AGENT_PAY_REGISTRY_ARC_MAINNET_ADDRESS and NEXT_PUBLIC_PAYMENT_RECIPIENT_ARC_MAINNET to the proxy");
        }

        return (address(proxy), address(implementation));
    }
}
