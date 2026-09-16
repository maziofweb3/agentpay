# AgentPay Smart Contracts (`agentpay_contracts`)

Smart contracts powering **AgentPay AI** on BotChain EVM networks (Testnet `968` & Mainnet `677`).

---

## Deployed Contracts

### BotChain Mainnet (Chain ID: `677`)

| Contract | Address | Type | Explorer |
| :--- | :--- | :--- | :--- |
| **`APAYToken` (Proxy)** | `0x4a781889Ce38c08B86b02e084A5A19609376b857` | ERC1967Proxy (UUPS) | [scan.botchain.ai](https://scan.botchain.ai/address/0x4a781889Ce38c08B86b02e084A5A19609376b857) |
| **`APAYToken` (Impl)** | `0xb518116FcDe70e6Ee64480Fc5161452b83DDE69c` | Implementation (Minter Role) | [scan.botchain.ai](https://scan.botchain.ai/address/0xb518116FcDe70e6Ee64480Fc5161452b83DDE69c) |
| **`AgentPayHybridZap` (Proxy)** | `0x3dE7Ad9D36586C8aA69AD6d72c5F3aadE611689d` | ERC1967Proxy (UUPS) | [scan.botchain.ai](https://scan.botchain.ai/address/0x3dE7Ad9D36586C8aA69AD6d72c5F3aadE611689d) |
| **`AgentPayHybridZap` (Impl)** | `0x8aE6aA6200b5B7C0a91e366302A5a6436381c5BC` | Implementation | [scan.botchain.ai](https://scan.botchain.ai/address/0x8aE6aA6200b5B7C0a91e366302A5a6436381c5BC) |
| **`AgentPayRegistry`** | `0xc1eBB154EFf9bf9c08e39978E1447cC05e726dC6` | UUPS Registry Vault | [scan.botchain.ai](https://scan.botchain.ai/address/0xc1eBB154EFf9bf9c08e39978E1447cC05e726dC6) |
| **USDT** | `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C` | Standard ERC-20 (6 Decimals) | [scan.botchain.ai](https://scan.botchain.ai/address/0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C) |
| **WBOT** | `0xD5452816194a3784dBa983426cCe7c122F4abd30` | Wrapped Native BOT (18 Decimals) | [scan.botchain.ai](https://scan.botchain.ai/address/0xD5452816194a3784dBa983426cCe7c122F4abd30) |
| **BDEX V2 Factory** | `0x117115f3B72C8d1989178089A67D0C26f8EE0AA3` | Uniswap V2 Compatible Factory | [scan.botchain.ai](https://scan.botchain.ai/address/0x117115f3B72C8d1989178089A67D0C26f8EE0AA3) |
| **BDEX V2 Router** | `0x1414eD29FdFD322c3c0a830330ed982E2D629e76` | Uniswap V2 Compatible Router | [scan.botchain.ai](https://scan.botchain.ai/address/0x1414eD29FdFD322c3c0a830330ed982E2D629e76) |

---

### BotChain Testnet (Chain ID: `968`)

| Contract | Address | Type | Explorer |
| :--- | :--- | :--- | :--- |
| **`APAYToken` (Proxy)** | `0xFd7bF688d5a772A81DfE39da502F69FD99cE92c7` | ERC1967Proxy (UUPS) | [scan.bohr.life](https://scan.bohr.life/address/0xFd7bF688d5a772A81DfE39da502F69FD99cE92c7) |
| **`APAYToken` (Impl)** | `0x2d0732DC2c0dC21E2b83DBe259b6Dbf94bb9BD35` | Implementation (Verified) | [scan.bohr.life](https://scan.bohr.life/address/0x2d0732DC2c0dC21E2b83DBe259b6Dbf94bb9BD35) |
| **`AgentPayRegistry`** | `0xc1eBB154EFf9bf9c08e39978E1447cC05e726dC6` | UUPS Registry Vault | [scan.bohr.life](https://scan.bohr.life/address/0xc1eBB154EFf9bf9c08e39978E1447cC05e726dC6) |

---

## Core Smart Contract Features

### 1. `APAYToken.sol`
- **EIP-3009 Gasless Payments**: Implements `transferWithAuthorization`, `receiveWithAuthorization`, and `cancelAuthorization` using EIP-712 typed data signatures.
- **ERC-20 Burnable**: Implements `burn` and `burnFrom` for on-chain deflationary token burning on protocol fee capture.
- **Authorized Minter Role**: Enables designated liquidity protocols (such as `AgentPayHybridZap`) to mint exact backing tokens when reserve assets (USDT / WBOT) are deposited into liquidity pools.
- **UUPS Upgradeability**: Follows OpenZeppelin's `UUPSUpgradeable` and `ERC1967Proxy` pattern with `onlyOwner` access control.

### 2. `AgentPayHybridZap.sol` (1-Click Liquidity Zap)
- **Single-Transaction Liquidity Provision**: Allows users to deposit pure USDT (or native BOT / WBOT) and automatically:
  1. Calculates the required APAY pairing amount at the current pool reserve ratio (or initial price if bootstrapped).
  2. Mints the exact matching APAY amount via authorized minter role.
  3. Supplies both assets to the BDEX V2 Router to mint `APAY/USDT` or `APAY/WBOT` LP tokens.
  4. Delivers the minted LP tokens directly to the user's wallet.
  5. Refunds any excess dust to the user.
- **Slippage & Safety Protections**: Accepts `minLpTokens` parameters and enforces deadline checks to protect against frontrunning and sandwich attacks.
- **UUPS Upgradeable**: Built with OpenZeppelin `Initializable`, `OwnableUpgradeable`, `PausableUpgradeable`, and `UUPSUpgradeable`.

### 3. `AgentPayRegistry.sol`
- **Ledger Vault**: Stores prompt execution records and provides payment verification verification hooks for decentralized AI agents.

---

## Testing & Verification

```bash
# Run complete Foundry test suite (23/23 tests)
forge test

# Run tests with detailed traces
forge test -vvv

# Compile contracts
forge build
```

---

## Deployment Scripts

```bash
# Deploy Hybrid Zap to BotChain Mainnet
forge script script/DeployHybridZapMainnet.s.sol:DeployHybridZapMainnet \
  --rpc-url https://rpc.botchain.ai \
  --broadcast

# Upgrade APAYToken Implementation on Mainnet
forge script script/UpgradeAPAYTokenMainnet.s.sol:UpgradeAPAYTokenMainnet \
  --rpc-url https://rpc.botchain.ai \
  --broadcast
```
