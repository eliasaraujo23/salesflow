import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { type AppUser } from '@/components/firebase-provider';

const meOutputSchema = z.object({
  email: z.string(),
  name: z.string(),
  personKey: z.string().nullable(),
  role: z.string(),
  permissions: z.array(z.string()),
  cargo: z.string().nullable(),
});

async function fetchMyProfile(): Promise<AppUser | null> {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  const parsed = meOutputSchema.safeParse(body.data);
  if (!parsed.success) return null;

  return {
    email: parsed.data.email,
    name: parsed.data.name,
    personKey: parsed.data.personKey ?? '',
    role: parsed.data.role,
    permissions: parsed.data.permissions,
    cargo: parsed.data.cargo ?? '',
  };
}

// Detecta mudanças de role/permissions feitas por um admin enquanto o usuário
// já está com a sessão aberta — substitui o auto-sync que antes vinha do
// onSnapshot em Firestore usuarios/{email}.
export function useMyProfile(enabled: boolean) {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
