'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sun, Moon, CloudCheck, Menu, ChevronRight } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { NavTabBar, type NavTab } from '@/components/nav-tab-bar';
import { useFirebase } from '@/components/firebase-provider';
import { acessoSomenteResumo } from '@/lib/analise-ht/acesso-restrito';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onMobileMenu?: () => void;
  desktopCollapsed?: boolean;
}

interface TabGroupConfig {
  match: (pathname: string) => boolean;
  tabs: { label: string; href: string; active: (pathname: string) => boolean }[];
}

const TAB_GROUPS: TabGroupConfig[] = [
  {
    match: pathname => pathname.startsWith('/fabricacoes-jf') || pathname === '/analise-jf',
    tabs: [
      { label: 'Estoque', href: '/fabricacoes-jf', active: p => p === '/fabricacoes-jf' },
      { label: 'Análise', href: '/analise-jf',      active: p => p === '/analise-jf' },
    ],
  },
  {
    match: pathname => pathname.startsWith('/fabricacoes-jm'),
    tabs: [
      { label: 'Estoque', href: '/fabricacoes-jm', active: p => p === '/fabricacoes-jm' || p.startsWith('/fabricacoes-jm/') },
    ],
  },
  {
    match: pathname => pathname.startsWith('/fabricacoes-jc'),
    tabs: [
      { label: 'Estoque', href: '/fabricacoes-jc', active: p => p === '/fabricacoes-jc' || p.startsWith('/fabricacoes-jc/') },
    ],
  },
  {
    match: pathname => pathname === '/tasks' || pathname === '/ia',
    tabs: [
      { label: 'Tarefas',     href: '/tasks', active: p => p === '/tasks' },
      { label: 'IA Reuniões', href: '/ia',    active: p => p === '/ia' },
    ],
  },
  {
    match: pathname => pathname.startsWith('/partners') || pathname.startsWith('/graficos/parceiros') || pathname === '/carros-chefe',
    tabs: [
      { label: 'Geral',           href: '/partners',              active: p => p === '/partners' },
      { label: 'Por Carro Chefe', href: '/partners/gaps',         active: p => p === '/partners/gaps' },
      { label: 'Por Parceiro',    href: '/partners/por-parceiro', active: p => p === '/partners/por-parceiro' },
      { label: 'Evolução',        href: '/graficos/parceiros',    active: p => p.startsWith('/graficos/parceiros') },
      { label: 'Carros-Chefe',    href: '/carros-chefe',          active: p => p === '/carros-chefe' },
    ],
  },
  {
    match: pathname => pathname.startsWith('/painel'),
    tabs: [
      { label: 'Vendas Gerais', href: '/painel' },
      { label: 'B2B B2C',       href: '/painel/canais' },
      { label: 'Parceiros',     href: '/painel/parceiros' },
      { label: 'Eternno',       href: '/painel/eternno' },
      { label: 'Leilões',       href: '/painel/leiloes' },
      { label: 'Mercado Livre', href: '/painel/mercado-livre' },
      { label: 'Scrap',         href: '/painel/scrap' },
      { label: 'Vida Scrap',    href: '/painel/vida-scrap' },
      { label: 'Joias',         href: '/painel/joias' },
      { label: 'Cadastradas',   href: '/painel/cadastradas' },
      { label: 'Joias/Mês',     href: '/painel/joias-mes' },
      { label: 'Conversão JF',  href: '/painel/conversao-jf' },
      { label: 'Conversão JM',  href: '/painel/conversao-jm' },
      { label: 'Evolutivo',     href: '/painel/evolutivo' },
    ].map(tab => ({
      ...tab,
      active: (p: string) => (tab.href === '/painel' ? p === '/painel' : p === tab.href || p.startsWith(tab.href + '/')),
    })),
  },
  {
    match: pathname => pathname.startsWith('/leilao'),
    tabs: [
      { label: 'Cronograma',   href: '/leilao' },
      { label: 'Base Sistema', href: '/leilao/base-sistema' },
      { label: 'Pendências',   href: '/leilao/pendencias' },
      { label: 'Robô',         href: '/leilao/robo' },
      { label: 'Lances',       href: '/leilao/lances' },
      { label: 'Conferências', href: '/leilao/conferencias' },
      { label: 'Regras',       href: '/leilao/regras' },
    ].map(tab => ({
      ...tab,
      active: (p: string) => (tab.href === '/leilao' ? p === '/leilao' : p === tab.href || p.startsWith(tab.href + '/')),
    })),
  },
  {
    match: pathname => pathname.startsWith('/resale'),
    tabs: [
      { label: 'Vendas',  href: '/resale',           active: (p: string) => p === '/resale' },
      { label: 'Brechós', href: '/resale/breachos',  active: (p: string) => p.startsWith('/resale/breachos') },
    ],
  },
  {
    match: pathname => pathname.startsWith('/analise-ht'),
    tabs: [
      { label: 'Bonificação e Premiação', href: '/analise-ht',            active: (p: string) => p === '/analise-ht' },
      { label: 'Resumo',                  href: '/analise-ht/resumo',     active: (p: string) => p.startsWith('/analise-ht/resumo') },
      { label: 'Metas por Loja',          href: '/analise-ht/metas',      active: (p: string) => p.startsWith('/analise-ht/metas') },
      { label: 'Loja Base',               href: '/analise-ht/loja-base',  active: (p: string) => p.startsWith('/analise-ht/loja-base') },
      { label: 'Gratificação',            href: '/analise-ht/gratificacao', active: (p: string) => p.startsWith('/analise-ht/gratificacao') },
      { label: 'Config. Premiação',       href: '/analise-ht/config',     active: (p: string) => p.startsWith('/analise-ht/config') },
    ],
  },
];

