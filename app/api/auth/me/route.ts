import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/require-auth';
import { findUserByEmail } from '@/lib/auth/users-repo';

const meOutputSchema = z.object({
  email: z.string(),
  name: z.string(),
  personKey: z.string().nullable(),
  role: z.string(),
  permissions: z.array(z.string()),
  cargo: z.string().nullable(),
});

type MeOutput = z.infer<typeof meOutputSchema>;

// Qualquer usuário autenticado pode buscar seu próprio perfil atualizado —
// usado para refletir mudanças de role/permissions feitas por um admin sem
// exigir novo login (antes isso vinha do onSnapshot em Firestore usuarios/{email}).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const user = await findUserByEmail(auth.session.email);
  if (!user || !user.isActive) {
    return NextResponse.json({ httpStatus: 404, message: 'Usuário não encontrado.' }, { status: 404 });
  }

  const output: MeOutput = {
    email: user.email,
    name: user.name,
    personKey: user.personKey,
    role: user.role,
    permissions: user.permissions,
    cargo: user.cargo,
  };

  return NextResponse.json({ httpStatus: 200, data: output });
}
