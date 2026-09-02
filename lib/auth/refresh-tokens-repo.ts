import { getAuthPool } from '@/lib/auth-db';
import { generateOpaqueToken, hashToken } from '@/lib/auth/tokens';
import { REFRESH_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth/session';

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = generateOpaqueToken();
  const pool = getAuthPool();
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '${REFRESH_TOKEN_MAX_AGE_SECONDS} seconds')`,
    [userId, hashToken(token)]
  );
  return token;
}

export async function consumeRefreshToken(token: string): Promise<{ userId: string } | null> {
  const pool = getAuthPool();
  const tokenHash = hashToken(token);
  const result = await pool.query(
    `SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id]);
  return { userId: row.user_id };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const pool = getAuthPool();
  await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [
    hashToken(token),
  ]);
}

export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  const pool = getAuthPool();
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}
