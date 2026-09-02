import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-auth';
import { getAuthPool } from '@/lib/auth-db';

const updateUserSchema = z.object({
  name: z.string().min(1),
  cargo: z.string().optional(),
  personKey: z.string().min(1).max(3),
  role: z.string(),
  permissions: z.array(z.string()),
});

// Admin-only: atualiza role/permissions/perfil direto no Neon — fonte real
// do JWT. Incrementa token_version para que a sessão do usuário editado seja
// revalidada (ver lib/auth/session.ts e requireAuth com checkRevocation).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const { email } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { name, cargo, personKey, role, permissions } = parsed.data;
  const pool = getAuthPool();
  const result = await pool.query(
    `UPDATE users
     SET name = $1, cargo = $2, person_key = $3, role = $4, permissions = $5,
         token_version = token_version + 1, updated_at = now()
     WHERE lower(email) = lower($6)
     RETURNING email`,
    [name, cargo ?? null, personKey, role, permissions, email]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ httpStatus: 404, message: 'Usuário não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ httpStatus: 200, message: 'Usuário atualizado.' });
}

// Admin-only: desativa o usuário (soft delete) e revoga a sessão.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const { email } = await params;
  const pool = getAuthPool();
  const result = await pool.query(
    `UPDATE users
     SET is_active = false, token_version = token_version + 1, updated_at = now()
     WHERE lower(email) = lower($1)
     RETURNING email`,
    [email]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ httpStatus: 404, message: 'Usuário não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ httpStatus: 200, message: 'Usuário removido.' });
}
