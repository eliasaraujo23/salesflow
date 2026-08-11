import { z } from 'zod';

const rowSchema = z.object({
  mini_descricao: z.string(),
  key_principal:  z.string().nullable(),
  key_extra_1:    z.string().nullable(),
  key_extra_2:    z.string().nullable(),
  key_extra_3:    z.string().nullable(),
  key_extra_4:    z.string().nullable(),
  key_extra_5:    z.string().nullable(),
});

const responseSchema = z.object({ data: z.array(rowSchema) });

export type ImageKeysRow = z.infer<typeof rowSchema>;

export async function fetchImageKeys(refs: string[]): Promise<ImageKeysRow[]> {
  if (refs.length === 0) return [];
  const res = await fetch('/api/leilao/image-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refs }),
  });
  if (!res.ok) return [];
  const parsed = responseSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.data : [];
}
