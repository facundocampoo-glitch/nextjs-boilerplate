import type { MiaRequest, MiaResponse } from "../types/miaTypes";

function normalizeMiaResponse(data: any, fallbackContentType: MiaRequest["contentType"]): MiaResponse {
  // Acepta distintas formas de respuesta del backend
  const readingId =
    String(
      data?.readingId ??
      data?.reading_id ??
      ""
    );

  const contentType =
    (data?.contentType ??
      data?.content_type ??
      fallbackContentType) as MiaResponse["contentType"];

  const content =
    String(
      data?.content ??
      data?.output ??
      data?.text ??
      ""
    );

  return {
    readingId,
    contentType,
    content,
  };
}

export async function callMiaApi(
  params: Omit<MiaRequest, "userId">
): Promise<MiaResponse> {

  const userId = localStorage.getItem("mia_user_id") || "";

  const response = await fetch("/api/mia", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      ...params,
    }),
  });

  // Si el backend respondió error, mostramos texto útil
  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${response.statusText} ${bodyText}`);
  }

  const raw = await response.json();
  return normalizeMiaResponse(raw, params.contentType);
}