import { NextRequest, NextResponse } from "next/server";

const ARC_MAINNET_RPC =
  process.env.NEXT_PUBLIC_ARC_MAINNET_RPC ||
  process.env.NEXT_PUBLIC_ARC_MAINNET_RPC_URL ||
  "https://rpc.mainnet.arc.io";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(ARC_MAINNET_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    console.error("[RPC Proxy arc-mainnet] Error:", err);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "Internal RPC proxy error" },
      },
      { status: 500 }
    );
  }
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
