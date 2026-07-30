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

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.detail ?? 'Request failed';
    throw new ApiError(response.status, typeof message === 'string' ? message : 'Request failed');
  }

  return data as T;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function registerUser(payload: { email: string; password: string; name: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: { email: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getMe(token: string): Promise<UserResponse> {
  return request<UserResponse>('/users/me', {
    headers: authHeaders(token),
  });
}

export function updateProfile(token: string, payload: { name: string }): Promise<UserResponse> {
  return request<UserResponse>('/users/me', {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function uploadAvatar(token: string, file: File): Promise<UserResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return request<UserResponse>('/users/me/avatar', {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
}

export function changePassword(
  token: string,
  payload: { old_password: string; new_password: string }
): Promise<void> {
  return request<void>('/users/me/password', {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export interface AdminStatsResponse {
  dataset_size: number;
}

export interface RetrainResponse {
  status: string;
  dataset_size: number;
}

export function getAdminStats(token: string): Promise<AdminStatsResponse> {
  return request<AdminStatsResponse>('/admin/stats', {
    headers: authHeaders(token),
  });
}

export function triggerRetrain(token: string): Promise<RetrainResponse> {
  return request<RetrainResponse>('/admin/retrain', {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export interface PredictionResponse {
  image_url: string;
  predicted_label: string;
  confidence: number;
}

export function createPrediction(token: string, file: File): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return request<PredictionResponse>('/predictions', {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
}

export type AgronomistCaseStatus = 'pending' | 'in_progress' | 'answered';
export type AgronomistCasePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AgronomistCaseResponse {
  id: string;
  sender: string;
  image: string;
  predicted_label: string | null;
  confidence: number | null;
  confirmed_label: string | null;
  comment: string | null;
  status: AgronomistCaseStatus;
  priority: AgronomistCasePriority;
  created_at: string;
  updated_at: string;
}

export function getAgronomistCases(token: string): Promise<AgronomistCaseResponse[]> {
  return request<AgronomistCaseResponse[]>('/agronomist/cases', {
    headers: authHeaders(token),
  });
}

export function updateAgronomistCase(
  token: string,
  caseId: string,
  payload: { comment: string; confirmed_label: string | null; status: AgronomistCaseStatus }
): Promise<AgronomistCaseResponse> {
  return request<AgronomistCaseResponse>(`/agronomist/cases/${caseId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export interface ChatMessageResponse {
  id: string;
  session_id: string;
  question: string;
  answer: string | null;
  diease: string | null;
  image: string | null;
  created_at: string;
}

export function sendChatMessage(
  token: string,
  payload: { session_id: string; question: string; diease?: string; image?: string }
): Promise<ChatMessageResponse> {
  return request<ChatMessageResponse>('/chat/messages', {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getChatMessages(token: string, sessionId: string): Promise<ChatMessageResponse[]> {
  return request<ChatMessageResponse[]>(`/chat/messages?session_id=${sessionId}`, {
    headers: authHeaders(token),
  });
}
