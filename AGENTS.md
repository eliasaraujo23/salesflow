<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Guidelines & Rules

> [!IMPORTANT]
> The rules and stack decisions defined below are **mandatory and non-revocable**. Every agent and developer must strictly adhere to these patterns.

## 1. Core Technology Stack
Whenever building features, UI, forms, tables, or API calls, you **MUST** use the following libraries. Do not look for or install alternative packages for these purposes:
- **Language**: TypeScript (strictly typed, no `any`)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (configured with Radix UI primitives)
- **State & Data Fetching**: `@tanstack/react-query`
- **Tables**: `@tanstack/react-table`
- **Virtualization**: `@tanstack/react-virtual`
- **Form Handling**: `react-hook-form` with `@hookform/resolvers`
- **Validation**: `zod` (used for both input/output validation and form schemas)
- **Charts**: `recharts`
- **Toasts & Notifications**: `sonner`
- **Authentication/JWT**: `jose`

---

## 2. Component Isolation
- **Rule**: Always create isolated, single-responsibility components.
- **Never** build a single file containing multiple components (e.g., helper sub-components, list items, etc., declared in the same file as the parent).
- Each component must live in its own file and be exported cleanly. Keep layout components, form fields, and page views decoupled and modular.

---

## 3. Standard API Actions Pattern
All API requests must follow a strict, standardized pattern for actions. You must validate both the input (where applicable) and the output using **Zod schemas** and ensure everything is fully typed.

### API Response Interface
```typescript
interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}
```

### Action Example
Use the following pattern for writing actions/fetch functions:
```typescript
import { z } from 'zod';

// Example output schema
const importOutputSchema = z.object({
  importedCount: z.number(),
  skippedCount: z.number(),
});

type ImportOutput = z.infer<typeof importOutputSchema>;

export async function importPricesFromCsv(formData: FormData): Promise<ResponseApi<ImportOutput>> {
  const result = await fetchApi('/reports/import-prices-csv', {
    method: 'POST',
    body: formData,
  });

  if (!result.ok) {
    const errorResponse = await result.json();
    return { httpStatus: errorResponse.httpStatus, message: errorResponse.message };
  }

  const response = await result.json();
  const { success, error, data } = importOutputSchema.safeParse(response.data);
  if (!success) {
    return { 
      httpStatus: 400, 
      message: 'Resposta inesperada do servidor.', 
      errors: error 
    };
  }

  return { data, httpStatus: response.httpStatus };
}
```

---

## 4. Encapsulation of Logic (Custom Hooks)
- **Rule**: Keep UI components pure and focused on rendering.
- **Do not** write complex business logic, extensive state manipulation, or API calling logic directly inside a component.
- Always encapsulate this logic in custom React hooks (e.g., `useImportPrices`, `useProductTable`, etc.) and export the necessary state and event handlers to the component.

---

## 5. Paridade entre Lojas (Controle de Lojas)

> [!IMPORTANT]
> **GTT (Tijuca) é a loja de referência.** Toda alteração feita para GTT — seja em código, componentes, hooks, types, scripts de migração ou regras de negócio — deve ser aplicada **imediatamente e automaticamente** para todas as demais lojas, **sem precisar ser solicitado**.

- Lojas atuais: **GTT** (Tijuca, T), **24K** (Méier, M), **GTI** (Ipanema, I), **CI** (Prime Joias Copanema, C), **PTQ** (Prime Joias Taquara, Q), **PGT** (Premier Gold Tijuca, GT). A lista completa e canônica vive em `LOJAS`, `lib/controle-config.ts`.
- O agente deve, por conta própria, verificar e propagar qualquer mudança para todas as lojas antes de considerar uma tarefa concluída.
- As lojas diferem **apenas** em dados de configuração (avaliadores, feedbacks locais, bancas, caixa_bruto, trocados) definidos em `lib/controle-config.ts`. Todo o restante — lógica, UI, hooks, types, scripts — é idêntico.
- Scripts de migração Access → Firestore (`migrate-gtt.js`, `migrate-gti.js`) devem sempre ter a mesma estrutura e os mesmos campos. Ao adicionar um campo em um, adicionar em todos e re-executar as migrações afetadas.

---

## 6. Regras de Negócio do Resumo (Metal)
Estas regras governam todos os cálculos de `components/controle/metal-unified.tsx` e são **idênticas para todas as lojas**.

### Qualidades que contam como "Ouro + Platina"
`ouro_24k`, `ouro_22k`, `pt`, `ouro_750`, `ouro_720`, `bx`, `platina`
- **BX (baixa liga) é ouro** e obrigatoriamente entra nessa soma.
- `prata` não entra em "Ouro + Platina".

