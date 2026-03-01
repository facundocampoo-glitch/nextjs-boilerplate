// lib/mia/response.ts

import { NextResponse } from "next/server";
import { MIA_CONFIG } from "./config";

export function miaJson(
  body: unknown,
  options?: {
    status?: number;
    attempts?: number;
    totalMs?: number;
    elevenMs?: number;
  }
) {
  const headers: Record<string, string> = {
    [MIA_CONFIG.HEADERS.ATTEMPTS]: String(options?.attempts ?? 1),
    [MIA_CONFIG.HEADERS.VALIDATION]: "true",
  };

  if (options?.totalMs !== undefined) {
    headers[MIA_CONFIG.HEADERS.TOTAL_MS] = String(options.totalMs);
  }

  if (options?.elevenMs !== undefined) {
    headers[MIA_CONFIG.HEADERS.ELEVEN_MS] = String(options.elevenMs);
  }

  return NextResponse.json(body, {
    status: options?.status ?? 200,
    headers,
  });
}