import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://127.0.0.1:3001";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: "ok",
        service: "AgentPay AI Web App & API Proxy",
        timestamp: new Date().toISOString(),
        gatewayUrl: API_URL,
        gatewayConnected: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
