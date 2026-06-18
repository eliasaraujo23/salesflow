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

