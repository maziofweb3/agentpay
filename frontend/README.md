# AgentPay AI — Frontend Web Application

> Next.js 16 web application for the [AgentPay AI](https://www.agentpayai.online/) platform — pay-per-use AI compute on Arc (USDC) and BotChain (APAY).

**Live Application:** [https://www.agentpayai.online](https://www.agentpayai.online)  
**Backend API:** [https://agentpay-backend-s5vs.onrender.com](https://agentpay-backend-s5vs.onrender.com)  
**Monorepo:** [https://github.com/maziofweb3/agentpay](https://github.com/maziofweb3/agentpay)

---

## Features

- **Multi-Chain Wallet Integration**: Seamless login via Privy supporting MetaMask, Rabby, MiniPay, and WalletConnect. Defaults to **Arc Mainnet** with intuitive switching across 4 networks:
  - Arc Mainnet (`5042`)
  - Arc Testnet (`5042002`)
  - BotChain Mainnet (`677`)
  - BotChain Testnet (`968`)
- **Arc-Native USDC Micro-Payments**:
  - Live balance tracking of native gas and 6-decimal ERC-20 USDC (`0x3600...0000`).
  - Seamless EIP-3009 `TransferWithAuthorization` signatures without gas overhead for prompt transactions.
- **Pay-Per-Prompt AI Studio**:
  - **Conversational Chat (`/chat`)**: Claude 3.5 Sonnet & Gemini 3.6 Flash.
  - **Code Auditor (`/code`)**: Solidity vulnerability scanning and security audits.
  - **Image Generator (`/image`)**: High-resolution image generation via Google Imagen 3.
  - **Receipt History (`/history`)**: On-chain payment confirmation receipts.
- **BotChain DEX & Liquidity Zap (`/dex`)**:
  - Automatically gated to BotChain networks where BDEX V2 liquidity pools and `AgentPayHybridZap` reside.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_DEFAULT_CHAIN` | Default selected chain (`arc` or `botchain`) |
| `NEXT_PUBLIC_API_URL` | AgentPay AI Backend Gateway URL |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy App ID for wallet authentication |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment mode (`production` or `development`) |
| `NEXT_PUBLIC_ARC_MAINNET_RPC` | Arc Mainnet RPC URL (`https://rpc.mainnet.arc.io`) |
| `NEXT_PUBLIC_ARC_TESTNET_RPC` | Arc Testnet RPC URL (`https://rpc.testnet.arc.io`) |
| `NEXT_PUBLIC_USDC_TOKEN_ADDRESS` | Arc USDC address (`0x3600000000000000000000000000000000000000`) |
| `NEXT_PUBLIC_AGENT_PAY_REGISTRY_ARC_MAINNET_ADDRESS`| Arc Mainnet Registry Proxy (`0x2c126Af5F25e02B11DaB8aeD74A27340e018D9F0`) |
| `NEXT_PUBLIC_AGENT_PAY_REGISTRY_ARC_TESTNET_ADDRESS`| Arc Testnet Registry Proxy (`0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2`) |
| `NEXT_PUBLIC_PAYMENT_RECIPIENT_ARC_MAINNET` | Arc Mainnet Payment Recipient (`payTo`) |
| `NEXT_PUBLIC_PAYMENT_RECIPIENT_ARC_TESTNET` | Arc Testnet Payment Recipient (`payTo`) |
| `NEXT_PUBLIC_AGENT_PAY_REGISTRY_MAINNET_ADDRESS` | BotChain Mainnet Registry Proxy |
| `NEXT_PUBLIC_APAY_TOKEN_ADDRESS_MAINNET` | BotChain Mainnet APAY Token Proxy |
| `NEXT_PUBLIC_HYBRID_ZAP_ADDRESS_MAINNET` | BotChain Mainnet Hybrid Zap Proxy |

---

## Local Development

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev # Starts on http://localhost:3000
```

## Production Deployment on Vercel

The frontend is deployed to Vercel targeting the `frontend` directory:
```bash
# From within the frontend folder:
vercel --prod
```
All `NEXT_PUBLIC_*` environment variables are inlined during build time.
