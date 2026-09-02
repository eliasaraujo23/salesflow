import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth/require-auth';
import { findUserByEmail } from '@/lib/auth/users-repo';
import { getAuthPool } from '@/lib/auth-db';
import { getAdminAuth } from '@/lib/firebase-admin';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  personKey: z.string().min(1).max(3),
  cargo: z.string().optional(),
  role: z.string(),
  permissions: z.array(z.string()),
  password: z.string().min(8, 'A senha deve conter no mínimo 8 caracteres.'),
});

const outputSchema = z.object({
  email: z.string(),
});

type CreateUserOutput = z.infer<typeof outputSchema>;

// Admin-only: cria a conta de login (Firebase Auth + Neon) para um usuário
// novo. O perfil (nome/role/permissions) no Firestore usuarios/{email} continua
// sendo escrito separadamente pelo client, como hoje — esta rota só resolve a
// parte que antes dependia do backend externo Render.
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { email, name, personKey, cargo, role, permissions, password } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ httpStatus: 409, message: 'Já existe um usuário com este e-mail.' }, { status: 409 });
  }

  let firebaseUid: string;
  try {
    const userRecord = await getAdminAuth().getUserByEmail(email);
    firebaseUid = userRecord.uid;
  } catch {
    const created = await getAdminAuth().createUser({ email });
    firebaseUid = created.uid;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const pool = getAuthPool();
  await pool.query(
    `INSERT INTO users (email, firebase_uid, name, person_key, cargo, role, permissions, password_hash, must_reset_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
    [email, firebaseUid, name, personKey, cargo ?? null, role, permissions, passwordHash]
  );

  const output: CreateUserOutput = { email };
  return NextResponse.json({ httpStatus: 200, data: output });
}
