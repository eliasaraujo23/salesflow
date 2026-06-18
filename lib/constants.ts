export interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  section: string;
  adminOnly?: boolean;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Minhas Tarefas', href: '/tasks', icon: 'ti-home-2', section: 'Tarefas' },
  { label: 'Kanban', href: '/kanban', icon: 'ti-layout-kanban', section: 'Tarefas' },
  { label: 'Calendário', href: '/calendar', icon: 'ti-calendar', section: 'Tarefas' },
  { label: 'Equipe', href: '/team', icon: 'ti-users', section: 'Tarefas' },
  { label: 'Dashboard', href: '/dashboard', icon: 'ti-chart-bar', section: 'Análise' },
  { label: 'Relatórios', href: '/reports', icon: 'ti-file-analytics', section: 'Análise' },
  { label: 'Controle de Metais', href: '/metals', icon: 'ti-weight', section: 'Estoque' },
  { label: 'Fabricações JF', href: '/fabricacoes-jf', icon: 'ti-hammer', section: 'Estoque' },
  { label: 'Fabricações JM', href: '/fabricacoes-jm', icon: 'ti-hammer', section: 'Estoque' },
  { label: 'Manutenções', href: '/maintenance', icon: 'ti-hammer', section: 'Estoque' },
  { label: 'Revenda', href: '/resale', icon: 'ti-shopping-bag', section: 'Estoque' },
  { label: 'IA de Reuniões', href: '/ia', icon: 'ti-brain', section: 'IA' },
  { label: 'Fotografia', href: '/photography', icon: 'ti-camera', section: 'Operacional' },
  { label: 'Parceiros', href: '/partners', icon: 'ti-building-store', section: 'Operacional' },
  { label: 'Usuários & Acesso', href: '/users', icon: 'ti-shield-check', section: 'Admin', adminOnly: true },
  { label: 'Configurações', href: '/settings', icon: 'ti-settings-2', section: 'Admin', adminOnly: true },
];

export const TASK_PRIORITIES = ['urgente', 'alta', 'media', 'baixa'] as const;
export const TASK_STATUSES = ['pendente', 'progress', 'blocked', 'done'] as const;

export const PRIORITY_COLORS: Record<string, string> = {
  urgente: 'border-l-semantic-red',
  alta: 'border-l-semantic-amber',
  media: 'border-l-accent',
  baixa: 'border-l-semantic-green',
};

export const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  progress: 'Em andamento',
  blocked: 'Bloqueada',
  done: 'Concluída',
};
