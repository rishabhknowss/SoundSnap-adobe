import { getToken, clearAuth } from './storage';

const API_BASE_URL = 'http://localhost:3000';

export class AuthError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthError';
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAuth();
    throw new AuthError();
  }

  return res;
}

export async function apiUpload(path: string, formData: FormData): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401) {
    clearAuth();
    throw new AuthError();
  }

  return res;
}
