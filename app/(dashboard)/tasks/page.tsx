'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase } from '@/components/firebase-provider';
import { KPICard } from '@/components/kpi-card';
import {
  ClipboardList,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Plus,
  Filter,
  ArrowDownUp,
  Calendar,
  Pencil,
  Check,
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

const PRIORITY_CONFIG: Record<string, { pill: string; label: string; strip: string }> = {
  urgente: { pill: 'bg-semantic-red/12 text-semantic-red border-semantic-red/20',      label: 'Urgente', strip: 'bg-semantic-red' },
  alta:    { pill: 'bg-semantic-amber/12 text-semantic-amber border-semantic-amber/20', label: 'Alta',    strip: 'bg-semantic-amber' },
  media:   { pill: 'bg-accent/12 text-accent border-accent/20',                         label: 'Média',   strip: 'bg-accent' },
  baixa:   { pill: 'bg-semantic-green/12 text-semantic-green border-semantic-green/20', label: 'Baixa',   strip: 'bg-semantic-green' },
  _none:   { pill: 'bg-border text-text-muted-2 border-transparent',                   label: '—',       strip: 'bg-border' },
};

function TaskItem({ task }: { task: TaskRow }) {
  const cfg    = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG._none;
  const isDone = task.status === 'done';
  const isLate = task.late > 0 && !isDone;

  return (
    <div className="flex items-center gap-0 hover:bg-bg-surface-2 transition-colors group">
      {/* Priority strip */}
      <div className={`w-[3px] self-stretch shrink-0 ${cfg.strip} opacity-70`} />

      <div className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3.5">
        {/* Checkbox */}
        <div
          className={`w-[18px] h-[18px] rounded-[5px] border shrink-0 flex items-center justify-center transition-colors ${
            isDone
              ? 'bg-semantic-green border-semantic-green'
              : 'border-border-2 group-hover:border-accent'
          }`}
        >
          {isDone && <Check size={10} className="text-white" strokeWidth={3.5} />}
        </div>

        {/* Priority badge */}
        <span className={`px-2 py-[3px] rounded-md text-[10px] font-semibold border shrink-0 ${cfg.pill}`}>
          {cfg.label}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-medium leading-snug ${isDone ? 'line-through text-text-muted' : 'text-text'}`}>
            {task.title}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            {task.due && task.due !== 'Sem prazo' ? (
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <Calendar size={10} />
                {task.due}
              </span>
            ) : (
              <span className="text-[11px] text-text-muted-2">Sem prazo</span>
            )}
            {isLate && (
              <span className="text-[10px] font-bold px-1.5 py-px rounded bg-semantic-red/12 text-semantic-red border border-semantic-red/20">
                {task.late}d atraso
              </span>
            )}
            {task.person && (
              <span className="text-[11px] text-text-muted">· {task.person}</span>
            )}
          </div>
        </div>

        {/* Edit */}
        <button
          onClick={() => toast.info('Edição de tarefas em breve')}
          className="shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-border transition-all text-text-muted hover:text-text"
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

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const filteredTasks = useMemo(() => {
    let result = [...tasks] as TaskRow[];
    if (filterPerson)   result = result.filter(t => t.person   === filterPerson);
    if (filterPriority) result = result.filter(t => t.priority === filterPriority);

    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd  = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

    switch (activeFilter) {
      case 'hoje':
        return result.filter(t => { const d = parseDue(t.due); return d && d.getTime() === today.getTime(); });
      case 'amanha':
        return result.filter(t => { const d = parseDue(t.due); return d && d.getTime() === tomorrow.getTime(); });
      case 'semana':
        return result.filter(t => { const d = parseDue(t.due); return d && d >= today && d <= weekEnd; });
      case 'atrasadas':
        return result.filter(t => t.late > 0 && t.status !== 'done');
      case 'concluidas':
        return result.filter(t => t.status === 'done');
      default:
        return result;
    }
  }, [tasks, activeFilter, filterPerson, filterPriority, today]);

  const stats = useMemo(() => {
    const todayCount = tasks.filter(t => { const d = parseDue(t.due); return d && d.getTime() === today.getTime(); }).length;
    const completed  = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'progress').length;
    const late       = tasks.filter(t => (t.late as number) > 0 && t.status !== 'done').length;
    return {
      total: todayCount,
      completed,
      completedPct: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      inProgress,
      late,
    };
  }, [tasks, today]);

  const filterCounts = useMemo(() => {
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd  = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
    return {
      todas:      tasks.length,
      hoje:       tasks.filter(t => { const d = parseDue(t.due); return d && d.getTime() === today.getTime(); }).length,
      amanha:     tasks.filter(t => { const d = parseDue(t.due); return d && d.getTime() === tomorrow.getTime(); }).length,
      semana:     tasks.filter(t => { const d = parseDue(t.due); return d && d >= today && d <= weekEnd; }).length,
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent-2 transition-colors shadow-sm"
        >
          <Plus size={15} strokeWidth={2.5} />
          Nova tarefa
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterPanel(v => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all ${
              showFilterPanel
                ? 'border-accent text-accent bg-accent/10'
                : 'border-border text-text-muted hover:text-text hover:border-border-2 hover:bg-border/40'
            }`}
          >
            <Filter size={13} />
            Filtrar
          </button>
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border text-text-muted hover:text-text hover:border-border-2 hover:bg-border/40 text-[13px] font-medium transition-all">
            <ArrowDownUp size={13} />
            Ordenar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={ClipboardList} label="Total hoje"   value={stats.total}     subtext="tarefas para hoje"              variant="blue"  />
        <KPICard icon={CheckCircle}   label="Concluídas"   value={stats.completed} subtext={`${stats.completedPct}% do total`} variant="green" />
        <KPICard icon={Loader2}       label="Em andamento" value={stats.inProgress} subtext="em progresso"                  variant="amber" />
        <KPICard icon={AlertTriangle} label="Atrasadas"    value={stats.late}      subtext="precisam de atenção"            variant="red"   />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setActiveFilter(opt.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
              activeFilter === opt.id
                ? 'bg-accent text-white shadow-sm'
                : 'bg-bg-surface border border-border text-text-muted hover:text-text hover:border-border-2'
            }`}
          >
            {opt.label}
            {filterCounts[opt.id] > 0 && (
              <span className={`text-[10px] font-bold ${activeFilter === opt.id ? 'opacity-80' : 'opacity-50'}`}>
                {filterCounts[opt.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div className="bg-bg-surface border border-border rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-text-muted mb-2 uppercase tracking-[0.6px]">Responsável</label>
              <select
                value={filterPerson}
                onChange={e => setFilterPerson(e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-[13px] focus:border-accent outline-none"
              >
                <option value="">Todos</option>
                {Array.from(new Set(tasks.map(t => t.person).filter(Boolean))).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted mb-2 uppercase tracking-[0.6px]">Prioridade</label>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-[13px] focus:border-accent outline-none"
              >
                <option value="">Todas</option>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="bg-bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        {filteredTasks.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-border flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={22} className="text-text-muted" />
            </div>
            <p className="text-[13px] font-semibold text-text mb-1">Nenhuma tarefa encontrada</p>
            <p className="text-[12px] text-text-muted">Ajuste os filtros ou crie uma nova tarefa</p>
          </div>
        )}
      </div>
    </div>
  );
}
