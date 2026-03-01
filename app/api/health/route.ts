export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "mirada-mia",
    ts: new Date().toISOString(),
    openai: process.env.OPENAI_API_KEY ? "present" : "missing",
    eleven: process.env.ELEVENLABS_API_KEY ? "present" : "missing",
  });
}
