import { NextResponse } from "next/server";
import { CONTENT_TYPES, ContentType } from "@/lib/content-types";

function closestSundayToFirstOfMonth(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();

  const first = new Date(year, month, 1);

  // Domingo anterior o mismo (si el 1 cae domingo)
  const prevSunday = new Date(first);
  prevSunday.setDate(first.getDate() - first.getDay()); // 0=domingo

  // Domingo siguiente o mismo
  const nextSunday = new Date(first);
  nextSunday.setDate(first.getDate() + ((7 - first.getDay()) % 7));

  const dPrev = Math.abs(first.getTime() - prevSunday.getTime());
  const dNext = Math.abs(nextSunday.getTime() - first.getTime());

  const chosen = dNext < dPrev ? nextSunday : prevSunday;

  const diffDays = Math.round(
    Math.abs(chosen.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
  );

  return { first, prevSunday, nextSunday, chosenSunday: chosen, diffDays };
}

export async function GET() {
  try {
    const now = new Date();
    const dow = now.getDay(); // 0 = domingo

    let content_type: ContentType = CONTENT_TYPES.HOROSCOPO_DIARIO;

    let isMonthlySunday = false;
    let monthlyInfo: ReturnType<typeof closestSundayToFirstOfMonth> | null = null;

    if (dow === 0) {
      monthlyInfo = closestSundayToFirstOfMonth(now);

      // Regla: mensual = domingo más cercano al día 1, con tolerancia ±3 días
      isMonthlySunday =
        monthlyInfo.diffDays <= 3 &&
        now.getFullYear() === monthlyInfo.chosenSunday.getFullYear() &&
        now.getMonth() === monthlyInfo.chosenSunday.getMonth() &&
        now.getDate() === monthlyInfo.chosenSunday.getDate();

      content_type = isMonthlySunday
        ? CONTENT_TYPES.TAROT_MENSUAL
        : CONTENT_TYPES.TAROT_SEMANAL;
    } else {
      // (por ahora) no-domingo => diario
      content_type = CONTENT_TYPES.HOROSCOPO_DIARIO;
    }

    return NextResponse.json({
      ok: true,
      content_type,

      // DEBUG: para que no dependamos de memoria/horario
      debug: {
        now_iso: now.toISOString(),
        now_local: now.toString(),
        dow,
        is_sunday: dow === 0,
        is_monthly_sunday: isMonthlySunday,
        monthly_rule: "domingo más cercano al día 1 (±3 días)",
        monthly_calc: monthlyInfo
          ? {
              first_iso: monthlyInfo.first.toISOString(),
              prev_sunday_iso: monthlyInfo.prevSunday.toISOString(),
              next_sunday_iso: monthlyInfo.nextSunday.toISOString(),
              chosen_sunday_iso: monthlyInfo.chosenSunday.toISOString(),
              diff_days: monthlyInfo.diffDays,
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "calendar route failed" },
      { status: 500 }
    );
  }
}