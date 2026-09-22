// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/APAYToken.sol";

/**
 * @title DeployAPAYToken
 * @notice Deployment script for UUPS Upgradeable APAYToken (ERC1967Proxy) on BotChain (Testnet 968 / Mainnet 677)
 */
contract DeployAPAYToken is Script {
    function run()
        external
        returns (address proxyAddress, address implementationAddress)
    {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 initialSupply = 1_000_000 * 10 ** 18; // 1,000,000 APAY

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Implementation
        APAYToken implementationContract = new APAYToken();

        // 2. Prepare Initialization Calldata
        bytes memory initData = abi.encodeWithSelector(
            APAYToken.initialize.selector,
            deployer,
            initialSupply
        );

        // 3. Deploy ERC1967Proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementationContract),
            initData
        );

        vm.stopBroadcast();

        console.log(
            "APAYToken Implementation deployed to:",
            address(implementationContract)
        );
        console.log("APAYToken UUPS ERC1967Proxy deployed to:", address(proxy));
        console.log(
            "Initial owner & recipient of 1,000,000,000 APAY:",
            deployer
        );

        return (address(proxy), address(implementationContract));
    }
}
