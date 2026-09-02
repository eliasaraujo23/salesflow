import { getAuthPool } from '@/lib/auth-db';
import { generateOpaqueToken, hashToken } from '@/lib/auth/tokens';

const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1 hora

export async function issuePasswordResetToken(userId: string): Promise<string> {
  const token = generateOpaqueToken();
  const pool = getAuthPool();
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '${RESET_TOKEN_TTL_SECONDS} seconds')`,
    [userId, hashToken(token)]
  );
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<{ userId: string } | null> {
  const pool = getAuthPool();
  const tokenHash = hashToken(token);
  const result = await pool.query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  await pool.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [row.id]);
  return { userId: row.user_id };
}
