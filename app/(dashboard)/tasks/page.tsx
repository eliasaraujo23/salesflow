'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase } from '@/components/firebase-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { KPICard } from '@/components/kpi-card';
import { Icon } from '@/components/icon-map';
import {
  ClipboardList,
  CheckCircle,
  Loader,
  AlertTriangle,
  Plus,
  Filter,
  ArrowUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type TaskStatus = 'pendente' | 'progress' | 'blocked' | 'done';
type Priority = 'urgente' | 'alta' | 'media' | 'baixa';

interface TaskCardProps {
  id: string | number;
  title: string;
  description?: string;
  person: string;
  priority: Priority;
  status: TaskStatus;
  due: string;
  late: number;
}

function TaskCard({ task }: { task: TaskCardProps }) {
  const priorityColor: Record<Priority, string> = {
    urgente: 'border-l-semantic-red',
    alta: 'border-l-semantic-amber',
    media: 'border-l-accent',
    baixa: 'border-l-semantic-green',
  };

  const statusText: Record<TaskStatus, string> = {
    pendente: 'Pendente',
    progress: 'Em andamento',
    blocked: 'Bloqueada',
    done: 'Concluída',
  };

  return (
    <div className={`border-l-4 ${priorityColor[task.priority]} bg-bg-surface border border-l-0 border-border rounded-r-lg p-4 hover:bg-bg-surface-2 transition-colors cursor-pointer`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-text mb-1">{task.title}</h3>
          {task.description && <p className="text-sm text-text-muted mb-2">{task.description}</p>}
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span>👤 {task.person}</span>
            <span>📅 {task.due}</span>
            {task.late > 0 && <span className="text-semantic-red font-medium">⚠ {task.late}d atraso</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="px-2 py-1 rounded text-xs font-medium bg-accent/15 text-accent">{statusText[task.status]}</span>
        </div>
      </div>
    </div>
  );
}

const FILTER_OPTIONS = [
  { id: 'todas', label: 'Todas' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'amanha', label: 'Amanhã' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'atrasadas', label: 'Atrasadas' },
  { id: 'concluidas', label: 'Concluídas' },
];

export default function TasksPage() {
  const { tasks } = useFirebase();
  const [activeFilter, setActiveFilter] = useState('todas');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterPerson, setFilterPerson] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (searchQuery) {
      result = result.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterPerson) {
      result = result.filter((t) => t.person === filterPerson);
    }

    if (filterPriority) {
      result = result.filter((t) => t.priority === filterPriority);
    }

    if (filterStatus) {
      result = result.filter((t) => t.status === filterStatus);
    }

    return result;
  }, [tasks, searchQuery, filterPerson, filterPriority, filterStatus]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTasks = tasks.filter((t) => {
      if (!t.due || t.due === 'Sem prazo') return false;
      const parts = t.due.split('/');
      if (parts.length !== 3) return false;
      const taskDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return taskDate.getTime() === today.getTime();
    });

    const completed = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'progress').length;
    const late = tasks.filter((t) => t.late > 0 && t.status !== 'done').length;

    return {
      total: todayTasks.length,
      completed,
      completedPct: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      inProgress,
      late,
    };
  }, [tasks]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Minhas Tarefas</h1>
          <p className="text-sm text-text-muted mt-1">Acompanhe suas atividades em tempo real</p>
        </div>
        <Button className="gap-2">
          <Plus size={18} />
          Nova tarefa
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={ClipboardList}
          label="Total hoje"
          value={stats.total}
          subtext="tarefas"
          variant="blue"
        />
        <KPICard
          icon={CheckCircle}
          label="Concluídas"
          value={stats.completed}
          subtext={`${stats.completedPct}% do dia`}
          variant="green"
        />
        <KPICard
          icon={Loader}
          label="Em andamento"
          value={stats.inProgress}
          subtext="em progresso"
          variant="amber"
        />
        <KPICard
          icon={AlertTriangle}
          label="Atrasadas"
          value={stats.late}
          subtext="urgente atenção"
          variant="red"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setActiveFilter(option.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === option.id
                ? 'bg-accent text-white'
                : 'bg-bg-surface border border-border text-text-muted hover:text-text'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <Card variant="bordered" className="bg-bg-surface-2">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">Responsável</label>
                <select
                  value={filterPerson}
                  onChange={(e) => setFilterPerson(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text text-sm"
                >
                  <option value="">Todos</option>
                  {Array.from(new Set(tasks.map((t) => t.person))).map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">Prioridade</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text text-sm"
                >
                  <option value="">Todas</option>
                  <option value="urgente">Urgente</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text text-sm"
                >
                  <option value="">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="progress">Em andamento</option>
                  <option value="blocked">Bloqueada</option>
                  <option value="done">Concluída</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-border transition-colors text-text-muted hover:text-text text-sm font-medium"
        >
          <Filter size={16} />
          Filtrar
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-border transition-colors text-text-muted hover:text-text text-sm font-medium">
          <ArrowUp size={16} />
          Ordenar
        </button>
      </div>

      {/* Tasks List */}
      <Card variant="bordered">
        <CardContent className="p-0">
          {filteredTasks.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task as TaskCardProps} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-text mb-2">Nenhuma tarefa encontrada</h3>
              <p className="text-text-muted text-sm">Ajuste os filtros ou crie uma nova tarefa</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
