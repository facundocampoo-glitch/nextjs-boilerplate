import { NextResponse } from "next/server";
import { CONTENT_TYPES, ContentType } from "@/lib/content-types";

export async function GET() {
  try {
    const now = new Date();
    const dow = now.getDay(); // 0 = domingo

    // Permitimos cualquiera de los ContentType del registry
    let content_type: ContentType = CONTENT_TYPES.HOROSCOPO_DIARIO;

    if (dow === 0) {
      content_type = CONTENT_TYPES.TAROT_SEMANAL;
    }

    return NextResponse.json({
      ok: true,
      content_type,
    });

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "calendar route failed" },
      { status: 500 }
    );
  }
}
