'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';
import { useLogin } from '@/hooks/use-login';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const loginSchema = z.object({
  email: z.string().email('Digite um e-mail válido.').min(1, 'O e-mail é obrigatório.'),
  password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, logIn } = useFirebase();
  const { mutate: login, isPending } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (currentUser) {
      router.push('/(dashboard)/tasks');
    }
  }, [currentUser, router]);

  const onSubmit = async (values: LoginFormValues) => {
    setLoginError(null);

    login(values, {
      onSuccess: async (result) => {
        if (result.httpStatus !== 200 || !result.data) {
          setLoginError(result.message || 'E-mail ou senha incorretos.');
          toast.error(result.message || 'Erro ao realizar login.');
          return;
        }

        try {
          const { customToken } = result.data;

          const userDocRef = doc(db, 'usuarios', values.email);
          const snap = await getDoc(userDocRef);

          if (!snap.exists()) {
            setLoginError('Usuário sem perfil configurado no sistema.');
            toast.error('Usuário sem perfil configurado no sistema.');
            return;
          }

          const profile = snap.data();

          await logIn(values.email, customToken, profile);
          toast.success(`Bem-vindo de volta, ${profile.name || values.email}!`);
          router.push('/(dashboard)/tasks');
        } catch (error: any) {
          console.error('[Login Error]', error);
          setLoginError(error.message || 'Erro de conexão.');
          toast.error(error.message || 'Erro ao realizar login.');
        }
      },
      onError: (error: any) => {
        setLoginError(error.message || 'Erro de conexão.');
        toast.error(error.message || 'Erro ao realizar login.');
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-surface p-8 shadow-lg transition-all duration-300 hover:shadow-accent/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent font-serif text-2xl font-bold tracking-tight text-white">
            S
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">SalesFlow</h1>
            <p className="text-xs text-text-muted">Goldtech Joias</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-text">Bem-vindo de volta</h2>
          <p className="text-sm text-text-muted">Faça login para acessar o painel</p>
        </div>

        {loginError && (
          <div className="mb-6 rounded-lg border border-semantic-red/20 bg-semantic-red/10 px-4 py-3 text-sm text-semantic-red animate-shake">
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-text-muted text-sm font-medium">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@goldtechjoias.com"
              {...register('email')}
              className={`h-11 bg-bg-surface-2 border-border text-text focus:border-accent focus:ring-1 focus:ring-accent rounded-lg placeholder-text-muted ${
                errors.email ? 'border-semantic-red focus:border-semantic-red focus:ring-semantic-red' : ''
              }`}
            />
            {errors.email && <p className="text-xs text-semantic-red mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-text-muted text-sm font-medium">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                {...register('password')}
                className={`h-11 bg-bg-surface-2 border-border text-text focus:border-accent focus:ring-1 focus:ring-accent rounded-lg placeholder-text-muted pr-11 ${
                  errors.password ? 'border-semantic-red focus:border-semantic-red focus:ring-semantic-red' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-semantic-red mt-1">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-accent hover:bg-accent-2 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-text-muted-2">
          Goldtech Joias · Gestão Comercial
        </div>
      </div>
    </div>
  );
}
