import { NextResponse } from 'next/server';
import {
  signAccessToken,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from '@/lib/auth/session';
import { issueRefreshToken } from '@/lib/auth/refresh-tokens-repo';
import type { UserRecord } from '@/lib/auth/users-repo';

const isProduction = process.env.NODE_ENV === 'production';

export async function issueSessionCookies(response: NextResponse, user: UserRecord): Promise<void> {
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = await issueRefreshToken(user.id);

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', { path: '/', maxAge: 0 });
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', { path: '/api/auth', maxAge: 0 });
}
