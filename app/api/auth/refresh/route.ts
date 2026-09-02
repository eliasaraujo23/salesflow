import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { REFRESH_TOKEN_COOKIE } from '@/lib/auth/session';
import { consumeRefreshToken } from '@/lib/auth/refresh-tokens-repo';
import { findUserById } from '@/lib/auth/users-repo';
import { issueSessionCookies, clearSessionCookies } from '@/lib/auth/issue-session';
import { getAdminAuth } from '@/lib/firebase-admin';

const refreshOutputSchema = z.object({
  firebaseCustomToken: z.string(),
  user: z.object({
    email: z.string(),
    name: z.string(),
    personKey: z.string().nullable(),
    role: z.string(),
    permissions: z.array(z.string()),
    cargo: z.string().nullable(),
  }),
});

type RefreshOutput = z.infer<typeof refreshOutputSchema>;

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ httpStatus: 401, message: 'Sessão não encontrada.' }, { status: 401 });
  }

  const consumed = await consumeRefreshToken(refreshToken);
  if (!consumed) {
    const response = NextResponse.json({ httpStatus: 401, message: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const user = await findUserById(consumed.userId);
  if (!user || !user.isActive || !user.firebaseUid) {
    const response = NextResponse.json({ httpStatus: 401, message: 'Conta indisponível.' }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const firebaseCustomToken = await getAdminAuth().createCustomToken(user.firebaseUid);

  const output: RefreshOutput = {
    firebaseCustomToken,
    user: {
      email: user.email,
      name: user.name,
      personKey: user.personKey,
      role: user.role,
      permissions: user.permissions,
      cargo: user.cargo,
    },
  };

  const response = NextResponse.json({ httpStatus: 200, data: output });
  await issueSessionCookies(response, user);
  return response;
}
