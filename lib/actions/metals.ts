export interface AddMetalInput {
  tipo: 'entrada' | 'cadastro' | 'antigo';
  metal: 'ouro' | 'prata' | 'platina';
  data: string;
  origem: string;
  chegou: number;
  cadastrado: number;
  sobrou: number;
  peso: number;
  obs?: string;
}

export async function addMetalAction(
  input: AddMetalInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/metais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.message || 'Erro ao adicionar metal' };
    }
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao adicionar metal';
    return { success: false, error: msg };
  }
}

export async function deleteMetalAction(
  docId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/metais/${docId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.message || 'Erro ao remover metal' };
    }
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao remover metal';
    return { success: false, error: msg };
  }
}
