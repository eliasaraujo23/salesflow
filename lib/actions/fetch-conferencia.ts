import { z } from 'zod';
import type { ConferenciaIssue } from '@/app/api/leilao/conferencia/route';

const issueSchema = z.object({
  referencia:   z.string(),
  problema:     z.enum(['em_manutencao', 'produto_excluido', 'destino_exclusivo', 'status_venda', 'status_invalido', 'sem_preco', 'sem_fotos']),
  status_id:    z.number().nullable(),
  status_nome:  z.string(),
  destino:      z.string().nullable(),
  preco_avista: z.number().nullable(),
  fotos:        z.number(),
});

const responseSchema = z.object({ data: z.array(issueSchema) });

export async function fetchConferencia(refs: string[], activeDestinos: string[]): Promise<ConferenciaIssue[]> {
  if (refs.length === 0) return [];
  const res = await fetch('/api/leilao/conferencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refs, destinos: activeDestinos }),
  });
  if (!res.ok) throw new Error('Erro ao verificar conferência');
  const json = await res.json();
  const { data } = responseSchema.parse(json);
  return data;
}
