import { SignJWT, jwtVerify } from 'jose';

export interface SessionClaims {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  tokenVersion: number;
}

const ACCESS_TOKEN_TTL_SECONDS = 12 * 60 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) throw new Error('SESSION_JWT_SECRET não configurado.');
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyAccessToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      permissions: (payload.permissions as string[]) ?? [],
      tokenVersion: payload.tokenVersion as number,
    };
  } catch {
    return null;
  }
}

export const ACCESS_TOKEN_COOKIE = 'sf_session';
export const REFRESH_TOKEN_COOKIE = 'sf_refresh';
export const ACCESS_TOKEN_MAX_AGE_SECONDS = ACCESS_TOKEN_TTL_SECONDS;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
