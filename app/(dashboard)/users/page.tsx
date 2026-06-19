'use client';

import React from 'react';
import { Users, ShieldCheck, User, AlertTriangle } from 'lucide-react';
import { useFirebase } from '@/components/firebase-provider';
import { KPICard } from '@/components/kpi-card';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  user: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  user: 'Usuário',
};

const AVATAR_COLORS = [
  'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  'bg-violet-500/20 text-violet-600 dark:text-violet-400',
  'bg-red-500/20 text-red-600 dark:text-red-400',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function UsersPage() {
  const { users, currentUser } = useFirebase();

  const isAdmin = currentUser?.role === 'admin';
  const admins = users.filter((u) => u.role === 'admin').length;
  const regularUsers = users.filter((u) => u.role !== 'admin').length;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard icon={Users} label="Total de Usuários" value={users.length} subtext="registrados" variant="blue" />
        <KPICard icon={ShieldCheck} label="Administradores" value={admins} subtext="acesso completo" variant="amber" />
        <KPICard icon={User} label="Colaboradores" value={regularUsers} subtext="acesso padrão" variant="green" />
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Somente administradores podem editar usuários e permissões.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user, i) => {
          const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const isCurrentUser = user.email === currentUser?.email;

          return (
            <div
              key={user.email}
              className={`bg-white dark:bg-zinc-900 border rounded-xl p-4 transition-colors ${
                isCurrentUser
                  ? 'border-indigo-500/40'
                  : 'border-zinc-200 dark:border-white/[0.06] hover:border-zinc-300 dark:hover:border-white/[0.10]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor}`}>
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</span>
                    {isCurrentUser && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400">(você)</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user.email}</p>
                  {user.cargo && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{user.cargo}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${ROLE_BADGE[user.role] ?? ROLE_BADGE.user}`}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {user.permissions && user.permissions.length > 0 && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {user.permissions.length} permissão{user.permissions.length !== 1 ? 'ões' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="py-20 text-center">
          <Users size={48} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-600" />
          <p className="text-zinc-500 dark:text-zinc-400">Nenhum usuário encontrado</p>
        </div>
      )}
    </div>
  );
}
