'use client';

import { useState, useCallback } from 'react';
import { useFirebase } from '@/components/firebase-provider';
import { parseMeetingText, type ParsedTask } from '@/lib/utils/parse-meeting';
import { createTaskAction } from '@/lib/actions/create-task';
import { toast } from 'sonner';

export type IaStep = 'input' | 'review' | 'done';

export function useIaPage() {
  const { users } = useFirebase();
  const [step, setStep] = useState<IaStep>('input');
  const [rawText, setRawText] = useState('');
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const analyze = useCallback(() => {
    const parsed = parseMeetingText(rawText, users);
    if (parsed.length === 0) {
      toast.error('Nenhuma tarefa encontrada. Verifique o formato do texto.');
      return;
    }
    setTasks(parsed);
    setStep('review');
  }, [rawText, users]);

  const updateTask = useCallback((id: string, updates: Partial<ParsedTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const createTasks = useCallback(async () => {
    if (tasks.length === 0) return;
    setCreating(true);
    let count = 0;
    for (const task of tasks) {
      const result = await createTaskAction({
        title: task.title,
        person: task.person,
        priority: task.priority,
        status: 'pendente',
        due: task.due,
      });
      if (result.httpStatus === 200) {
        count++;
      } else {
        toast.error(`Erro ao criar: ${task.title}`);
      }
    }
    setCreatedCount(count);
    setCreating(false);
    setStep('done');
    if (count > 0) {
      toast.success(`${count} tarefa${count !== 1 ? 's' : ''} criada${count !== 1 ? 's' : ''} com sucesso!`);
    }
  }, [tasks]);

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') setRawText(text);
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const reset = useCallback(() => {
    setStep('input');
    setRawText('');
    setTasks([]);
    setCreatedCount(0);
  }, []);

  return {
    step,
    rawText, setRawText,
    tasks,
    analyze, updateTask, removeTask,
    createTasks, creating, createdCount,
    loadFile, reset,
    users,
  };
}
