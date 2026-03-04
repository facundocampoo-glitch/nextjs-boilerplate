import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type SessionEntry = {
  at?: string;
  content_type?: string;
  item_key?: string;
  meta?: Record<string, any>;
  content?: string;
  input?: string;
};

async function safeReadJson(fileAbs: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(fileAbs, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const readingId = (url.searchParams.get("readingId") || "").trim();
    const userId = (url.searchParams.get("userId") || "anonymous").trim();
    const includeAll = (url.searchParams.get("all") || "").trim() === "1";

    if (!readingId) {
      return NextResponse.json({ error: "Missing readingId" }, { status: 400 });
    }

    const root = process.cwd();
    const sessionsFile = path.join(root, "mia-memory", "user_memory", userId, "sessions.json");

    const sessions = (await safeReadJson(sessionsFile)) as SessionEntry[] | null;

    if (!Array.isArray(sessions)) {
      return NextResponse.json(
        { error: `No sessions found for userId: ${userId}` },
        { status: 404 }
      );
    }

    const match = sessions.find((s) => s?.meta?.reading_id === readingId);

    if (!match) {
      return NextResponse.json(
        { error: `readingId not found for userId: ${userId}` },
        { status: 404 }
      );
    }

    // Respuesta estable para UI
    const payload = {
      readingId,
      userId,
      at: match.at || null,
      contentType: match.content_type || null,
      itemKey: match.item_key || null,
      meta: match.meta || {},
      ...(includeAll ? { raw: match } : {}),
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
