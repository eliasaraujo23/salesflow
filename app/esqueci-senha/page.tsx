'use client';

import React, { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRequestPasswordReset } from '@/hooks/use-request-password-reset';

const requestSchema = z.object({
  email: z.string().email('Digite um e-mail válido.').min(1, 'O e-mail é obrigatório.'),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function EsqueciSenhaPage() {
  return (
    <Suspense>
      <EsqueciSenhaForm />
    </Suspense>
  );
}

function EsqueciSenhaForm() {
  const searchParams = useSearchParams();
  const { mutate: requestReset, isPending } = useRequestPasswordReset();
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: searchParams.get('email') || '' },
  });

  const onSubmit = (values: RequestFormValues) => {
    requestReset(values.email, {
      onSuccess: (result) => {
        if (result.httpStatus !== 200) {
          toast.error(result.message || 'Erro ao solicitar redefinição.');
          return;
        }
        setSubmittedEmail(values.email);
        setResetUrl(result.data?.resetUrl ?? null);
        toast.success(result.message || 'Link de redefinição gerado.');
      },
      onError: () => {
        toast.error('Erro de conexão. Tente novamente.');
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
          <h2 className="text-2xl font-semibold text-zinc-50">Esqueci minha senha</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Informe seu e-mail para gerar um link de redefinição de senha.
          </p>
        </div>

        {submittedEmail ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              Se o e-mail <strong>{submittedEmail}</strong> existir no sistema, um link de redefinição foi gerado.
            </div>

            {resetUrl && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
                <p className="text-xs text-indigo-300 mb-2">
                  Ambiente de desenvolvimento — ainda não há envio de e-mail configurado, então o link aparece aqui:
                </p>
                <Link
                  href={resetUrl}
                  className="block break-all text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  {resetUrl}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-500/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando link...
                </>
              ) : (
                'Gerar link de redefinição'
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
