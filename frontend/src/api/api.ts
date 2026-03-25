export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  text: string;
};

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const body = init?.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isStringBody = typeof body === "string";

  if (isStringBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: buildHeaders(init),
  });

  const text = await res.text();
  let data: T | null = null;

  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data, text };
}

export async function apiText(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: buildHeaders(init),
  });

  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}