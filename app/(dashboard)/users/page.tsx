'use client';

import React from 'react';
import { Users, ShieldCheck, User, AlertTriangle } from 'lucide-react';
import { useFirebase } from '@/components/firebase-provider';
import { KPICard } from '@/components/kpi-card';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-semantic-amber/20 text-semantic-amber border-semantic-amber/30',
  user: 'bg-accent/20 text-accent border-accent/30',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  user: 'Usuário',
};

const AVATAR_COLORS = [
  'bg-accent/20 text-accent',
  'bg-semantic-green/20 text-semantic-green',
  'bg-semantic-amber/20 text-semantic-amber',
  'bg-semantic-purple/20 text-semantic-purple',
  'bg-semantic-red/20 text-semantic-red',
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
      <div>
        <h1 className="text-2xl font-bold text-text">Usuários &amp; Acesso</h1>
        <p className="text-sm text-text-muted mt-1">Membros com acesso ao SalesFlow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard icon={Users} label="Total de Usuários" value={users.length} subtext="registrados" variant="blue" />
        <KPICard icon={ShieldCheck} label="Administradores" value={admins} subtext="acesso completo" variant="amber" />
        <KPICard icon={User} label="Colaboradores" value={regularUsers} subtext="acesso padrão" variant="green" />
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-3 p-4 bg-semantic-amber/10 border border-semantic-amber/30 rounded-lg">
          <AlertTriangle size={16} className="text-semantic-amber flex-shrink-0" />
          <p className="text-sm text-semantic-amber">
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
              className={`bg-bg-surface border rounded-xl p-4 transition-colors ${
                isCurrentUser ? 'border-accent/40' : 'border-border hover:border-border-2'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor}`}>
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text truncate">{user.name}</span>
                    {isCurrentUser && (
                      <span className="text-xs text-accent">(você)</span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5">{user.email}</p>
                  {user.cargo && (
                    <p className="text-xs text-text-muted mt-0.5">{user.cargo}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${ROLE_BADGE[user.role] ?? ROLE_BADGE.user}`}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {user.permissions && user.permissions.length > 0 && (
                  <span className="text-xs text-text-muted">
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
          <Users size={48} className="mx-auto mb-4 text-text-muted/30" />
          <p className="text-text-muted">Nenhum usuário encontrado</p>
        </div>
      )}
    </div>
  );
}
