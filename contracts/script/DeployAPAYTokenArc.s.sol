// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/APAYToken.sol";

/// @notice Ready-now, broadcast-later: UUPS APAY on Arc. EIP-712 chainId is Arc so BotChain auths cannot replay.
contract DeployAPAYTokenArc is Script {
    function run() external returns (address proxyAddress, address implementationAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 initialSupply = vm.envOr("APAY_INITIAL_SUPPLY", uint256(1_000_000 * 10 ** 18));

        require(
            block.chainid == 5042002 || block.chainid == 5042,
            "DeployAPAYTokenArc: not Arc (5042002/5042)"
        );

        vm.startBroadcast(deployerPrivateKey);

        APAYToken implementation = new APAYToken();
        bytes memory initData = abi.encodeWithSelector(
            APAYToken.initialize.selector,
            deployer,
            initialSupply
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);

        vm.stopBroadcast();

        console.log("Chain ID:", block.chainid);
        console.log("APAYToken implementation:", address(implementation));
        console.log("APAYToken proxy:", address(proxy));
        console.log("Set APAY_TOKEN_ADDRESS_ARC and NEXT_PUBLIC_APAY_TOKEN_ADDRESS_ARC to the proxy.");
        console.log("Then run SetApayTokenArc with ARC_REGISTRY_PROXY + APAY_TOKEN_ADDRESS_ARC.");

        return (address(proxy), address(implementation));
    }
}
