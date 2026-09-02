import { NextRequest, NextResponse } from 'next/server';
import { REFRESH_TOKEN_COOKIE } from '@/lib/auth/session';
import { revokeRefreshToken } from '@/lib/auth/refresh-tokens-repo';
import { clearSessionCookies } from '@/lib/auth/issue-session';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken).catch(() => {});
  }

  const response = NextResponse.json({ httpStatus: 200 });
  clearSessionCookies(response);
  return response;
}
