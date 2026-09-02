import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByEmail } from '@/lib/auth/users-repo';
import { issuePasswordResetToken } from '@/lib/auth/password-reset-repo';

const requestSchema = z.object({
  email: z.string().email(),
});

const outputSchema = z.object({
  resetUrl: z.string(),
});

type Output = z.infer<typeof outputSchema>;

// NOTA: não há provedor de e-mail configurado neste projeto ainda. Em vez de
// enviar o link por e-mail, esta rota o devolve diretamente na resposta —
// aceitável apenas em desenvolvimento. Quando um provedor for escolhido,
// trocar o retorno por um envio real e parar de expor `resetUrl` na resposta.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await findUserByEmail(email);

  // Mesma resposta exista ou não o usuário, para não permitir enumeração de contas.
  const genericResponse = { httpStatus: 200, message: 'Se o e-mail existir, um link de redefinição foi gerado.' };

  if (!user || !user.isActive) {
    return NextResponse.json(genericResponse);
  }

  const token = await issuePasswordResetToken(user.id);
  const origin = req.nextUrl.origin;
  const resetUrl = `${origin}/redefinir-senha?token=${token}`;

  const output: Output = { resetUrl };
  return NextResponse.json({ ...genericResponse, data: output });
}
