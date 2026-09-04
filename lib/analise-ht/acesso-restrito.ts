// Usuário de Análise HT com acesso restrito a só a aba Resumo — ver
// conversa Elias 2026-09-04: Raphael Borges deve ver apenas o resumo.
const EMAILS_SOMENTE_RESUMO = ['raphael.borges@goldtechjoias.com'];

export function acessoSomenteResumo(email: string | undefined | null): boolean {
  if (!email) return false;
  return EMAILS_SOMENTE_RESUMO.includes(email.toLowerCase());
}
