import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByEmail, setUserPassword } from '@/lib/auth/users-repo';
import bcrypt from 'bcryptjs';

const requestSchema = z.object({
  email: z.string().email(),
  legacyPassword: z.string().min(1),
  newPassword: z.string().min(8, 'A senha deve conter no mínimo 8 caracteres.'),
});

// Passo único de migração: valida a senha antiga do usuário direto contra o
// Firebase Auth (via REST accounts:signInWithPassword — o Admin SDK não
// verifica senha, só a API REST faz isso) e, se correta, já define a nova
// senha no Neon. Depois que every usuário migrar, esta rota deixa de ser usada.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { email, legacyPassword, newPassword } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user || !user.isActive) {
    return NextResponse.json({ httpStatus: 401, message: 'E-mail ou senha incorretos.' }, { status: 401 });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ httpStatus: 500, message: 'Configuração do servidor incompleta.' }, { status: 500 });
  }

  const verifyRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: legacyPassword, returnSecureToken: true }),
    }
  );

  if (!verifyRes.ok) {
    return NextResponse.json({ httpStatus: 401, message: 'E-mail ou senha incorretos.' }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await setUserPassword(user.id, passwordHash);

  return NextResponse.json({ httpStatus: 200, message: 'Senha definida com sucesso.' });
}
