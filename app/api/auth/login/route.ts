import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/lib/auth/users-repo';
import { issueSessionCookies } from '@/lib/auth/issue-session';
import { getAdminAuth } from '@/lib/firebase-admin';

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginOutputSchema = z.object({
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

type LoginOutput = z.infer<typeof loginOutputSchema>;

const GENERIC_INVALID_MESSAGE = 'E-mail ou senha incorretos.';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user || !user.isActive) {
    return NextResponse.json({ httpStatus: 401, message: GENERIC_INVALID_MESSAGE }, { status: 401 });
  }

  // Conta migrada do sistema antigo, ainda sem senha no Neon: a tela de login
  // mostra o formulário de migração (valida a senha antiga contra o Firebase
  // Auth e já define a nova) em vez de autenticar por aqui.
  if (!user.passwordHash) {
    const output: LoginOutput = {
      firebaseCustomToken: null,
      user: {
        email: user.email,
        name: user.name,
        personKey: user.personKey,
        role: user.role,
        permissions: user.permissions,
        cargo: user.cargo,
      },
      mustResetPassword: true,
    };
    return NextResponse.json({ httpStatus: 200, data: output });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json({ httpStatus: 401, message: GENERIC_INVALID_MESSAGE }, { status: 401 });
  }

  if (!user.firebaseUid) {
    return NextResponse.json(
      { httpStatus: 500, message: 'Usuário sem vínculo com Firebase Auth. Contate o administrador.' },
      { status: 500 }
    );
  }

  const firebaseCustomToken = await getAdminAuth().createCustomToken(user.firebaseUid);

  const output: LoginOutput = {
    firebaseCustomToken,
    user: {
      email: user.email,
      name: user.name,
      personKey: user.personKey,
      role: user.role,
      permissions: user.permissions,
      cargo: user.cargo,
    },
    mustResetPassword: user.mustResetPassword,
  };

  const response = NextResponse.json({ httpStatus: 200, data: output });
  await issueSessionCookies(response, user);
  return response;
}
