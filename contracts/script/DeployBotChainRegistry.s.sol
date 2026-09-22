// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentPayRegistry.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployBotChainRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        AgentPayRegistry implementation = new AgentPayRegistry();
        bytes memory initData = abi.encodeWithSelector(AgentPayRegistry.initialize.selector, deployer);
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);

        vm.stopBroadcast();

        console.log("AgentPayRegistry Implementation deployed at:", address(implementation));
        console.log("AgentPayRegistry UUPS ERC1967 Proxy (Permanent Address) deployed at:", address(proxy));
    }
}
