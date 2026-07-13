import { auth } from './firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://goldtech-fabricacoes-api.onrender.com';

export { API_BASE };

function waitForUser(): Promise<import('firebase/auth').User | null> {
  return new Promise(resolve => {
    if (auth.currentUser !== null) return resolve(auth.currentUser);
    const unsub = auth.onAuthStateChanged(user => { unsub(); resolve(user); });
  });
}

export async function authFetch(input: string, options: RequestInit = {}): Promise<Response> {
  const user = await waitForUser();
  const token = await user?.getIdToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(input, { ...options, headers, cache: 'no-store' });
}
