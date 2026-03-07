import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const root = process.cwd();

    const userDir = path.join(
      root,
      "mia-memory",
      "user_memory",
      userId
    );

    const sessionsFile = path.join(userDir, "sessions.json");

    let sessions: any[] = [];

    try {
      const raw = await fs.readFile(sessionsFile, "utf8");
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        sessions = parsed;
      }
    } catch {
      sessions = [];
    }

    const latest = sessions.slice(-10).reverse();

    const latestSession = latest[0] || null;

    return NextResponse.json({
      userId,
      total: sessions.length,
      latest,
      lastReading: latestSession,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "History error" },
      { status: 500 }
    );
  }
}