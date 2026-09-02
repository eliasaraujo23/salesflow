import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { consumePasswordResetToken } from '@/lib/auth/password-reset-repo';
import { setUserPassword } from '@/lib/auth/users-repo';
import { revokeAllRefreshTokensForUser } from '@/lib/auth/refresh-tokens-repo';

const requestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'A senha deve conter no mínimo 8 caracteres.'),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const consumed = await consumePasswordResetToken(token);
  if (!consumed) {
    return NextResponse.json({ httpStatus: 400, message: 'Link inválido ou expirado.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await setUserPassword(consumed.userId, passwordHash);
  await revokeAllRefreshTokensForUser(consumed.userId);

  return NextResponse.json({ httpStatus: 200, message: 'Senha definida com sucesso. Você já pode fazer login.' });
}
