'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVerifyLegacyPassword } from '@/hooks/use-verify-legacy-password';

const migrateSchema = z
  .object({
    legacyPassword: z.string().min(1, 'Informe sua senha atual.'),
    newPassword: z.string().min(8, 'A nova senha deve conter no mínimo 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

type MigrateFormValues = z.infer<typeof migrateSchema>;

interface MigratePasswordFormProps {
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MigratePasswordForm({ email, onSuccess, onCancel }: MigratePasswordFormProps) {
  const { mutate: verifyLegacyPassword, isPending } = useVerifyLegacyPassword();
  const [showPasswords, setShowPasswords] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MigrateFormValues>({
    resolver: zodResolver(migrateSchema),
    defaultValues: { legacyPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = (values: MigrateFormValues) => {
    verifyLegacyPassword(
      { email, legacyPassword: values.legacyPassword, newPassword: values.newPassword },
      {
        onSuccess: (result) => {
          if (result.httpStatus !== 200) {
            toast.error(result.message || 'Senha atual incorreta.');
            return;
          }
          toast.success('Senha definida com sucesso! Faça login novamente.');
          onSuccess();
        },
        onError: () => {
          toast.error('Erro de conexão. Tente novamente.');
        },
      }
    );
  };

  return (
    <div>
      <div className="mb-5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-300">
        Modernizamos o login do sistema. Confirme sua senha atual uma última vez e escolha uma nova senha
        (pode ser a mesma, se preferir).
      </div>

      <form method="post" action="/api/auth/verify-legacy-password" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="legacyPassword" className="text-zinc-400 text-[13px] font-medium">
            Sua senha atual
          </Label>
          <div className="relative">
            <Input
              id="legacyPassword"
              type={showPasswords ? 'text' : 'password'}
              placeholder="••••••••••"
              {...register('legacyPassword')}
              className={`h-11 bg-zinc-800 border-white/[0.08] text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl placeholder:text-zinc-600 pr-11 ${
                errors.legacyPassword ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.legacyPassword && <p className="text-xs text-red-400 mt-1">{errors.legacyPassword.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-zinc-400 text-[13px] font-medium">
            Nova senha
          </Label>
          <Input
            id="newPassword"
            type={showPasswords ? 'text' : 'password'}
            placeholder="••••••••••"
            {...register('newPassword')}
            className={`h-11 bg-zinc-800 border-white/[0.08] text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl placeholder:text-zinc-600 ${
              errors.newPassword ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''
            }`}
          />
          {errors.newPassword && <p className="text-xs text-red-400 mt-1">{errors.newPassword.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-zinc-400 text-[13px] font-medium">
            Confirmar nova senha
          </Label>
          <Input
            id="confirmPassword"
            type={showPasswords ? 'text' : 'password'}
            placeholder="••••••••••"
            {...register('confirmPassword')}
            className={`h-11 bg-zinc-800 border-white/[0.08] text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl placeholder:text-zinc-600 ${
              errors.confirmPassword ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''
            }`}
          />
          {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-500/20"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando...
            </>
          ) : (
            'Confirmar e definir nova senha'
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={onCancel}
        className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mx-auto"
      >
        <ArrowLeft size={13} />
        Voltar
      </button>
    </div>
  );
}
