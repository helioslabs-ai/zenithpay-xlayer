// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Script.sol";
import "../src/SpendPolicy.sol";

contract DeploySpendPolicy is Script {
    function run() external {
        // USDC on Base — 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        address usdc = vm.envAddress("USDC_ADDRESS");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        SpendPolicy policy = new SpendPolicy(usdc);
        vm.stopBroadcast();

        console.log("SpendPolicy deployed at:", address(policy));
    }
}
