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
type Priority = 'urgente' | 'alta' | 'media' | 'baixa';

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

const PRIORITY_BADGE: Record<Priority, { pill: string; label: string }> = {
  urgente: { pill: 'bg-semantic-red/15 text-semantic-red',    label: 'Urgente' },
  alta:    { pill: 'bg-semantic-amber/15 text-semantic-amber', label: 'Alta' },
  media:   { pill: 'bg-accent/15 text-accent',                 label: 'Média' },
  baixa:   { pill: 'bg-semantic-green/15 text-semantic-green', label: 'Baixa' },
};

function TaskRow({ task }: { task: TaskRow }) {
  const badge = PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.media;
  const isDone = task.status === 'done';
  const isLate = task.late > 0 && !isDone;

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-bg-surface-2 transition-colors group">
      {/* Checkbox */}
      <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${isDone ? 'bg-semantic-green border-semantic-green' : 'border-border-2 group-hover:border-accent'}`}>
        {isDone && <Check size={10} className="text-white" strokeWidth={3} />}
      </div>

      {/* Priority badge */}
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${badge.pill}`}>
        {badge.label}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium leading-tight ${isDone ? 'line-through text-text-muted' : 'text-text'}`}>
          {task.title}
        </div>
        {task.description && (
          <div className="text-xs text-text-muted truncate mt-0.5">{task.description}</div>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-muted">
          {task.due && task.due !== 'Sem prazo' ? (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {task.due}
            </span>
          ) : (
            <span>Sem prazo</span>
          )}
          {isLate && (
            <>
              <span>·</span>
              <span className="text-semantic-red">{task.late}d atraso</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-semantic-red/15 text-semantic-red">
                Atrasada {task.late}d
              </span>
            </>
          )}
          {task.person && (
            <>
              <span>·</span>
              <span>{task.person}</span>
            </>
          )}
        </div>
      </div>

      {/* Edit */}
      <button
        onClick={() => toast.info('Edição de tarefas em breve')}
        className="shrink-0 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-border transition-all text-text-muted hover:text-text"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}

const FILTER_OPTIONS = [
  { id: 'todas',     label: 'Todas' },
  { id: 'hoje',      label: 'Hoje' },
  { id: 'amanha',    label: 'Amanhã' },
  { id: 'semana',    label: 'Esta semana' },
  { id: 'atrasadas', label: 'Atrasadas' },
  { id: 'concluidas',label: 'Concluídas' },
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
  const [activeFilter, setActiveFilter] = useState('todas');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterPerson, setFilterPerson] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filteredTasks = useMemo(() => {
    let result = [...tasks] as TaskRow[];

    if (filterPerson)   result = result.filter(t => t.person === filterPerson);
    if (filterPriority) result = result.filter(t => t.priority === filterPriority);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    switch (activeFilter) {
      case 'hoje':
        return result.filter(t => {
          const d = parseDue(t.due);
          return d && d.getTime() === today.getTime();
        });
      case 'amanha':
        return result.filter(t => {
          const d = parseDue(t.due);
          return d && d.getTime() === tomorrow.getTime();
        });
      case 'semana':
        return result.filter(t => {
          const d = parseDue(t.due);
          return d && d >= today && d <= weekEnd;
        });
      case 'atrasadas':
        return result.filter(t => t.late > 0 && t.status !== 'done');
      case 'concluidas':
        return result.filter(t => t.status === 'done');
      default:
        return result;
    }
  }, [tasks, activeFilter, filterPerson, filterPriority, today]);

  const stats = useMemo(() => {
    const todayCount = tasks.filter(t => {
      const d = parseDue(t.due);
      return d && d.getTime() === today.getTime();
    }).length;
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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
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
    <div className="p-6 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => toast.info('Criação de tarefas em breve')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-2 transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nova tarefa
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterPanel(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilterPanel ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text hover:border-border-2'}`}
          >
            <Filter size={14} />
            Filtrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text hover:border-border-2 text-sm font-medium transition-colors">
            <ArrowDownUp size={14} />
            Ordenar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={ClipboardList} label="Total hoje"   value={stats.total}      subtext="tarefas"                        variant="blue" />
        <KPICard icon={CheckCircle}   label="Concluídas"   value={stats.completed}   subtext={`${stats.completedPct}% do dia`} variant="green" />
        <KPICard icon={Loader2}       label="Em andamento" value={stats.inProgress}  subtext="em progresso"                   variant="amber" />
        <KPICard icon={AlertTriangle} label="Atrasadas"    value={stats.late}        subtext="urgente atenção"                variant="red" />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setActiveFilter(opt.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === opt.id
                ? 'bg-accent text-white'
                : 'bg-bg-surface border border-border text-text-muted hover:text-text hover:border-border-2'
            }`}
          >
            {opt.label}
            {filterCounts[opt.id] > 0 && (
              <span className={`text-[11px] font-bold px-1 rounded ${activeFilter === opt.id ? 'opacity-70' : 'opacity-50'}`}>
                {filterCounts[opt.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Responsável</label>
              <select
                value={filterPerson}
                onChange={e => setFilterPerson(e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent outline-none"
              >
                <option value="">Todos</option>
                {Array.from(new Set(tasks.map(t => t.person).filter(Boolean))).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Prioridade</label>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent outline-none"
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
      <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
        {filteredTasks.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredTasks.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="p-14 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-medium text-text mb-1">Nenhuma tarefa encontrada</p>
            <p className="text-xs text-text-muted">Ajuste os filtros ou crie uma nova tarefa</p>
          </div>
        )}
      </div>
    </div>
  );
}
