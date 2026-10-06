import { API_BASE_URL } from './config';

/**
 * Thin fetch wrapper. Parses JSON, and on a non-2xx response throws an Error
 * whose `.message` is the backend's message (ProblemDetail `detail`) and whose
 * `.status` / `.data` carry the raw response for callers that want detail.
 */
async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // fetch rejects only on network failure (server unreachable, no internet…)
    const err = new Error('Cannot reach the server. Check that the backend is running.');
    err.cause = networkErr;
    throw err;
  }

  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

export const authApi = {
  register: (name, email, password) =>
    request('/api/auth/register', { method: 'POST', body: { name, email, password } }),

  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),

  refresh: (refreshToken) =>
    request('/api/auth/refresh', { method: 'POST', body: { refreshToken } }),

  logout: (refreshToken, accessToken) =>
    request('/api/auth/logout', { method: 'POST', body: { refreshToken }, token: accessToken }),

  me: (accessToken) =>
    request('/api/auth/me', { token: accessToken }),

  // Trade a magic-link verification token for a real session.
  exchange: (token) =>
    request('/api/auth/exchange', { method: 'POST', body: { token } }),
};
