import { z } from 'zod';

const loginResponseSchema = z.object({
  firebaseCustomToken: z.string().nullable(),
  user: z.object({
    email: z.string(),
    name: z.string(),
    personKey: z.string().nullable(),
    role: z.string(),
    permissions: z.array(z.string()),
    cargo: z.string().nullable(),
  }),
  mustResetPassword: z.boolean(),
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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const rawData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { httpStatus: res.status, message: rawData.message || 'Credenciais inválidas' };
    }

    const parsed = loginResponseSchema.safeParse(rawData.data);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Resposta inválida do servidor.', errors: parsed.error };
    }

    return { httpStatus: 200, data: parsed.data };
  } catch {
    return { httpStatus: 503, message: 'Erro de conexão. Tente novamente.' };
  }
}
