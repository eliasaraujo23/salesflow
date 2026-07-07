import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-zinc-950 text-zinc-100">
      <div className="text-6xl font-bold text-zinc-700">404</div>
      <p className="text-zinc-400">Página não encontrada.</p>
      <Link
        href="/tasks"
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
