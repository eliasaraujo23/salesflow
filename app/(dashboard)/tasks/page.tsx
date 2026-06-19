'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase } from '@/components/firebase-provider';
import { KPICard } from '@/components/kpi-card';
import {
  ClipboardList, CheckCircle, Loader2, AlertTriangle,
  Plus, Filter, ArrowDownUp, Calendar, Pencil, Check,
} from 'lucide-react';
import { toast } from 'sonner';

type TaskStatus = 'pendente' | 'progress' | 'blocked' | 'done';
type Priority   = 'urgente' | 'alta' | 'media' | 'baixa';

interface TaskRow {
  id: string | number;
  title: string;
  description?: string;
  person: string;
  priority: Priority;
  status: TaskStatus;
  due: string;
  late: number;
}

const PRIORITY: Record<string, { label: string; strip: string; pill: string }> = {
  urgente: { label: 'Urgente', strip: 'bg-red-500',     pill: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-500/20' },
  alta:    { label: 'Alta',    strip: 'bg-amber-500',   pill: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20' },
  media:   { label: 'Média',   strip: 'bg-indigo-500',  pill: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-500/20' },
  baixa:   { label: 'Baixa',   strip: 'bg-emerald-500', pill: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20' },
  _none:   { label: '—',       strip: 'bg-zinc-300 dark:bg-zinc-700', pill: 'bg-zinc-100 dark:bg-white/[0.05] text-zinc-500 dark:text-zinc-500 border-transparent' },
};

function TaskItem({ task }: { task: TaskRow }) {
  const cfg    = PRIORITY[task.priority] ?? PRIORITY._none;
  const isDone = task.status === 'done';
  const isLate = task.late > 0 && !isDone;

  return (
    <div className="flex items-stretch hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group">
      {/* Priority strip */}
      <div className={`w-[3px] shrink-0 ${cfg.strip} opacity-80`} />

      <div className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3.5">
        {/* Checkbox */}
        <div className={`w-[17px] h-[17px] rounded-[5px] border shrink-0 flex items-center justify-center transition-colors ${
          isDone
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-zinc-300 dark:border-zinc-700 group-hover:border-indigo-400 dark:group-hover:border-indigo-500'
        }`}>
          {isDone && <Check size={10} className="text-white" strokeWidth={3.5} />}
        </div>

        {/* Priority badge */}
        <span className={`px-2 py-[3px] rounded-md text-[10px] font-semibold border shrink-0 ${cfg.pill}`}>
          {cfg.label}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-medium leading-snug ${isDone ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {task.title}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            {task.due && task.due !== 'Sem prazo' ? (
              <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                <Calendar size={10} /> {task.due}
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-600">Sem prazo</span>
            )}
            {isLate && (
              <span className="text-[10px] font-bold px-1.5 py-px rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-500/20">
                {task.late}d atraso
              </span>
            )}
            {task.person && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">· {task.person}</span>
            )}
          </div>
        </div>

        {/* Edit */}
        <button
          onClick={() => toast.info('Edição de tarefas em breve')}
          className="shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <Pencil size={13} />
        </button>
      </div>
    </div>
  );
}

const FILTER_OPTIONS = [
  { id: 'todas',      label: 'Todas' },
  { id: 'hoje',       label: 'Hoje' },
  { id: 'amanha',     label: 'Amanhã' },
  { id: 'semana',     label: 'Esta semana' },
  { id: 'atrasadas',  label: 'Atrasadas' },
  { id: 'concluidas', label: 'Concluídas' },
];

function parseDue(due: string): Date | null {
  if (!due || due === 'Sem prazo') return null;
  const parts = due.split('/');
  if (parts.length !== 3) return null;
  const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return isNaN(d.getTime()) ? null : d;
}

export default function TasksPage() {
  const { tasks } = useFirebase();
  const [activeFilter,    setActiveFilter]    = useState('todas');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterPerson,    setFilterPerson]    = useState('');
  const [filterPriority,  setFilterPriority]  = useState('');

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const filteredTasks = useMemo(() => {
    let result = [...tasks] as TaskRow[];
    if (filterPerson)   result = result.filter(t => t.person   === filterPerson);
    if (filterPriority) result = result.filter(t => t.priority === filterPriority);

    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd  = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

    switch (activeFilter) {
      case 'hoje':       return result.filter(t => { const d=parseDue(t.due); return d && d.getTime()===today.getTime(); });
      case 'amanha':     return result.filter(t => { const d=parseDue(t.due); return d && d.getTime()===tomorrow.getTime(); });
      case 'semana':     return result.filter(t => { const d=parseDue(t.due); return d && d>=today && d<=weekEnd; });
      case 'atrasadas':  return result.filter(t => t.late > 0 && t.status !== 'done');
      case 'concluidas': return result.filter(t => t.status === 'done');
      default:           return result;
    }
  }, [tasks, activeFilter, filterPerson, filterPriority, today]);

  const stats = useMemo(() => {
    const completed  = tasks.filter(t => t.status === 'done').length;
    const todayCount = tasks.filter(t => { const d=parseDue(t.due); return d && d.getTime()===today.getTime(); }).length;
    return {
      total: todayCount,
      completed,
      pct: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      inProgress: tasks.filter(t => t.status === 'progress').length,
      late:       tasks.filter(t => (t.late as number) > 0 && t.status !== 'done').length,
    };
  }, [tasks, today]);

  const filterCounts = useMemo(() => {
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd  = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
    return {
      todas:      tasks.length,
      hoje:       tasks.filter(t => { const d=parseDue(t.due); return d && d.getTime()===today.getTime(); }).length,
      amanha:     tasks.filter(t => { const d=parseDue(t.due); return d && d.getTime()===tomorrow.getTime(); }).length,
      semana:     tasks.filter(t => { const d=parseDue(t.due); return d && d>=today && d<=weekEnd; }).length,
      atrasadas:  tasks.filter(t => (t.late as number) > 0 && t.status !== 'done').length,
      concluidas: tasks.filter(t => t.status === 'done').length,
    } as Record<string, number>;
  }, [tasks, today]);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => toast.info('Criação de tarefas em breve')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus size={15} strokeWidth={2.5} /> Nova tarefa
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterPanel(v => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all ${
              showFilterPanel
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                : 'border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.12]'
            }`}
          >
            <Filter size={13} /> Filtrar
          </button>
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.12] text-[13px] font-medium transition-all">
            <ArrowDownUp size={13} /> Ordenar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={ClipboardList} label="Total hoje"   value={stats.total}      subtext="tarefas para hoje"         variant="blue"  />
        <KPICard icon={CheckCircle}   label="Concluídas"   value={stats.completed}  subtext={`${stats.pct}% do total`}  variant="green" />
        <KPICard icon={Loader2}       label="Em andamento" value={stats.inProgress} subtext="em progresso"              variant="amber" />
        <KPICard icon={AlertTriangle} label="Atrasadas"    value={stats.late}       subtext="precisam de atenção"       variant="red"   />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setActiveFilter(opt.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
              activeFilter === opt.id
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.12]'
            }`}
          >
            {opt.label}
            {filterCounts[opt.id] > 0 && (
              <span className={`text-[10px] font-bold ${activeFilter === opt.id ? 'opacity-75' : 'opacity-50'}`}>
                {filterCounts[opt.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Responsável', value: filterPerson, setter: setFilterPerson,
                options: Array.from(new Set(tasks.map(t => t.person).filter(Boolean))).map(p => ({ value: p, label: p })) },
              { label: 'Prioridade', value: filterPriority, setter: setFilterPriority,
                options: [
                  { value: 'urgente', label: 'Urgente' },
                  { value: 'alta', label: 'Alta' },
                  { value: 'media', label: 'Média' },
                  { value: 'baixa', label: 'Baixa' },
                ]},
            ].map(field => (
              <div key={field.label}>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-2 uppercase tracking-[0.6px]">
                  {field.label}
                </label>
                <select
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-700 dark:text-zinc-300 text-[13px] focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-colors"
                >
                  <option value="">Todos</option>
                  {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/[0.06] rounded-xl overflow-hidden shadow-sm">
        {filteredTasks.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
            {filteredTasks.map(task => <TaskItem key={task.id} task={task} />)}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={22} className="text-zinc-400" />
            </div>
            <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nenhuma tarefa encontrada</p>
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500">Ajuste os filtros ou crie uma nova tarefa</p>
          </div>
        )}
      </div>
    </div>
  );
}
