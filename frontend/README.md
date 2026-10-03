# AgentPay AI — Frontend

> Next.js 16 web app for the [AgentPay AI](https://www.agentpayai.online/) platform — pay-per-use AI compute and DEX liquidity aggregation powered by BotChain EVM.

**Live Site:** [https://www.agentpayai.online](https://www.agentpayai.online)  
**Backend Gateway:** [https://agentpay-backend-c7c5.onrender.com](https://agentpay-backend-c7c5.onrender.com)  
**GitHub Org:** [https://github.com/agentpay-ai](https://github.com/agentpay-ai)

---

## What it does

AgentPay AI is a production dApp that allows users and autonomous agents to:

- **Connect Multi-Chain Wallets**: Seamless login with MetaMask, Rabby, MiniPay, and WalletConnect via Privy.
- **Pay-Per-Prompt AI Inference**: Chat with Claude 3.5 Sonnet / Gemini 3.6 Flash, generate Imagen 3 graphics, and run AST-level smart contract code audits with single-click gasless EIP-3009 signatures.
- **1-Click DEX Liquidity Zap (`/dex`)**: Deposit USDT or native BOT to automatically mint balanced APAY matching supply and receive BDEX V2 LP tokens in a single transaction with live on-chain step progress tracking.
- **Real-Time DEX Pool Analytics**: Monitor live APAY/USDT and APAY/WBOT reserves, total LP token supply, user pool shares, and live swap exchange rates.
- **Embedded BDEX V2 Swap**: Trade APAY, USDT, and WBOT directly through the integrated decentralized exchange interface.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Styling**: Tailwind CSS + Framer Motion
- **Wallet & Web3**: Privy Auth + Viem + Wagmi
- **Smart Contracts**: Viem client interactions with `AgentPayHybridZap`, `APAYToken`, `BDEXV2Router`, and `BDEXV2Factory` on BotChain Mainnet (Chain ID `677`)
- **Deployment**: Vercel Production

---

## Pages & Routes

| Route | Description |
|---|---|
| `/` | Landing page with hero stats, live features, and feature showcase |
| `/chat` | Multi-model conversational AI (Claude 3.5 Sonnet / Gemini 3.6 Flash) with dynamic token billing |
| `/code` | Solidity vulnerability scanner & AST-level smart contract auditor |
| `/image` | High-fidelity AI image generation via Google Imagen 3 |
| `/dex` | 1-Click Liquidity Zap portal, LP position tracker, and BDEX V2 Swap interface |
| `/history` | On-chain prompt payment receipts and execution logs |

---

## Local Development

```bash
git clone https://github.com/agentpay-ai/agentpay_frontend
cd agentpay_frontend
npm install
cp .env.example .env.local   # fill in your configuration
npm run dev                  # starts on http://localhost:3000
```

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | AgentPay AI Backend Gateway URL |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy App ID for wallet authentication |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment mode (`production` or `development`) |
| `NEXT_PUBLIC_HYBRID_ZAP_ADDRESS_MAINNET` | Deployed `AgentPayHybridZap` UUPS Proxy Address |
| `NEXT_PUBLIC_APAY_TOKEN_ADDRESS_MAINNET` | Deployed `APAYToken` Proxy Address |
| `NEXT_PUBLIC_USDT_TOKEN_ADDRESS_MAINNET` | BotChain Mainnet USDT Token Address |
| `NEXT_PUBLIC_WBOT_TOKEN_ADDRESS_MAINNET` | BotChain Mainnet WBOT Token Address |
| `NEXT_PUBLIC_BDEX_V2_FACTORY_MAINNET` | BotChain BDEX V2 Factory Address |
| `NEXT_PUBLIC_BDEX_V2_ROUTER_MAINNET` | BotChain BDEX V2 Router Address |

---

## Build & Production Deployment

```bash
# Production build
npm run build

# Start production server
npm run start
```
