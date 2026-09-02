import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-auth';
import { getAuthPool } from '@/lib/auth-db';

const userListItemSchema = z.object({
  email: z.string(),
  name: z.string(),
  personKey: z.string().nullable(),
  role: z.string(),
  permissions: z.array(z.string()),
  cargo: z.string().nullable(),
});

type UserListItem = z.infer<typeof userListItemSchema>;

// Admin-only: lista todos os usuários direto do Neon — substitui o
// onSnapshot em Firestore usuarios/{email}, que ficou redundante desde que
// role/permissions passaram a viver só no Neon (fonte real do JWT).
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const pool = getAuthPool();
  const result = await pool.query(
    `SELECT email, name, person_key, role, permissions, cargo
     FROM users
     WHERE is_active = true
     ORDER BY name ASC`
  );

  const data: UserListItem[] = result.rows.map((row) => ({
    email: row.email,
    name: row.name,
    personKey: row.person_key,
    role: row.role,
    permissions: row.permissions ?? [],
    cargo: row.cargo,
  }));

  return NextResponse.json({ httpStatus: 200, data });
}
