# AgentPay Smart Contracts (`agentpay/contracts`)

> Smart contracts powering **AgentPay AI** on **Arc** (USDC micro-payment registry) and **BotChain** (`$APAY` token, liquidity zap, and registry vault).

---

## Deployed Contracts

### Arc Mainnet (Chain ID: `5042`)

| Contract | Address | Type | Verification |
| :--- | :--- | :--- | :--- |
| **`AgentPayRegistry` (Proxy)** | [`0x2c126Af5F25e02B11DaB8aeD74A27340e018D9F0`](https://explorer.arc.io/address/0x2c126Af5F25e02B11DaB8aeD74A27340e018D9F0) | ERC1967Proxy (UUPS) | [explorer.arc.io](https://explorer.arc.io/address/0x2c126Af5F25e02B11DaB8aeD74A27340e018D9F0) |
| **`AgentPayRegistry` (Impl)** | [`0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2`](https://explorer.arc.io/address/0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2) | Implementation | [Sourcify Exact Match](https://sourcify.dev/server/v2/contract/5042/0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2) |
| **USDC** | `0x3600000000000000000000000000000000000000` | Native Gas (18 dec) / ERC-20 (6 dec) | Predeployed System Contract |
| **ERC-8004 Agent Identity** | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | Identity Registry | Predeployed |

### Arc Testnet (Chain ID: `5042002`)

| Contract | Address | Type | Verification |
| :--- | :--- | :--- | :--- |
| **`AgentPayRegistry` (Proxy)** | [`0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2`](https://explorer.testnet.arc.io/address/0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2) | ERC1967Proxy (UUPS) | [explorer.testnet.arc.io](https://explorer.testnet.arc.io/address/0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2) |
| **`AgentPayRegistry` (Impl)** | [`0x2729d7F32659b0FC1A483f4E400FaA7b35440b2C`](https://explorer.testnet.arc.io/address/0x2729d7F32659b0FC1A483f4E400FaA7b35440b2C) | Implementation | [Blockscout Verified](https://explorer.testnet.arc.io/address/0x2729d7f32659b0fc1a483f4e400faa7b35440b2c) |
| **USDC** | `0x3600000000000000000000000000000000000000` | Native Gas (18 dec) / ERC-20 (6 dec) | Predeployed System Contract |
| **ERC-8004 Agent Identity** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Identity Registry | Predeployed |

### BotChain Mainnet (`677`) & Testnet (`968`)

| Contract | Address | Network | Type |
| :--- | :--- | :--- | :--- |
| **`APAYToken` (Proxy)** | `0x4a781889Ce38c08B86b02e084A5A19609376b857` | Mainnet | ERC1967Proxy (UUPS) |
| **`AgentPayHybridZap` (Proxy)**| `0x3dE7Ad9D36586C8aA69AD6d72c5F3aadE611689d` | Mainnet | ERC1967Proxy (UUPS) |
| **`AgentPayRegistry`** | `0xc1eBB154EFf9bf9c08e39978E1447cC05e726dC6` | Mainnet & Testnet | Registry Vault |
| **`APAYToken` (Proxy)** | `0xFd7bF688d5a772A81DfE39da502F69FD99cE92c7` | Testnet | ERC1967Proxy (UUPS) |

---

## Contract Architecture & Features

### 1. `AgentPayRegistry.sol`
- **Arc Multi-Asset Ledger**: Serves as the vault and on-chain payment record ledger.
- **USDC Default Routing**: Uses `configureArc()` to configure native/ERC-20 USDC (`0x3600...0000`) as the default accepted asset while leaving future pointers for `$APAY` tokens.
- **UUPS Upgradeability**: Built on OpenZeppelin `Initializable`, `OwnableUpgradeable`, `PausableUpgradeable`, and `UUPSUpgradeable`.

### 2. `APAYToken.sol`
- **EIP-3009 Gasless Payments**: Gasless transfer authorizations via EIP-712 typed data signatures (`transferWithAuthorization`, `receiveWithAuthorization`).
- **Deflationary Burns**: Implements `burn` and `burnFrom` for protocol fee burning.
- **Authorized Minter Role**: Enables liquidity routers (like `AgentPayHybridZap`) to mint backing supply.

### 3. `AgentPayHybridZap.sol`
- **1-Click Liquidity Zap**: Automatically pairs deposited reserve assets (USDT / native BOT) with minted matching APAY and delivers BDEX V2 LP tokens to the depositor in a single atomic transaction.

---

## Testing & Verification

```bash
# Run all Foundry tests (29/29 tests pass)
forge test

# Run tests with execution traces
forge test -vvv
```

---

## Deployment Scripts

### Arc Deployment Scripts
```bash
# Deploy Arc Registry to Testnet
forge script script/DeployArcRegistry.s.sol:DeployArcRegistry \
  --rpc-url arc_testnet \
  --broadcast

# Deploy Arc Registry to Mainnet
forge script script/DeployArcRegistry.s.sol:DeployArcRegistry \
  --rpc-url arc_mainnet \
  --broadcast

# Future: Deploy APAY on Arc
forge script script/DeployAPAYTokenArc.s.sol:DeployAPAYTokenArc \
  --rpc-url arc_mainnet \
  --broadcast
```
