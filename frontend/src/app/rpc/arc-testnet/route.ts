import { NextRequest, NextResponse } from "next/server";

const CANDIDATE_RPCS = [
  process.env.NEXT_PUBLIC_ARC_TESTNET_RPC ||
    process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ||
    "https://rpc.testnet.arc.io",
  "https://5042002.rpc.thirdweb.com",
];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  for (const rpcUrl of CANDIDATE_RPCS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
    } catch {
      // Continue to fallback RPC
    }
  }

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: (body as { id?: unknown })?.id ?? null,
      error: { code: -32603, message: "All Arc Testnet RPC endpoints failed" },
    },
    { status: 502 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
