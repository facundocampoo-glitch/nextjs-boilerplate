import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type SessionEntry = {
  at?: string;
  content_type?: string;
  item_key?: string;
  meta?: Record<string, any>;
};

async function safeReadJson(fileAbs: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(fileAbs, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function asInt(v: string | null, def: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const x = Math.floor(n);
  return Math.max(min, Math.min(max, x));
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = (url.searchParams.get("userId") || "anonymous").trim();
    const limit = asInt(url.searchParams.get("limit"), 20, 1, 200);
    const offset = asInt(url.searchParams.get("offset"), 0, 0, 100000);
    const contentTypeFilter = (url.searchParams.get("contentType") || "").trim();

    const root = process.cwd();
    const sessionsFile = path.join(root, "mia-memory", "user_memory", userId, "sessions.json");

    const sessions = (await safeReadJson(sessionsFile)) as SessionEntry[] | null;

    if (!Array.isArray(sessions)) {
      return NextResponse.json(
        { error: `No sessions found for userId: ${userId}` },
        { status: 404 }
      );
    }

    // Normalizar + filtrar
    let list = sessions
      .filter((s) => !!s && typeof s === "object")
      .map((s) => ({
        at: s.at || null,
        contentType: s.content_type || null,
        itemKey: s.item_key || null,
        readingId: s.meta?.reading_id || null,
        meta: s.meta || {},
      }))
      .filter((s) => !!s.readingId);

    if (contentTypeFilter) {
      const want = contentTypeFilter.trim().toLowerCase().replace(/-/g, "_");
      list = list.filter(
        (s) => (s.contentType || "").toLowerCase().replace(/-/g, "_") === want
      );
    }

    // Orden: más nuevo primero (por "at")
    list.sort((a, b) => {
      const ta = a.at ? Date.parse(a.at) : 0;
      const tb = b.at ? Date.parse(b.at) : 0;
      return tb - ta;
    });

    const total = list.length;
    const page = list.slice(offset, offset + limit);

    return NextResponse.json({
      userId,
      total,
      limit,
      offset,
      items: page,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
