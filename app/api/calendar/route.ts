import { NextResponse } from "next/server";
import { CONTENT_TYPES, ContentType } from "@/lib/content-types";

const APP_TZ = "America/Argentina/Buenos_Aires";

function getZonedParts(timeZone: string, date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));

  return { year, month, day, hour, minute, second };
}

/**
 * Crea un Date "de calendario" usando la hora local del timezone elegido,
 * pero representado internamente como UTC para que getUTCDay / comparaciones
 * sean consistentes sin depender del timezone del server.
 */
function getNowInTimeZone(timeZone: string) {
  const serverNow = new Date();
  const p = getZonedParts(timeZone, serverNow);
  const zonedAsUtc = new Date(
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  );
  return { serverNow, zonedNow: zonedAsUtc, zonedParts: p };
}

function ymdUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

function closestSundayToFirstOfMonth_ZONED(zonedNow: Date) {
  const year = zonedNow.getUTCFullYear();
  const month = zonedNow.getUTCMonth() + 1; // 1-12

  const first = ymdUtc(year, month, 1);

  // Domingo anterior o mismo
  const prevSunday = new Date(first);
  prevSunday.setUTCDate(first.getUTCDate() - first.getUTCDay()); // 0=domingo

  // Domingo siguiente o mismo
  const nextSunday = new Date(first);
  nextSunday.setUTCDate(first.getUTCDate() + ((7 - first.getUTCDay()) % 7));

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
    const { serverNow, zonedNow, zonedParts } = getNowInTimeZone(APP_TZ);
    const dow = zonedNow.getUTCDay(); // 0=domingo (en TZ app)

    let content_type: ContentType = CONTENT_TYPES.HOROSCOPO_DIARIO;

    let isMonthlySunday = false;
    let monthlyInfo: ReturnType<typeof closestSundayToFirstOfMonth_ZONED> | null =
      null;

    // Tarot solo los domingos (según TZ app)
    if (dow === 0) {
      monthlyInfo = closestSundayToFirstOfMonth_ZONED(zonedNow);

      // Regla: mensual = domingo más cercano al día 1, con tolerancia ±3 días
      isMonthlySunday =
        monthlyInfo.diffDays <= 3 &&
        zonedNow.getUTCFullYear() === monthlyInfo.chosenSunday.getUTCFullYear() &&
        zonedNow.getUTCMonth() === monthlyInfo.chosenSunday.getUTCMonth() &&
        zonedNow.getUTCDate() === monthlyInfo.chosenSunday.getUTCDate();

      content_type = isMonthlySunday
        ? CONTENT_TYPES.TAROT_MENSUAL
        : CONTENT_TYPES.TAROT_SEMANAL;
    } else {
      content_type = CONTENT_TYPES.HOROSCOPO_DIARIO;
    }

    return NextResponse.json({
      ok: true,
      content_type,
      debug: {
        app_tz: APP_TZ,

        // reloj real del server
        server_now_iso: serverNow.toISOString(),
        server_now_local: serverNow.toString(),

        // "ahora" interpretado en timezone del producto
        tz_now_iso: zonedNow.toISOString(),
        tz_now_ymd_hms: `${zonedParts.year}-${String(zonedParts.month).padStart(
          2,
          "0"
        )}-${String(zonedParts.day).padStart(2, "0")} ${String(
          zonedParts.hour
        ).padStart(2, "0")}:${String(zonedParts.minute).padStart(
          2,
          "0"
        )}:${String(zonedParts.second).padStart(2, "0")}`,

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