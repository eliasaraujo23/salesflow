export const maxDuration = 300;
import { requireAuth } from '@/lib/auth/require-auth';

const BASE = 'https://www.leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function getCreds(nome: string): { user: string; pass: string } | null {
  const n = nome.toUpperCase();
  if (n.startsWith('ETERNNO')) {
    const user = process.env.LEILOESBR_USER_ETERNNO;
    const pass = process.env.LEILOESBR_PASS_ETERNNO;
    return user && pass ? { user, pass } : null;
  }
  if (n.startsWith('BRUNO')) {
    const user = process.env.LEILOESBR_USER_BARAUJO;
    const pass = process.env.LEILOESBR_PASS_BARAUJO;
    return user && pass ? { user, pass } : null;
  }
  return null;
}

async function loginLeiloesbr(user: string, pass: string, numLeilao: string): Promise<string> {
  const initRes = await fetch(`${BASE}/default.asp?Log=off`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';

  const loginRes = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionId,
      'Referer': `${BASE}/default.asp?Log=off`,
      'User-Agent': UA,
    },
    body: new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });

  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

function cleanCell(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
}

// Exporta o leilão via XLS e retorna todas as REFs presentes (Descricao_2 / MiniDescrição)
async function listarRefsNoLeilao(cookie: string, leilao: string): Promise<Set<string>> {
  const res = await fetch(`${BASE}/ajax/exportalotes.asp?Leilao=${leilao}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow',
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Export falhou: HTTP ${res.status}`);
  const html = await res.text();

  const segments = html.split(/<\/tr>/i);
  const headerSeg = segments[0] ?? '';
  const headers = [...headerSeg.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
    .map(m => cleanCell(m[1]));

  const idxRef = headers.findIndex(h => /minidesc|mini|descri.o.2|segunda/i.test(h));
  if (idxRef < 0) return new Set();

  const refs = new Set<string>();
  for (const seg of segments.slice(1)) {
    const cells = [...seg.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const ref   = cells[idxRef]?.trim().toUpperCase();
    if (ref) refs.add(ref);
  }
  return refs;
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    nome:    string;
    leilao:  string;  // leilão destino a verificar
    refs:    string[];
  };

  const { nome, leilao, refs } = body;
  if (!nome || !leilao || !Array.isArray(refs) || refs.length === 0) {
    return new Response('Payload inválido', { status: 400 });
  }

  const creds = getCreds(nome);
  if (!creds) {
    return new Response(`Sem credenciais para "${nome}"`, { status: 400 });
  }

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const enc    = new TextEncoder();

  const send = async (data: Record<string, unknown>) => {
    await writer.write(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      await send({ type: 'status', message: 'Autenticando...' });
      const cookie = await loginLeiloesbr(creds.user, creds.pass, leilao);

      await send({ type: 'status', message: 'Exportando leilão destino...' });
      // Uma única chamada XLS — muito mais rápida e usa Descricao_2 (campo correto da REF)
      const refsNoDestino = await listarRefsNoLeilao(cookie, leilao);

      const total       = refs.length;
      const encontradas = new Set<string>();

      await send({ type: 'start', total });

      // Cruzamento local — sem requests adicionais
      for (let i = 0; i < refs.length; i++) {
        const ref    = refs[i];
        const existe = refsNoDestino.has(ref.toUpperCase());
        if (existe) encontradas.add(ref.toUpperCase());
        await send({ type: 'progress', ref, existe, done: i + 1, total });
      }

      await send({ type: 'done', refsPresentes: [...encontradas] });

    } catch (err) {
      await send({ type: 'error', message: err instanceof Error ? err.message : 'Erro interno' });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
