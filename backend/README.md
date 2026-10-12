# AgentPay AI — Backend Gateway API

> Express.js API gateway for the [AgentPay AI](https://www.agentpayai.online) platform — multi-model AI inference aggregation, dynamic token-exact billing, and gasless micropayments on Arc (USDC) and BotChain (APAY).

**Live API:** [https://agentpay-backend-s5vs.onrender.com](https://agentpay-backend-s5vs.onrender.com)  
**Frontend:** [https://www.agentpayai.online](https://www.agentpayai.online)  
**Monorepo:** [https://github.com/maziofweb3/agentpay](https://github.com/maziofweb3/agentpay)

---

## Core Capabilities

1. **Multi-Chain x402 Facilitator Routing**:
   - **Arc Networks (Mainnet `5042` & Testnet `5042002`)**: Directly routes payments to **Circle's Hosted Facilitator Service** (`/v1/facilitator/x402`), verifying EIP-3009 transfer authorizations against native/ERC-20 USDC (`0x3600...0000`) and settling directly to the `AgentPayRegistry` proxy contract. Supports dual Circle API keys (`CIRCLE_API_KEY_TESTNET` and `CIRCLE_API_KEY_MAINNET`).
   - **BotChain Networks (Mainnet `677` & Testnet `968`)**: Routes EIP-712/EIP-3009 APAY transfer authorizations to the Rust **BOF (BotChain Open Facilitator)** microservice.
2. **Dynamic Token-Exact Billing**:
   - Computes inference cost dynamically from prompt character/token metrics, upstream rate cards, live APAY oracle prices, and a fixed 50% protocol profit margin.
   - Prices in 6-decimal USDC on Arc networks and 18-decimal APAY on BotChain networks.
3. **Multi-Model AI Execution**:
   - **Chat**: Google Gemini 3.6 Flash & Anthropic Claude 3.5 Sonnet
   - **Code**: Anthropic Claude 3.5 Sonnet smart contract audit & AST vulnerability scanning
   - **Image**: Google Imagen 3 high-resolution generation
4. **On-Chain Agent Attribution & Reputation**:
   - Implements ERC-8004 agent reputation tracking and ERC-8021 builder attribution.
5. **Real-Time Health Telemetry (`/health`)**:
   - Reports live connectivity status for Circle Facilitator, BOF, active payment assets, and supported networks.

---

## API Endpoints

| Method | Path | Billing Rail | Description |
|---|---|---|---|
| `GET` | `/health` | Free | Status, active network, Circle facilitator health, and payment asset info |
| `GET` | `/api/price` | Free | Pricing registry for live prompt execution in USDC and APAY |
| `POST` | `/api/chat` | Token-exact (USDC / APAY) | Conversational AI completions (Claude 3.5 Sonnet / Gemini 3.6 Flash) |
| `POST` | `/api/code` | Token-exact (USDC / APAY) | Smart contract security audit & vulnerability detection |
| `POST` | `/api/image` | Fixed Cost (USDC / APAY) | High-resolution image generation via Google Imagen 3 |
| `GET` | `/api/reputation/:address` | Free | Agent reputation score lookup |
| `POST` | `/api/reputation/rate` | Free | Rate an autonomous agent's performance |
| `POST` | `/api/botchain/relay` | Token-exact | Machine-to-machine task relay |

---

## Environment Variables

| Variable | Type | Description |
|---|---|---|
| `X402_NETWORK` | Non-sensitive | Active network (`arc-mainnet`, `arc-testnet`, `botchain-mainnet`, `botchain-testnet`) |
| `X402_EXTRA_NETWORKS` | Non-sensitive | Comma-delimited list of alternate supported networks |
| `ARC_MAINNET_RPC_URL` | Non-sensitive | Arc Mainnet RPC URL (`https://rpc.mainnet.arc.io`) |
| `ARC_TESTNET_RPC_URL` | Non-sensitive | Arc Testnet RPC URL (`https://rpc.testnet.arc.io`) |
| `USDC_ADDRESS` | Non-sensitive | Arc USDC ERC-20 Address (`0x3600000000000000000000000000000000000000`) |
| `CIRCLE_FACILITATOR_URL` | Non-sensitive | Circle Facilitator (`https://api.circle.com/v1/facilitator/x402`) |
| `AGENT_PAY_REGISTRY_ARC_MAINNET` | Non-sensitive | Arc Mainnet Registry Proxy (`0x2c126Af5F25e02B11DaB8aeD74A27340e018D9F0`) |
| `AGENT_PAY_REGISTRY_ARC_TESTNET` | Non-sensitive | Arc Testnet Registry Proxy (`0xC3129d520A799E6E27C9Dd0BB7891Ac92B4146C2`) |
| `PAYMENT_RECIPIENT_ADDRESS_ARC_MAINNET` | Non-sensitive | Mainnet payment recipient (`payTo` address) |
| `PAYMENT_RECIPIENT_ADDRESS_ARC_TESTNET` | Non-sensitive | Testnet payment recipient (`payTo` address) |
| `CIRCLE_API_KEY_MAINNET` | Secret | Circle API Key for Arc Mainnet verification & settlement |
| `CIRCLE_API_KEY_TESTNET` | Secret | Circle API Key for Arc Testnet verification & settlement |
| `GEMINI_API_KEY` | Secret | Google Gemini / Imagen API Key |
| `ANTHROPIC_API_KEY` | Secret | Anthropic Claude API Key |
| `SESSION_SECRET` | Secret | Session encryption secret |

---

## Local Development

```bash
cd backend
npm install
cp .env.example .env.local
npm run dev # Runs on http://localhost:3001
```

## Deployment on Render

This service is deployed as a Web Service on Render using the root `render.yaml` Blueprint or directly targeting the `backend` directory:
- **Build Command:** `npm install --include=dev && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`
