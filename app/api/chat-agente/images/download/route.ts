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

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'falha ao buscar imagem' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
