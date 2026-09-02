import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

const outputSchema = z.object({
  resetUrl: z.string().optional(),
});

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

type RequestPasswordResetOutput = z.infer<typeof outputSchema>;

async function requestPasswordResetAction(email: string): Promise<ResponseApi<RequestPasswordResetOutput>> {
  try {
    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const rawData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { httpStatus: res.status, message: rawData.message || 'Erro ao solicitar redefinição.' };
    }

    const parsed = outputSchema.safeParse(rawData.data ?? {});
    return { httpStatus: 200, message: rawData.message, data: parsed.success ? parsed.data : {} };
  } catch {
    return { httpStatus: 503, message: 'Erro de conexão. Tente novamente.' };
  }
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => requestPasswordResetAction(email),
  });
}
