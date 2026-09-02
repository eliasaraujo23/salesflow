export async function updateTaskStatusAction(
  taskId: string | number,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.message || 'Erro ao atualizar tarefa' };
    }
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao atualizar tarefa';
    return { success: false, error: msg };
  }
}
