'use client';

import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppContext } from '@/components/firebase-provider';

interface MigrationResult {
  total: number;
  updated: number;
  skipped: number;
  errors: string[];
  log: string[];
}

export default function MigrateTasksPage() {
  const { currentUser } = useAppContext();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-zinc-500 text-sm">
        Acesso restrito a administradores.
      </div>
    );
  }

  async function runMigration() {
    setRunning(true);
    setResult(null);

    const log: string[] = [];
    const errors: string[] = [];
    let updated = 0;
    let skipped = 0;

    try {
      // 1. Load all users — build name → personKey map
      const usersSnap = await getDocs(collection(db, 'usuarios'));
      const nameToKey = new Map<string, string>();
      const allKeys = new Set<string>();

      usersSnap.forEach((d) => {
        const data = d.data();
        const name: string = data.name ?? '';
        const key: string = data.personKey ?? '';
        if (name && key) nameToKey.set(name, key);
        if (key) allKeys.add(key);
      });

      log.push(`Usuários carregados: ${nameToKey.size} com mapeamento nome→chave`);

      // 2. Load all tasks
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const total = tasksSnap.size;
      log.push(`Tarefas encontradas: ${total}`);

      // 3. Update tasks where person is a name (not a personKey)
      const updates: Promise<void>[] = [];

      tasksSnap.forEach((d) => {
        const data = d.data();
        const person: string = data.person ?? '';

        if (!person) { skipped++; return; }

        // Already a personKey
        if (allKeys.has(person)) { skipped++; return; }

        // Try to map name → personKey
        const key = nameToKey.get(person);
        if (!key) {
          errors.push(`Tarefa ${d.id}: person="${person}" não encontrado nos usuários`);
          skipped++;
          return;
        }

        log.push(`Atualizando tarefa ${d.id}: "${person}" → "${key}"`);
        updates.push(updateDoc(doc(db, 'tasks', d.id), { person: key }));
        updated++;
      });

      await Promise.all(updates);
      log.push(`Concluído: ${updated} atualizadas, ${skipped} sem alteração`);

      setResult({ total, updated, skipped, errors, log });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      setResult({ total: 0, updated, skipped, errors, log });
    }

    setRunning(false);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Migração de Tarefas</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Corrige tarefas antigas onde o campo <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-xs">person</code> foi
          salvo com o nome do usuário em vez da chave. Execute apenas uma vez.
        </p>
      </div>

      <button
        onClick={runMigration}
        disabled={running || result?.updated !== undefined}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {running ? 'Migrando...' : result ? 'Concluído' : 'Executar migração'}
      </button>

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: result.total },
              { label: 'Atualizadas', value: result.updated, green: true },
              { label: 'Sem alteração', value: result.skipped },
            ].map(({ label, value, green }) => (
              <div key={label} className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
                <div className={`text-2xl font-bold ${green ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">Não mapeados ({result.errors.length})</div>
              {result.errors.map((e, i) => (
                <div key={i} className="text-xs text-red-500 font-mono">{e}</div>
              ))}
            </div>
          )}

          {/* Log */}
          <div className="bg-zinc-900 rounded-lg p-3 overflow-auto max-h-72">
            {result.log.map((l, i) => (
              <div key={i} className="text-xs text-zinc-300 font-mono leading-5">{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
