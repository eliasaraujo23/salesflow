import { z } from 'zod';
import { API_BASE } from '@/lib/auth-fetch';

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

const RETRY_DELAY_MS = 10_000;
const MAX_ATTEMPTS   = 3;

export async function loginAction(
  email: string,
  password: string
): Promise<ResponseApi<LoginResponse>> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise<void>(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      return {
        httpStatus: 503,
        message: 'Servidor inicializando. Aguarde 30 segundos e tente novamente.',
      };
    }
  }

  return { httpStatus: 503, message: 'Servidor indisponível.' };
}
