import type { MiaRequest, MiaResponse } from "../types/miaTypes";

export async function callMiaApi(params: Omit<MiaRequest, "userId">): Promise<MiaResponse> {
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

  const data = (await response.json()) as MiaResponse;
  return data;
}