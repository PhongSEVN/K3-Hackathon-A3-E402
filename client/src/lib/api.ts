const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export type UserRole = 'admin' | 'farmer' | 'agronomist';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.detail ?? 'Request failed';
    throw new ApiError(response.status, typeof message === 'string' ? message : 'Request failed');
  }

  return data as T;
}

export function registerUser(payload: { email: string; password: string; name: string }): Promise<AuthResponse> {
  return postJson<AuthResponse>('/auth/register', payload);
}

export function loginUser(payload: { email: string; password: string }): Promise<AuthResponse> {
  return postJson<AuthResponse>('/auth/login', payload);
}
