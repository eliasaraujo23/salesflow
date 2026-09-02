'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { Task } from '@/components/firebase-provider';

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  person: z.string(),
  priority: z.string(),
  status: z.string(),
  due: z.string(),
  late: z.number(),
  description: z.string().nullable(),
  createdAt: z.string(),
});

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch('/api/tasks', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(taskSchema).safeParse(body.data);
  if (!parsed.success) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parsed.data.map((t) => {
    const task: Task = {
      id: t.id,
      title: t.title,
      person: t.person,
      priority: t.priority,
      status: t.status,
      due: t.due,
      late: t.late,
      description: t.description ?? undefined,
      createdAt: t.createdAt,
    };

    // Recalcula atrasos no client, igual ao comportamento anterior
    if (task.status !== 'done' && task.due && task.due !== 'Sem prazo') {
      const parts = task.due.split('/');
      const dueDate = parts.length === 3 ? new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])) : null;
      task.late = dueDate ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000)) : 0;
    } else {
      task.late = 0;
    }

    return task;
  });
}

// Substitui o onSnapshot em Firestore tasks — Kanban/Minhas Tarefas usam
// atualização por tela em foco a cada poucos segundos, aceitável para um
// time pequeno (ver plano de migração Firestore→Neon).
export function useTasksLive(enabled: boolean) {
  return useQuery({
    queryKey: ['tasks-live'],
    queryFn: fetchTasks,
    enabled,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
}
