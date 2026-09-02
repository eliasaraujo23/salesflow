'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type AppUser } from '@/components/firebase-provider';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { useCreateUser } from '@/hooks/use-create-user';
import { useUpdateUser } from '@/hooks/use-update-user';
import { useDeleteUser } from '@/hooks/use-delete-user';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, User as UserIcon, Trash2 } from 'lucide-react';

// Derived from NAVIGATION_ITEMS — adding a new menu item automatically adds it here.
// Deduped by permission key; adminOnly items (no permission) are excluded.
const ALL_PAGES = Array.from(
  new Map(
    NAVIGATION_ITEMS
      .filter(item => !item.adminOnly && item.permission)
      .map(item => [item.permission!, { key: item.permission!, label: item.label }])
  ).values()
);

const schema = z.object({
  name:        z.string().min(1, 'Nome obrigatório'),
  cargo:       z.string().optional(),
  email:       z.string().email('Email inválido'),
  personKey:   z.string().min(1, 'Sigla obrigatória').max(3, 'Máx 3 caracteres'),
  permissions: z.array(z.string()),
  password:    z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface UserEditModalProps {
  open: boolean;
  onClose: () => void;
  user?: AppUser | null;
}

export function UserEditModal({ open, onClose, user }: UserEditModalProps) {
  const isEditing = !!user;
  const [saving, setSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState(false);
  const { mutateAsync: createUser } = useCreateUser();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutateAsync: deleteUser } = useDeleteUser();
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, setValue, reset, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', cargo: '', email: '', personKey: '', permissions: [], password: '' },
  });

  const permissions = watch('permissions');
  const isAdmin = permissions.length === ALL_PAGES.length;

  // Reset form when modal opens/changes
  useEffect(() => {
    if (open) {
      setDeleteStep(false);
      if (user) {
        reset({
          name:        user.name,
          cargo:       user.cargo ?? '',
          email:       user.email,
          personKey:   user.personKey ?? '',
          // Admins always get all permissions (including newly added ones)
          permissions: user.role === 'admin' ? ALL_PAGES.map(p => p.key) : (user.permissions ?? []),
          password:    '',
        });
      } else {
        reset({ name: '', cargo: '', email: '', personKey: '', permissions: [], password: '' });
      }
    }
  }, [open, user, reset]);

  function togglePerm(key: string) {
    setValue(
      'permissions',
      permissions.includes(key) ? permissions.filter(p => p !== key) : [...permissions, key],
    );
  }

  function selectAll() { setValue('permissions', ALL_PAGES.map(p => p.key)); }
  function clearAll()  { setValue('permissions', []); }

  async function onSubmit(values: FormValues) {
    const role = values.permissions.length === ALL_PAGES.length ? 'admin' : 'user';

    if (!isEditing) {
      if (!values.password || values.password.length < 8) {
        setError('password', { message: 'A senha deve conter no mínimo 8 caracteres.' });
        return;
      }
    }

    setSaving(true);
    try {
      if (!isEditing) {
        const result = await createUser({
          email:       values.email,
          name:        values.name,
          personKey:   values.personKey.toUpperCase(),
          cargo:       values.cargo,
          role,
          permissions: values.permissions,
          password:    values.password!,
        });
        if (result.httpStatus !== 200) {
          toast.error(result.message || 'Erro ao criar conta de login.');
          setSaving(false);
          return;
        }
      } else {
        const result = await updateUser({
          email:       values.email,
          name:        values.name,
          cargo:       values.cargo,
          personKey:   values.personKey.toUpperCase(),
          role,
          permissions: values.permissions,
        });
        if (result.httpStatus !== 200) {
          toast.error(result.message || 'Erro ao atualizar usuário.');
          setSaving(false);
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success(isEditing ? 'Usuário atualizado!' : 'Usuário criado!');
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteStep) { setDeleteStep(true); return; }
    setSaving(true);
    try {
      const result = await deleteUser(user!.email);
      if (result.httpStatus !== 200) {
        toast.error(result.message || 'Erro ao excluir usuário.');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('Usuário removido.');
      onClose();
    } catch {
      toast.error('Erro ao excluir usuário.');
    } finally {
      setSaving(false);
      setDeleteStep(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Nome *</label>
              <input {...register('name')} placeholder="João Silva" className={inputCls} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Email *</label>
              <input
                {...register('email')}
                placeholder="joao@goldtechjoias.com"
                disabled={isEditing}
                className={inputCls}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Sigla *</label>
              <input
                {...register('personKey')}
                placeholder="JS"
                maxLength={3}
                className={`${inputCls} uppercase`}
                onChange={e => setValue('personKey', e.target.value.toUpperCase())}
              />
              {errors.personKey && <p className="text-xs text-red-500 mt-1">{errors.personKey.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Cargo</label>
              <input {...register('cargo')} placeholder="Ex: Vendas, Cadastro, Gerente…" className={inputCls} />
            </div>
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Permissões</span>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${
                  isAdmin
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                }`}>
                  {isAdmin ? <ShieldCheck size={11} /> : <UserIcon size={11} />}
                  {isAdmin ? 'Admin' : 'Usuário'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={selectAll} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Selecionar todos</button>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <button type="button" onClick={clearAll} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:underline">Limpar</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {ALL_PAGES.map(p => {
                const checked = permissions.includes(p.key);
                return (
                  <label
                    key={p.key}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors select-none text-sm ${
                      checked
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-white/[0.13] text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/[0.12]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePerm(p.key)}
                      className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer flex-shrink-0"
                    />
                    {p.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Senha inicial — só ao criar um usuário novo */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Senha inicial *</label>
              <input
                {...register('password')}
                type="text"
                placeholder="Mínimo 8 caracteres"
                className={inputCls}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                A pessoa pode trocar depois em &quot;Esqueci minha senha&quot;.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  deleteStep
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20'
                } disabled:opacity-50`}
              >
                <Trash2 size={13} />
                {deleteStep ? 'Confirmar exclusão' : 'Excluir'}
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08] rounded-lg hover:border-zinc-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
