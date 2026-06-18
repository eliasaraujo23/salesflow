'use server';

import { z } from 'zod';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

const loginResponseSchema = z.object({
  customToken: z.string(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function loginAction(
  email: string,
  password: string
): Promise<ResponseApi<LoginResponse>> {
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { httpStatus: res.status, message: err.error || 'Credenciais inválidas' };
    }

    const rawData = await res.json();
    const parsed = loginResponseSchema.safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Resposta inválida do servidor.', errors: parsed.error };
    }

    return { httpStatus: 200, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro de rede' };
  }
}
