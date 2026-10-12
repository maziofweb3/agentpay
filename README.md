# AgentPay AI

> Pay-per-prompt AI compute on **Arc** (native/ERC-20 USDC via Circle Facilitator Service) and **BotChain** (`$APAY` via BOF) in a unified monorepo.

**Live Frontend:** [https://www.agentpayai.online](https://www.agentpayai.online)  
**Live Backend API:** [https://agentpay-backend-s5vs.onrender.com](https://agentpay-backend-s5vs.onrender.com)  
**Circle Facilitator:** [https://api.circle.com/v1/facilitator/x402](https://api.circle.com/v1/facilitator/x402)  
**BOF Facilitator:** [https://bof-facilitator.onrender.com](https://bof-facilitator.onrender.com)  
**GitHub Repository:** [https://github.com/maziofweb3/agentpay](https://github.com/maziofweb3/agentpay)

---

## Architecture Overview

AgentPay is structured as an end-to-end full-stack monorepo:

```
agentpay/
├── frontend/    # Next.js 16 Web App (App Router, Viem, Wagmi, Privy Auth) -> Deployed to Vercel
├── backend/     # Express.js x402 AI Payment Gateway & Telemetry -> Deployed to Render
├── contracts/   # Foundry Smart Contracts (AgentPayRegistry, APAYToken, HybridZap)
└── render.yaml  # Root Render Blueprint (rootDir: backend, buildFilter: backend/**)
```

---

## Multi-Chain Matrix

| Network | Chain ID | Primary Asset | Decimals | Address | Facilitator Rail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Arc Mainnet** (Default Prod) | `5042` | USDC | 6 | `0x3600000000000000000000000000000000000000` | Circle Facilitator Service (`exact`) |
| **Arc Testnet** | `5042002` | USDC | 6 | `0x3600000000000000000000000000000000000000` | Circle Facilitator Service (`exact`) |
| **BotChain Mainnet** | `677` | APAY | 18 | `0x4a781889Ce38c08B86b02e084A5A19609376b857` | BOF Microservice (`relay`) |
| **BotChain Testnet** | `968` | APAY | 18 | `0xFd7bF688d5a772A81DfE39da502F69FD99cE92c7` | BOF Microservice (`relay`) |

---

## Deployed Smart Contracts

### Arc Mainnet (`5042`)
* **`AgentPayRegistry` Proxy (`payTo` Vault):** [`0x2c126Af5F25e02B11DaB8aeD74A27340e018D9F0`](https://explorer.arc.io/address/0x2c126Af5F25e02B11DaB8aeD74A27340e018D9F0)
* **`AgentPayRegistry` Implementation:** [`0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2`](https://explorer.arc.io/address/0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2)
  * **Verified:** [Sourcify Exact Match](https://sourcify.dev/server/v2/contract/5042/0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2) (`match: exact_match`)
* **ERC-8004 Agent Identity Registry:** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

### Arc Testnet (`5042002`)
* **`AgentPayRegistry` Proxy (`payTo` Vault):** [`0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2`](https://explorer.testnet.arc.io/address/0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2)
* **`AgentPayRegistry` Implementation:** [`0x2729d7F32659b0FC1A483f4E400FaA7b35440b2C`](https://explorer.testnet.arc.io/address/0x2729d7F32659b0FC1A483f4E400FaA7b35440b2C)
  * **Verified:** [Blockscout Testnet Explorer](https://explorer.testnet.arc.io/address/0x2729d7f32659b0fc1a483f4e400faa7b35440b2c)
* **ERC-8004 Agent Identity Registry:** `0x8004A818BFB912233c491871b3d84c89A494BD9e`

### BotChain Mainnet (`677`) & Testnet (`968`)
* **`AgentPayRegistry` Vault:** `0xc1eBB154EFf9bf9c08e39978E1447cC05e726dC6`
* **`APAYToken` UUPS Proxy (Mainnet):** `0x4a781889Ce38c08B86b02e084A5A19609376b857`
* **`AgentPayHybridZap` UUPS Proxy (Mainnet):** `0x3dE7Ad9D36586C8aA69AD6d72c5F3aadE611689d`

---

## How It Works

1. **User Connects Wallet:** The frontend connects via Privy (MetaMask, Rabby, WalletConnect, MiniPay) and defaults to **Arc Mainnet**.
2. **Dynamic 402 Challenge:** When requesting an AI inference task (`/chat`, `/code`, `/image`):
   - The backend computes token-exact pricing (vendor rate card + protocol margin).
   - Returns an HTTP 402 `Payment Required` response challenge with EIP-712 payment requirements.
3. **EIP-3009 Gasless Authorization:**
   - On Arc, the user signs a `TransferWithAuthorization` for 6-decimal USDC (`0x3600...0000`).
   - On BotChain, the user signs a transfer authorization for APAY.
4. **Instant Verification & Settlement:**
   - **Arc:** Verified and settled via Circle's Hosted Facilitator Service (`/v1/facilitator/x402`), routing directly to the `AgentPayRegistry` proxy vault.
   - **BotChain:** Verified and settled via the BOF microservice.
5. **AI Inference Execution:** Upstream LLM providers (Google Gemini 3.6 Flash, Anthropic Claude 3.5 Sonnet, Google Imagen 3) stream the completed response to the user.

---

## Local Development

```bash
# 1. Clone repository
git clone https://github.com/maziofweb3/agentpay.git
cd agentpay

# 2. Run Backend
cd backend
cp .env.example .env.local
npm install
npm run dev

# 3. Run Frontend (in separate terminal)
cd ../frontend
cp .env.example .env.local
npm install
npm run dev

# 4. Contracts Testing
cd ../contracts
forge test
```

---

## Production Deployment

* **Render (Backend):** Connect `https://github.com/maziofweb3/agentpay`, specify Root Directory `backend`, build filter `backend/**`.
* **Vercel (Frontend):** Connect `https://github.com/maziofweb3/agentpay`, specify Root Directory `frontend`.
