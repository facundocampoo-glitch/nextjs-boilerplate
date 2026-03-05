const KEY = "mia_user_id";

function createId() {
  return "mia_" + Math.random().toString(36).substring(2, 10);
}

export function getUserId() {
  if (typeof window === "undefined") return "mia_server";

  let id = localStorage.getItem(KEY);

  if (!id) {
    id = createId();
    localStorage.setItem(KEY, id);
  }

  return id;
}