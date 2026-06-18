import { auth } from './firebase';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

export { API_BASE };

export async function authFetch(input: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(input, { ...options, headers });
}
