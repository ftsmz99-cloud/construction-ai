// Centralised API base URL for the admin client.
// Override at build/deploy time with VITE_API_URL (e.g. /api or https://host).
import { getToken } from "./tokenStore";

const API_BASE =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";

// Fetch helper that automatically attaches the admin Bearer token when present.
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export default API_BASE;

