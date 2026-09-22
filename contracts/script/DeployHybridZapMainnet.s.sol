// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/APAYToken.sol";
import "../src/AgentPayHybridZap.sol";

/**
 * @title DeployHybridZapMainnet
 * @notice Deploys UUPS Upgradeable AgentPayHybridZap (ERC1967Proxy) on BotChain Mainnet (Chain ID 677)
 * and authorizes the proxy as a minter on APAYToken.
 */
contract DeployHybridZapMainnet is Script {
    // Verified Mainnet Addresses
    address public constant MAINNET_APAY = 0x4a781889Ce38c08B86b02e084A5A19609376b857;
    address public constant MAINNET_USDT = 0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C;
    address public constant MAINNET_WBOT = 0xD5452816194a3784dBa983426cCe7c122F4abd30;
    address public constant MAINNET_ROUTER = 0x1414eD29FdFD322c3c0a830330ed982E2D629e76;

    function run() external returns (address proxyAddress, address implementationAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Implementation Contract
        AgentPayHybridZap implementation = new AgentPayHybridZap();

        // 2. Prepare Initialization Data
        bytes memory initData = abi.encodeWithSelector(
            AgentPayHybridZap.initialize.selector,
            deployer,
            MAINNET_APAY,
            MAINNET_WBOT,
            MAINNET_USDT,
            MAINNET_ROUTER
        );

        // 3. Deploy UUPS ERC1967Proxy
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);

        // 4. Authorize Zap Proxy as a Minter on APAYToken
        APAYToken apay = APAYToken(MAINNET_APAY);
        apay.setMinter(address(proxy), true);

        vm.stopBroadcast();

        console.log("=== AgentPayHybridZap Mainnet Deployment Complete ===");
        console.log("Chain ID:", block.chainid);
        console.log("AgentPayHybridZap Implementation:", address(implementation));
        console.log("AgentPayHybridZap UUPS ERC1967Proxy:", address(proxy));
        console.log("APAY Token:", MAINNET_APAY);
        console.log("USDT Token:", MAINNET_USDT);
        console.log("WBOT Token:", MAINNET_WBOT);
        console.log("BDEX V2 Router:", MAINNET_ROUTER);
        console.log("Zap Proxy authorized as minter:", apay.isMinter(address(proxy)));

        return (address(proxy), address(implementation));
    }
}
