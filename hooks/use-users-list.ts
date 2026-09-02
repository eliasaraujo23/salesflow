import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { type AppUser } from '@/components/firebase-provider';

const userListItemSchema = z.object({
  email: z.string(),
  name: z.string(),
  personKey: z.string().nullable(),
  role: z.string(),
  permissions: z.array(z.string()),
  cargo: z.string().nullable(),
});

async function fetchUsersList(): Promise<AppUser[]> {
  const res = await fetch('/api/users', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(userListItemSchema).safeParse(body.data);
  if (!parsed.success) return [];

  return parsed.data.map((u) => ({
    email: u.email,
    name: u.name,
    personKey: u.personKey ?? '',
    role: u.role,
    permissions: u.permissions,
    cargo: u.cargo ?? '',
  }));
}

// Substitui o onSnapshot em Firestore usuarios/{email} — role/permissions
// já vivem só no Neon (fonte real do JWT). Refetch periódico + ao focar a
// aba cobre o caso de "admin mudou minha permissão enquanto eu uso o app".
export function useUsersList(enabled: boolean) {
  return useQuery({
    queryKey: ['users-list'],
    queryFn: fetchUsersList,
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
