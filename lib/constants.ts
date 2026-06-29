export interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  section: string;
  adminOnly?: boolean;
  permission?: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Minhas Tarefas',    href: '/tasks',         icon: 'ti-home-2',          section: 'Tarefas',     permission: 'minhas' },
  { label: 'Kanban',            href: '/kanban',         icon: 'ti-layout-kanban',   section: 'Tarefas',     permission: 'kanban' },
  { label: 'Calendário',        href: '/calendar',       icon: 'ti-calendar',        section: 'Tarefas',     permission: 'calendario' },
  { label: 'Relatórios',        href: '/reports',        icon: 'ti-file-analytics',  section: 'Análise',     permission: 'relatorios' },
  { label: 'Análise JF',        href: '/analise-jf',     icon: 'ti-chart-bar',       section: 'Análise',     permission: 'analise-jf' },
  { label: 'Evolução Parceiros',href: '/graficos/parceiros', icon: 'ti-chart-line', section: 'Gráficos',    permission: 'graficos-parceiros' },
  { label: 'Controle de Metais',href: '/metals',         icon: 'ti-weight',          section: 'Estoque',     permission: 'metais' },
  { label: 'Fabricações JF',    href: '/fabricacoes-jf', icon: 'ti-hammer',          section: 'Estoque',     permission: 'fabricacoes' },
  { label: 'Fabricações JM',    href: '/fabricacoes-jm', icon: 'ti-hammer',          section: 'Estoque',     permission: 'fabricacoes-jm' },
  { label: 'Manutenções',       href: '/maintenance',    icon: 'ti-hammer',          section: 'Estoque',     permission: 'manutencao' },
  { label: 'Revenda',           href: '/resale',         icon: 'ti-shopping-bag',    section: 'Estoque',     permission: 'revenda' },
  { label: 'IA de Reuniões',    href: '/ia',             icon: 'ti-brain',           section: 'IA',          permission: 'ia' },
  { label: 'Fotografia',        href: '/photography',    icon: 'ti-camera',          section: 'Operacional', permission: 'fotografia' },
  { label: 'Parceiros',         href: '/partners',       icon: 'ti-building-store',  section: 'Operacional', permission: 'parceiros' },
  { label: 'Carros-Chefe',      href: '/carros-chefe',   icon: 'ti-star',            section: 'Operacional', permission: 'parceiros' },
  { label: 'Usuários & Acesso', href: '/users',          icon: 'ti-shield-check',    section: 'Admin',       adminOnly: true },
  { label: 'Configurações',     href: '/settings',       icon: 'ti-settings-2',      section: 'Admin',       adminOnly: true },
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
