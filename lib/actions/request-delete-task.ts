export async function requestDeleteTaskAction(
  taskId: string | number,
  taskTitle: string,
  requesterKey: string,
  requesterName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/tasks/delete-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: String(taskId),
        title: taskTitle,
        requestedBy: requesterKey,
        requestedByName: requesterName,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.message || 'Erro ao enviar solicitação' };
    }
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao enviar solicitação';
    return { success: false, error: msg };
  }
}

export async function approveDeleteRequestAction(
  docId: string,
  taskId: string | number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/tasks/delete-requests/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, taskId: String(taskId) }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: body.message || 'Permissão negada ou erro ao aprovar exclusão.' };
    }
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao aprovar exclusão';
    return { success: false, error: msg };
  }
}

export async function rejectDeleteRequestAction(
  docId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/tasks/delete-requests/${docId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.message || 'Erro ao rejeitar solicitação' };
    }
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao rejeitar solicitação';
    return { success: false, error: msg };
  }
}
