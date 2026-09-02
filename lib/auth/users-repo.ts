import { getAuthPool } from '@/lib/auth-db';

export interface UserRecord {
  id: string;
  email: string;
  firebaseUid: string | null;
  passwordHash: string | null;
  name: string;
  personKey: string | null;
  cargo: string | null;
  role: string;
  permissions: string[];
  tokenVersion: number;
  isActive: boolean;
  mustResetPassword: boolean;
}

function mapRow(row: any): UserRecord {
  return {
    id: row.id,
    email: row.email,
    firebaseUid: row.firebase_uid,
    passwordHash: row.password_hash,
    name: row.name,
    personKey: row.person_key,
    cargo: row.cargo,
    role: row.role,
    permissions: row.permissions ?? [],
    tokenVersion: row.token_version,
    isActive: row.is_active,
    mustResetPassword: row.must_reset_password,
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const pool = getAuthPool();
  const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  if (result.rowCount === 0) return null;
  return mapRow(result.rows[0]);
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const pool = getAuthPool();
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (result.rowCount === 0) return null;
  return mapRow(result.rows[0]);
}

export async function setUserPassword(userId: string, passwordHash: string): Promise<void> {
  const pool = getAuthPool();
  await pool.query(
    `UPDATE users SET password_hash = $2, must_reset_password = false, token_version = token_version + 1, updated_at = now()
     WHERE id = $1`,
    [userId, passwordHash]
  );
}
