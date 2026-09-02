import { NAVIGATION_ITEMS } from '@/lib/constants';

export interface AuthzUser {
  role: string;
  permissions: string[];
}

// Usado tanto pelo middleware (defesa server-side) quanto pelo layout do
// dashboard (UX client-side: esconder nav, evitar flash de conteúdo).
export function canAccessPath(user: AuthzUser, pathname: string): boolean {
  const item = NAVIGATION_ITEMS.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'));
  if (!item) return true;
  if (user.role === 'admin') return true;
  if (item.adminOnly) return false;
  if (!item.permission) return true;
  if (user.permissions.includes(item.permission)) return true;
  if (item.permission === 'controle') {
    return user.permissions.some((p) => p.startsWith('controle-'));
  }
  return false;
}

export function firstAllowedPath(user: AuthzUser): string {
  const item = NAVIGATION_ITEMS.find((i) => canAccessPath(user, i.href));
  return item?.href ?? '/tasks';
}
