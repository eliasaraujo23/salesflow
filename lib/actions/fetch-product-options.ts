import { authFetch, API_BASE } from '@/lib/auth-fetch';
import { z } from 'zod';

const itemSchema = z.object({
  produto:    z.string().nullable().optional(),
  subtipo:    z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao:  z.string().nullable().optional(),
});

export interface ProductOptions {
  produtos:    string[];
  subtipos:    string[];
  tipo_pedras: string[];
  lapidacoes:  string[];
}

function distinct(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v.trim() !== ''))].sort();
}

async function fetchItems(url: string): Promise<z.infer<typeof itemSchema>[]> {
  try {
    const r = await authFetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    const arr = Array.isArray(data) ? data : [];
    return arr.map(item => itemSchema.parse(item)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchProductOptionsAction(): Promise<ProductOptions> {
  const [jf, jm] = await Promise.all([
    fetchItems(`${API_BASE}/lista-estoque`),
    fetchItems(`${API_BASE}/jm/lista-estoque`),
  ]);

  const all = [...jf, ...jm];

  return {
    produtos:    distinct(all.map(r => r.produto)),
    subtipos:    distinct(all.map(r => r.subtipo)),
    tipo_pedras: distinct(all.map(r => r.tipo_pedra)),
    lapidacoes:  distinct(all.map(r => r.lapidacao)),
  };
}
