export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  text: string;
};

export async function apiJson<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
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
  });

  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}