import { NextResponse } from "next/server";
import { CONTENT_TYPES } from "@/lib/content-types";

export async function GET() {
  const today = new Date();
  const dow = today.getDay(); // 0 = domingo

  let content_type = CONTENT_TYPES.HOROSCOPO_DIARIO;

  if (dow === 0) {
    content_type = CONTENT_TYPES.TAROT_SEMANAL;
  }

  return NextResponse.json({
    ok: true,
    today: today.toISOString().slice(0, 10),
    content_type,
  });
}
