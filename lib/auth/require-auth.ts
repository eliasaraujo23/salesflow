import { NextResponse } from 'next/server';
import { verifyAccessToken, ACCESS_TOKEN_COOKIE, type SessionClaims } from '@/lib/auth/session';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { acessoSomenteResumo } from '@/lib/analise-ht/acesso-restrito';

type AuthResult = { ok: true; session: SessionClaims } | { ok: false; response: NextResponse };

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// Cada rota sensível verifica sua própria sessão, independente do middleware —
// evita depender só do matcher do middleware como limite de segurança.
// Aceita Request genérico (não só NextRequest) já que boa parte das rotas
// de app/api/leilao/* usa a assinatura Web-standard.
export async function getVerifiedSession(req: Request): Promise<SessionClaims | null> {
  const token = readCookie(req, ACCESS_TOKEN_COOKIE);
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function requireAuth(req: Request): Promise<AuthResult> {
  const session = await getVerifiedSession(req);
  if (!session) {
    return { ok: false, response: NextResponse.json({ message: 'Não autenticado' }, { status: 401 }) };
  }
  return { ok: true, session };
}

export async function requireRole(req: Request, role: string): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;
  if (auth.session.role !== role) {
    return { ok: false, response: NextResponse.json({ message: 'Sem permissão' }, { status: 403 }) };
  }
  return auth;
}

export async function requireLojaAccess(req: Request, lojaCode: string): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  const loja = getLojaConfig(lojaCode as LojaCode);
  if (!loja) {
    return { ok: false, response: NextResponse.json({ message: 'Loja inválida' }, { status: 400 }) };
  }

  const { role, permissions } = auth.session;
  const hasAccess = role === 'admin' || permissions.includes(loja.permission) || permissions.includes('controle');
  if (!hasAccess) {
    return { ok: false, response: NextResponse.json({ message: 'Sem permissão para esta loja' }, { status: 403 }) };
  }

  return auth;
}

export async function requireAnyLojaAccess(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  const { role, permissions } = auth.session;
  const hasAnyLoja =
    role === 'admin' ||
    permissions.includes('controle') ||
    permissions.some((p) => p.startsWith('controle-'));

  if (!hasAnyLoja) {
    return { ok: false, response: NextResponse.json({ message: 'Sem permissão para o Controle de Lojas' }, { status: 403 }) };
  }

  return auth;
}

// Rotas de Análise HT que expõem dados financeiros fora do Resumo
// (bonificação, premiação, comissão, gratificação, config) — bloqueadas
// no servidor para usuários restritos (ex: Raphael Borges), fechando o
// acesso mesmo via chamada direta à API, não só pela UI (ver conversa
// Elias 2026-09-04).
export async function requireAnaliseHtFinanceiro(req: Request): Promise<AuthResult> {
  const auth = await requirePermission(req, 'analise-ht');
  if (!auth.ok) return auth;

  if (acessoSomenteResumo(auth.session.email)) {
    return { ok: false, response: NextResponse.json({ message: 'Sem permissão' }, { status: 403 }) };
  }

  return auth;
}

export async function requireDashboardMetalAccess(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  const { role, permissions } = auth.session;
  const hasAccess = role === 'admin' || permissions.includes('dashboard-metal');
  if (!hasAccess) {
    return { ok: false, response: NextResponse.json({ message: 'Sem permissão para o Dashboard Metal' }, { status: 403 }) };
  }

  return auth;
}

// Checa uma ou mais permissões arbitrárias (qualquer uma libera), com o mesmo
// bypass de admin usado em canAccessPath. Usado pelas rotas de dados de app
// (tasks, metais, leilão, etc.) migradas do Firestore.
export async function requirePermission(req: Request, permission: string | string[]): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  const { role, permissions } = auth.session;
  const required = Array.isArray(permission) ? permission : [permission];
  const hasAccess = role === 'admin' || required.some((p) => permissions.includes(p));
  if (!hasAccess) {
    return { ok: false, response: NextResponse.json({ message: 'Sem permissão' }, { status: 403 }) };
  }

  return auth;
}