export function Topbar({ title, subtitle, onMobileMenu, desktopCollapsed = false }: TopbarProps) {
  const pathname = usePathname();
  const { currentUser } = useFirebase();
  const somenteResumo = acessoSomenteResumo(currentUser?.email);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved ? saved === 'dark' : document.documentElement.classList.contains('dark');
    setIsDark(dark);
    if (!dark) document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  }, []);

  const navItem = NAVIGATION_ITEMS.find(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  const pageTitle = title ?? navItem?.label ?? 'SalesFlow';

  const activeGroup = TAB_GROUPS.find(group => group.match(pathname));
  const tabsVisiveis = pathname.startsWith('/analise-ht') && somenteResumo
    ? activeGroup?.tabs.filter(tab => tab.href === '/analise-ht/resumo')
    : activeGroup?.tabs;
  const tabGroup: NavTab[] | undefined = tabsVisiveis?.map(tab => ({
    label: tab.label,
    href: tab.href,
    active: tab.active(pathname),
  }));

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove('dark');
      setIsDark(false);
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      setIsDark(true);
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] shrink-0 flex items-stretch">
      {/* Logo strip — width tracks the sidebar's collapsed state on desktop */}
      <div
        className={`hidden md:flex items-center shrink-0 border-r border-zinc-200 dark:border-white/[0.13] transition-[width] duration-200 ${
          desktopCollapsed ? 'w-[56px] justify-center' : 'w-[248px] px-3.5 gap-3'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-[15px] shadow-md shadow-indigo-500/25 shrink-0">
          S
        </div>
        {!desktopCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-zinc-900 dark:text-zinc-50 leading-tight">SalesFlow</div>
            <div className="text-[11.5px] text-zinc-400 dark:text-zinc-500 leading-tight">Goldtech Joias</div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
      <div className="h-topbar px-3 md:px-6 flex items-center justify-between gap-2">
        {/* Left: hamburger (mobile) + page title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={onMobileMenu}
            className="md:hidden shrink-0 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
            title="Menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50 truncate shrink-0">
              {(pathname.startsWith('/fabricacoes-jf') || pathname === '/analise-jf')
                ? 'Fabricações JF'
                : (pathname.startsWith('/partners') || pathname.startsWith('/graficos/parceiros') || pathname === '/carros-chefe')
                ? 'Parceiros'
                : (pathname === '/tasks' || pathname === '/ia')
                ? 'Minhas Tarefas'
                : pathname.startsWith('/painel')
                ? 'Painel Mensal'
                : pageTitle}
            </div>
            {subtitle && (
              <div className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                {subtitle}
              </div>
            )}
            {tabGroup && (
              <div className="hidden md:flex items-center gap-1 ml-1 min-w-0">
                <ChevronRight size={14} className="text-zinc-400 shrink-0" />
                <NavTabBar tabs={tabGroup} variant="pill" />
              </div>
            )}
          </div>
        </div>

        {/* Right: search + actions */}
        <div className="flex items-center gap-1">

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button className="p-2 rounded-lg cursor-default text-emerald-500">
            <CloudCheck size={16} />
          </button>
        </div>
      </div>

      {/* Tabs row: mobile-only second line, gets full width to scroll */}
      {tabGroup && (
        <div className="md:hidden px-3 pb-2">
          <NavTabBar tabs={tabGroup} variant="pill" />
        </div>
      )}
      </div>
    </header>
  );
}
