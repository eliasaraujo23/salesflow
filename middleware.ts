import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken, ACCESS_TOKEN_COOKIE } from '@/lib/auth/session';
import { canAccessPath, firstAllowedPath } from '@/lib/auth/can-access-path';
import { acessoSomenteResumo } from '@/lib/analise-ht/acesso-restrito';

const PUBLIC_PATHS = ['/login', '/esqueci-senha', '/redefinir-senha'];
const PUBLIC_API_PREFIXES = ['/api/auth/'];
// Rotas fora do grupo (dashboard) — não fazem parte da checagem de NAVIGATION_ITEMS.
const NON_DASHBOARD_PATHS = [...PUBLIC_PATHS];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const session = token ? await verifyAccessToken(token) : null;

  if (!session && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    if (token) response.cookies.set(ACCESS_TOKEN_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  }

  if (session && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/tasks';
    return NextResponse.redirect(url);
  }

  // Defesa em profundidade: checa role/permissions no servidor, não só se está
  // logado — replica a mesma lógica que app/(dashboard)/layout.tsx usa no client
  // (NAVIGATION_ITEMS), fechando o acesso direto por URL sem passar pela nav.
  if (session && !pathname.startsWith('/api/') && !NON_DASHBOARD_PATHS.includes(pathname)) {
    if (!canAccessPath(session, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = firstAllowedPath(session);
      return NextResponse.redirect(url);
    }

    // Usuários restritos a só a aba Resumo de Análise HT (ex: Raphael Borges)
    // não podem nem chegar a renderizar as outras abas — checagem no servidor
    // evita o "flash" de dados financeiros antes do redirect client-side.
    if (
      pathname.startsWith('/analise-ht') &&
      pathname !== '/analise-ht/resumo' &&
      acessoSomenteResumo(session.email)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/analise-ht/resumo';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Exclui arquivos estáticos, imagens otimizadas e assets públicos com extensão
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
