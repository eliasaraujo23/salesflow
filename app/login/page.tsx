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
import { signInWithCustomToken } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

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
  const [slowConnection, setSlowConnection] = useState(false);

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
      router.push('/tasks');
    }
  }, [currentUser, router]);

  const onSubmit = async (values: LoginFormValues) => {
    setLoginError(null);
    setSlowConnection(false);
    const slowTimer = setTimeout(() => setSlowConnection(true), 5000);

    login(values, {
      onSuccess: async (result) => {
        clearTimeout(slowTimer);
        setSlowConnection(false);
        if (result.httpStatus !== 200 || !result.data) {
          setLoginError(result.message || 'E-mail ou senha incorretos.');
          toast.error(result.message || 'Erro ao realizar login.');
          return;
        }

        try {
          const { customToken } = result.data;

          // Authenticate with Firebase BEFORE reading Firestore
          await signInWithCustomToken(auth, customToken);

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
          router.push('/tasks');
        } catch (error: any) {
          console.error('[Login Error]', error);
          setLoginError(error.message || 'Erro de conexão.');
          toast.error(error.message || 'Erro ao realizar login.');
        }
      },
      onError: (error: any) => {
        clearTimeout(slowTimer);
        setSlowConnection(false);
        setLoginError(error.message || 'Erro de conexão.');
        toast.error(error.message || 'Erro ao realizar login.');
      },
    });
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
          <h2 className="text-2xl font-semibold text-zinc-50">Bem-vindo de volta</h2>
          <p className="text-sm text-zinc-400 mt-1">Faça login para acessar o painel</p>
        </div>

        {loginError && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-shake">
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-400 text-[13px] font-medium">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@goldtechjoias.com"
              {...register('email')}
              className={`h-11 bg-zinc-800 border-white/[0.08] text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl placeholder:text-zinc-600 ${
                errors.email ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''
              }`}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-400 text-[13px] font-medium">
              Senha
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

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-500/20"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {slowConnection ? 'Servidor acordando...' : 'Entrando...'}
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        {slowConnection && (
          <p className="mt-3 text-center text-xs text-zinc-500">
            A API estava em repouso. Reconectando automaticamente…
          </p>
        )}
        </form>

        <div className="mt-8 text-center text-xs text-zinc-600">
          Goldtech Joias · Gestão Comercial
        </div>
      </div>
    </div>
  );
}
