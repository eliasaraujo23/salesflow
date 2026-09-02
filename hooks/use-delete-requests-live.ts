'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { DeleteRequest } from '@/components/firebase-provider';

const requestSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  title: z.string().nullable(),
  requestedBy: z.string().nullable(),
  requestedByName: z.string().nullable(),
  createdAt: z.string(),
});

async function fetchDeleteRequests(): Promise<DeleteRequest[]> {
  const res = await fetch('/api/tasks/delete-requests', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(requestSchema).safeParse(body.data);
  if (!parsed.success) return [];

  return parsed.data.map((r) => ({
    docId: r.id,
    taskId: r.taskId,
    title: r.title ?? undefined,
    requestedBy: r.requestedBy ?? undefined,
    requestedByName: r.requestedByName ?? undefined,
    createdAt: r.createdAt,
  }));
}

// Substitui o onSnapshot em Firestore task_delete_requests.
export function useDeleteRequestsLive(enabled: boolean) {
  return useQuery({
    queryKey: ['task-delete-requests-live'],
    queryFn: fetchDeleteRequests,
    enabled,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}
