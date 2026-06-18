'use client';

import React, { useMemo } from 'react';
import { CheckCircle, Clock, AlertTriangle, Users, ClipboardList, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useFirebase } from '@/components/firebase-provider';
import { KPICard } from '@/components/kpi-card';

const PRIORITY_COLOR: Record<string, string> = {
  urgente: '#f46b6b',
  alta: '#f5c842',
  media: '#3b82f6',
  baixa: '#4fe3b1',
};

const PIE_COLORS = ['#4fe3b1', '#3b82f6', '#f5c842', '#f46b6b'];

export default function DashboardPage() {
  const { tasks, users } = useFirebase();

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const progress = tasks.filter((t) => t.status === 'progress').length;
    const late = tasks.filter((t) => t.late > 0 && t.status !== 'done').length;
    const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;

    const byPriority = ['urgente', 'alta', 'media', 'baixa'].map((p) => ({
      name: p.charAt(0).toUpperCase() + p.slice(1),
      value: tasks.filter((t) => t.priority === p).length,
      color: PRIORITY_COLOR[p],
    }));

    const byPerson = Object.entries(
      tasks.reduce<Record<string, { total: number; done: number; late: number }>>((acc, t) => {
        if (!acc[t.person]) acc[t.person] = { total: 0, done: 0, late: 0 };
        acc[t.person].total++;
        if (t.status === 'done') acc[t.person].done++;
        if (t.late > 0 && t.status !== 'done') acc[t.person].late++;
        return acc;
      }, {})
    )
      .map(([person, v]) => ({ person, ...v, pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);

    const byStatus = [
      { name: 'Concluídas', value: done, fill: '#4fe3b1' },
      { name: 'Andamento', value: progress, fill: '#3b82f6' },
      { name: 'Pendentes', value: tasks.filter((t) => t.status === 'pendente').length, fill: '#f5c842' },
      { name: 'Bloqueadas', value: tasks.filter((t) => t.status === 'blocked').length, fill: '#f46b6b' },
    ].filter((s) => s.value > 0);

    return { total, done, progress, late, pctDone, byPriority, byPerson, byStatus };
  }, [tasks]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Visão geral das atividades da equipe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard icon={ClipboardList} label="Total de Tarefas" value={stats.total} subtext="registradas" variant="blue" />
        <KPICard
          icon={CheckCircle}
          label="Concluídas"
          value={stats.done}
          subtext={`${stats.pctDone}% do total`}
          variant="green"
        />
        <KPICard icon={AlertTriangle} label="Atrasadas" value={stats.late} subtext="urgente atenção" variant="red" />
        <KPICard icon={Clock} label="Em Andamento" value={stats.progress} subtext="em progresso" variant="amber" />
        <KPICard icon={Users} label="Membros Ativos" value={users.length} subtext="na plataforma" variant="purple" />
        <KPICard
          icon={TrendingUp}
          label="Taxa de Conclusão"
          value={`${stats.pctDone}%`}
          subtext={`${stats.done} de ${stats.total}`}
          variant="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-4">
            Tarefas por Status
          </h3>
          {stats.byStatus.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={stats.byStatus}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {stats.byStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {stats.byStatus.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: s.fill }} />
                    <span className="text-sm text-text-muted">{s.name}</span>
                    <span className="text-sm font-semibold text-text ml-auto pl-4">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-text-muted text-sm">Sem dados</div>
          )}
        </div>

        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-4">
            Tarefas por Prioridade
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.byPriority} layout="vertical" barSize={16}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={60} tick={{ fill: 'hsl(220 8% 42%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(225 12% 7%)', border: '1px solid hsl(225 10% 12%)', borderRadius: 8 }}
                labelStyle={{ color: 'hsl(225 6% 94%)', fontSize: 12 }}
                itemStyle={{ color: 'hsl(225 6% 94%)', fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {stats.byPriority.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-4">
          Ranking da Equipe
        </h3>
        <div className="space-y-3">
          {stats.byPerson.map((p, i) => (
            <div key={p.person} className="flex items-center gap-3">
              <span className="w-6 text-xs font-bold text-text-muted text-center">{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text">{p.person}</span>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="text-semantic-green">{p.done} concl.</span>
                    {p.late > 0 && <span className="text-semantic-red">{p.late} atras.</span>}
                    <span className="font-semibold text-text">{p.pct}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {stats.byPerson.length === 0 && (
            <div className="py-8 text-center text-text-muted text-sm">Sem tarefas registradas</div>
          )}
        </div>
      </div>
    </div>
  );
}
