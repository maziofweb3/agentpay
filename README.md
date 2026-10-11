# AgentPay

Pay-per-prompt AI on **Arc** (USDC via Circle Facilitator Service) with **BotChain** (`$APAY` via BOF) as a switchable chain.

```
agentpay/
  frontend/    Next.js — Vercel Root Directory = frontend
  backend/     Express x402 gateway — Render rootDir = backend
  contracts/   Foundry (AgentPayRegistry, APAYToken, HybridZap)
  render.yaml  Render Blueprint for the backend only
```

This is a **single git repo**, not submodules. Clone it and you have the full stack.

Live BotChain deploys still track the older split remotes (`agentpay-ai/agentpay_*`) until this repo is linked on Vercel/Render.

## Chains

| Chain | ID | Asset | Facilitator |
| --- | --- | --- | --- |
| Arc Testnet (default in development) | 5042002 | USDC 6-dec `0x3600…0000` | Circle `api.circle.com/v1/facilitator/x402` |
| Arc Mainnet (default in production) | 5042 | USDC 6-dec | Circle |
| BotChain Testnet | 968 | APAY 18-dec | BOF |
| BotChain Mainnet | 677 | APAY 18-dec | BOF |

Wallet connect lands on Arc. The switcher lists all four networks. DEX / HybridZap stays BotChain-only until an Arc AMM exists.

## Run locally

```bash
# backend
cd backend && cp .env.example .env && npm install && npm run dev

# frontend (separate terminal)
cd frontend && cp .env.example .env.local && npm install && npm run dev

# contracts
cd contracts && forge test
```

## Deploy

- **Vercel:** import this repo, Root Directory `frontend`.
- **Render:** Blueprint from repo-root `render.yaml` (`rootDir: backend`, `buildFilter: backend/**`). Health check `/health`.
- Secrets stay in the dashboards: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `CIRCLE_API_KEY_TESTNET`, `CIRCLE_API_KEY_MAINNET`, `SESSION_SECRET`.

Arc live settle: deploy Registry, set `AGENT_PAY_REGISTRY_ARC_*` and `PAYMENT_RECIPIENT_ADDRESS_ARC_*` to that proxy (the vault), put `CIRCLE_API_KEY_TESTNET` and `CIRCLE_API_KEY_MAINNET` on Render, faucet USDC for the **buyer** and **deployer**. Circle Facilitator pays settlement gas; the Registry does not need a funded signer.

## Contracts (Arc)

```bash
# broadcast now (after deployer has native USDC for gas)
forge script script/DeployArcRegistry.s.sol:DeployArcRegistry \
  --rpc-url arc_testnet --broadcast --verify

# later: APAY on Arc
forge script script/DeployAPAYTokenArc.s.sol:DeployAPAYTokenArc --rpc-url arc_testnet --broadcast
APAY_TOKEN_ADDRESS_ARC=0x... ARC_REGISTRY_PROXY=0x... \
  forge script script/SetApayTokenArc.s.sol:SetApayTokenArc --rpc-url arc_testnet --broadcast
```

`initialize(owner)` stays owner-only. Arc USDC default is `configureArc()` after init so BotChain deploys are not pointed at `0x3600…0000`. Circle Facilitator settles **USDC only**; do not set APAY as the Arc 402 asset until a relayer exists.
