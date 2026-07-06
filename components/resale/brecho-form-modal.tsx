'use client';

import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const ESTADOS_BR = [
  { uf: 'AC', nome: 'Acre' },
  { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AM', nome: 'Amazonas' },
  { uf: 'AP', nome: 'Amapá' },
  { uf: 'BA', nome: 'Bahia' },
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PE', nome: 'Pernambuco' },
  { uf: 'PI', nome: 'Piauí' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SE', nome: 'Sergipe' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'TO', nome: 'Tocantins' },
];

interface Props {
  onClose: () => void;
  onSave: (data: { nome: string; estado: string; uf: string }) => Promise<void>;
}

const inputCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1';

export function BrechoFormModal({ onClose, onSave }: Props) {
  const [nome, setNome] = useState('');
  const [estadoUf, setEstadoUf] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = ESTADOS_BR.find(e => e.uf === estadoUf);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!nome.trim() || !estadoUf) return;
    setSaving(true);
    try {
      await onSave({ nome: nome.trim(), estado: selected?.nome ?? estadoUf, uf: estadoUf });
      toast.success('Brechó adicionado');
      onClose();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.04]">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Novo Brechó</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Nome do Brechó</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Brilho Vintage"
              autoFocus
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select value={estadoUf} onChange={e => setEstadoUf(e.target.value)} className={inputCls}>
              <option value="">Selecionar estado...</option>
              {ESTADOS_BR.map(e => (
                <option key={e.uf} value={e.uf}>{e.uf} — {e.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm font-medium text-zinc-500 border border-zinc-200 dark:border-white/[0.08] rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !nome.trim() || !estadoUf}
              className="flex-1 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
