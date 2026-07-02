import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ loja: string }>;
}

export default async function LojaIndexPage({ params }: Props) {
  const { loja } = await params;
  redirect(`/controle/${loja}/resumo`);
}
