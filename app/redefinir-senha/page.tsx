'use client';

import React, { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSetPassword } from '@/hooks/use-set-password';

const setPasswordSchema = z
  .object({
    password: z.string().min(8, 'A senha deve conter no mínimo 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <RedefinirSenhaForm />
    </Suspense>
  );
}

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { mutate: setPassword, isPending } = useSetPassword();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = (values: SetPasswordFormValues) => {
    if (!token) return;

    setPassword(
      { token, password: values.password },
      {
        onSuccess: (result) => {
          if (result.httpStatus !== 200) {
            toast.error(result.message || 'Link inválido ou expirado.');
            return;
          }
          setSuccess(true);
          toast.success('Senha definida com sucesso!');
          setTimeout(() => router.push('/login'), 2000);
        },
        onError: () => {
          toast.error('Erro de conexão. Tente novamente.');
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-zinc-900 p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 font-serif text-xl font-bold text-white shadow-lg shadow-indigo-500/25">
            S
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-zinc-50">SalesFlow</h1>
            <p className="text-xs text-zinc-500">Goldtech Joias</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-zinc-50">Definir nova senha</h2>
          <p className="text-sm text-zinc-400 mt-1">Escolha uma nova senha para sua conta.</p>
        </div>

        {!token ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Link inválido — nenhum token foi informado. Solicite um novo link em{' '}
            <Link href="/esqueci-senha" className="underline">
              Esqueci minha senha
            </Link>
            .
          </div>
        ) : success ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            Senha definida com sucesso! Redirecionando para o login...
          </div>
        ) : (
          <form method="post" action="/api/auth/set-password" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400 text-[13px] font-medium">
                Nova senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  {...register('password')}
                  className={`h-11 bg-zinc-800 border-white/[0.08] text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl placeholder:text-zinc-600 pr-11 ${
                    errors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-400 text-[13px] font-medium">
                Confirmar nova senha
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                {...register('confirmPassword')}
                className={`h-11 bg-zinc-800 border-white/[0.08] text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl placeholder:text-zinc-600 ${
                  errors.confirmPassword ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-500/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar nova senha'
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-center">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft size={13} />
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
