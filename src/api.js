export const API_URL = "https://api.sporthubrs.top/api";

export async function apiResponse(path, options = {}) {
  const token = localStorage.getItem("sporthub_token");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    if (res.status === 204) return { data: null, meta: null };
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error?.message || "API greška");
    return payload;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Server nije odgovorio na vrijeme.");
    if (error instanceof TypeError) throw new Error("Nije moguće povezati se sa SportHub API serverom.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function api(path, options = {}) {
  const payload = await apiResponse(path, options);
  return payload.data;
}

export function queryString(values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value).trim());
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