### Compra válida
Um registro conta como compra válida quando:
1. `transacao === 'COMPRA'`
2. `somaOuroPlatina(r) > 0` — tem pelo menos algum metal dos campos acima

### Bijuteria
- `motivo_nc === '4'` → é bijuteria.
- Bijuteria é excluída do denominador de **Conversão** (não conta como oportunidade real).

### Métricas calculadas
| Métrica | Fórmula |
|---|---|
| Peso Ouro | soma de `total_peso` das compras válidas |
| Ouro + Platina | soma de `somaOuroPlatina` das compras válidas |
| Média Preço | `valorGasto / ouroPlatina` |
| Conversão | `totalCompras / semBijuteria` |
| Meta Nova | proporção de compras com `0 < pago_por_grama <= 250` |
| Peso Sem Venda | soma de `somaOuroPlatina` dos registros `NAO_COMPRA` que não são bijuteria |
| Sem Bijuteria | `totalAvaliacoes - bijuteria` |

### Ordenação dos registros
- Registros são ordenados por `datetime` decrescente (`data` + `hora` combinados em um `Timestamp`).
- Nunca usar `orderBy('data')` sozinho — causa ordenação errada em registros do mesmo dia.

---

## 7. Padrão de Tabelas no Painel Mensal

Toda tabela de detalhamento dentro de `app/(dashboard)/painel/` **deve** seguir este padrão obrigatório:

### Estrutura sticky com scroll
```tsx
<div className="shrink-0 h-56 overflow-auto bg-white dark:bg-zinc-900 border ... rounded-xl">
  <table className="w-full text-xs border-separate border-spacing-0">
    <thead>
      {/* Linha 1: título fixo em top-0 */}
      <tr>
        <th colSpan={N} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b ...">
          Título — X itens
        </th>
      </tr>
      {/* Linha 2: colunas ordenáveis fixas em top-[41px] */}
      <tr>
        {COLS.map(col => (
          <th onClick={() => toggleSort(col.key)} className="sticky top-[41px] z-10 bg-white dark:bg-zinc-900 border-b ... cursor-pointer select-none">
            <span className="inline-flex items-center gap-1">
              {col.label}
              {sortKey === col.key
                ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                : <ChevronsUpDown size={10} className="opacity-30" />}
            </span>
          </th>
        ))}
      </tr>
    </thead>
    <tbody>...</tbody>
  </table>
</div>
```

### Regras
- **Nunca** usar `overflow-x-auto` em um div filho separado do `overflow-y` — quebra o `sticky`.
- O container usa `overflow-auto` (ambos), a tabela usa `border-separate border-spacing-0` para manter bordas.
- Ordenação local via `useState` + `useMemo` no próprio componente de página.
- **Altura padrão obrigatória**: `shrink-0 h-56` — não usar `flex-1`, `h-52`, `maxHeight` ou outro valor. Referência: tabela de Parceiros.
- Default de ordenação: coluna de data/dias desc (mais recente primeiro).
- Ícones: `ChevronUp` / `ChevronDown` (coluna ativa) e `ChevronsUpDown opacity-30` (inativa) — importados de `lucide-react`.
- **Centralização obrigatória**: todo `<table>` de dados deve ter a classe `data-table`. A regra em `globals.css` aplica `text-align: center` automaticamente em todos os `th` e `td`. **Nunca** adicionar `text-center` manualmente em células individuais — use só `data-table` no elemento `<table>`. Exceção: `components/ui/table.tsx` (componente base shadcn) e tabelas de formulário com alinhamento intencional (ex: `caixa-calculator.tsx`).

---

## 8. Abas sem Filtro de Período

Algumas abas do Painel Mensal usam dados históricos fixos (não dependem do filtro global de datas) e **não devem exibir a barra de período**.

### Regra
- A constante `TABS_WITHOUT_PERIOD` em `components/painel/painel-filter-bar.tsx` lista os pathnames que ocultam a barra.
- Ao criar uma nova aba com dados históricos próprios (ex: evolutivo, rankings anuais), adicionar seu pathname a essa lista.
- Abas atualmente isentas: `/painel/evolutivo`.

### Ajuste de layout nessas abas
- Como a barra de período some (~56px a menos), o conteúdo ganha altura extra.
- Os charts devem ser dimensionados para que **tudo caiba em uma tela** sem scroll vertical — ajustar `height` dos `ResponsiveContainer` conforme necessário.
