import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = ['.r2.cloudflarestorage.com'];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url obrigatória' }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'url inválida' }, { status: 400 });
  }

  const isAllowed = ALLOWED_HOSTS.some(suffix => parsed.hostname.endsWith(suffix));
  if (!isAllowed) return NextResponse.json({ error: 'host não permitido' }, { status: 403 });

  // Falhas transitórias de rede/TLS ao R2 são comuns sob concorrência — 1 retry resolve a maioria.
  let upstream: Response | undefined;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2 && !upstream; attempt++) {
    try {
      upstream = await fetch(parsed.toString());
    } catch (err) {
      lastErr = err;
    }
  }
  if (!upstream) {
    const cause = lastErr instanceof Error && 'cause' in lastErr ? lastErr.cause : undefined;
    console.error('[images/download] fetch falhou:', lastErr, 'cause:', cause);
    return NextResponse.json({ error: 'erro de rede ao buscar imagem' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    console.error('[images/download] upstream não-ok:', upstream.status, await upstream.text().catch(() => ''));
    return NextResponse.json({ error: 'falha ao buscar imagem' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
