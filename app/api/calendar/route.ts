import { NextResponse } from "next/server";
import { CONTENT_TYPES, ContentType } from "@/lib/content-types";

function closestSundayToFirstOfMonth(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();

  const first = new Date(year, month, 1);

  // Domingo anterior o mismo
  const prevSunday = new Date(first);
  prevSunday.setDate(first.getDate() - first.getDay()); // 0=domingo

  // Domingo siguiente (o mismo si first es domingo)
  const nextSunday = new Date(first);
  nextSunday.setDate(first.getDate() + ((7 - first.getDay()) % 7));

  // Elegimos el más cercano al día 1
  const dPrev = Math.abs(first.getTime() - prevSunday.getTime());
  const dNext = Math.abs(nextSunday.getTime() - first.getTime());

  const chosen = dNext < dPrev ? nextSunday : prevSunday;

  // diferencia en días (por seguridad)
  const diffDays = Math.round(
    Math.abs(chosen.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
  );

  return { chosenSunday: chosen, diffDays };
}

export async function GET() {
  try {
    const now = new Date();
    const dow = now.getDay(); // 0 = domingo

    let content_type: ContentType = CONTENT_TYPES.HOROSCOPO_DIARIO;

    // Tarot solo los domingos
    if (dow === 0) {
      const { chosenSunday, diffDays } = closestSundayToFirstOfMonth(now);

      // Regla: mensual = domingo más cercano al día 1, con tolerancia ±3 días
      const isMonthlySunday =
        diffDays <= 3 &&
        now.getFullYear() === chosenSunday.getFullYear() &&
        now.getMonth() === chosenSunday.getMonth() &&
        now.getDate() === chosenSunday.getDate();

      content_type = isMonthlySunday
        ? CONTENT_TYPES.TAROT_MENSUAL
        : CONTENT_TYPES.TAROT_SEMANAL;
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