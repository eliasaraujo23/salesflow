# Plan to Convert index.html to Next.js 16 Application

This document outlines the architecture, components, API actions, hooks, and verification plan for refactoring a legacy, highly stateful 568KB `index.html` page into a modular and modern Next.js 16 application.

---

## User Review Required

We need the user's input/approval on the proposed routing structure and dependencies.

> [!IMPORTANT]
> The legacy application depends on Firebase Authentication and Firestore to sync tasks, metals inventory, delete requests, and user profiles in real-time. We will set up a global `FirebaseProvider` in React to manage the real-time data sync using standard Firestore SDK modules (`onSnapshot`) and distribute it down via custom React hooks.
>
> To support all project rules from [AGENTS.md](file:///home/vinicius/worktress/app/sales-flow/app/AGENTS.md), we need to install the following dependencies in the `app/` folder:
> - `@tanstack/react-query`
> - `react-hook-form`
> - `@hookform/resolvers`
> - `zod`
> - `sonner`
> - `recharts`
> - `jose`
> - `lucide-react` (for UI icons)
> - `firebase` (client-side SDK)
>
> We will also import/copy the existing shadcn UI primitives from `index/ui/*` and default wrappers from `index/default/*` into the Next.js `app` workspace to enable seamless compilation.

---

## Proposed Changes

We will restructure the application by separating concerns:
1. **Views (Pages)** under the Next.js App router.
2. **Components** under `components/ui` and `components/default` (updating relative paths).
3. **Logic (Hooks)** under `hooks/` to extract business logic from components.
4. **Data layer (Firebase & API)** under `lib/` using TypeScript, Zod, and action patterns.

### Components

#### [NEW] [components/ui](file:///home/vinicius/worktress/app/sales-flow/app/components/ui/)
We will copy the verified shadcn ui components from `/home/vinicius/worktress/app/sales-flow/index/ui/*` to `/home/vinicius/worktress/app/sales-flow/app/components/ui/` so they are available to the app:
- `form.tsx`, `input.tsx`, `checkbox.tsx`, `switch.tsx`, `popover.tsx`, `select.tsx`, `command.tsx`, `dialog.tsx`, `sheet.tsx`, `scroll-area.tsx`, `tabs.tsx`, `tooltip.tsx`, `dropdown-menu.tsx`, `calendar.tsx`, `card.tsx`, `badge.tsx`, `avatar.tsx`, `table.tsx`, `spinner.tsx`, `toast.tsx`, `toaster.tsx`, `sonner.tsx`, etc.

#### [NEW] [components/default](file:///home/vinicius/worktress/app/sales-flow/app/components/default/)
We will copy the default input wrapper components from `/home/vinicius/worktress/app/sales-flow/index/default/*` to `/home/vinicius/worktress/app/sales-flow/app/components/default/` and update all internal imports from relative paths (e.g. `./ui/form`) to absolute path aliases (e.g. `@/components/ui/form`):
- `input-defaut.tsx`
- `input-value-money.tsx`
- `switch-default.tsx`
- `checkbox-default.tsx`
- `textarea-default.tsx`
- `date-picker-default.tsx`
- `combobox-default-item.tsx`
- `new-select-default.tsx`
- `new-select-with-search.tsx`
- `command-default.tsx`

---

### Core Data & Hooks Layer

#### [NEW] [firebase.ts](file:///home/vinicius/worktress/app/sales-flow/app/lib/firebase.ts)
A helper file to initialize the client-side Firebase SDK using the exact credentials extracted from `index.html`:
```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDwOPD8Cl3vFIs64Xte2h3O9-q7M8JP3fI",
  authDomain: "salesflow-goldtech.firebaseapp.com",
  projectId: "salesflow-goldtech",
  storageBucket: "salesflow-goldtech.firebasestorage.app",
  messagingSenderId: "673844856609",
  appId: "1:673844856609:web:2cd067a86bc976a74c2060"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
```

#### [NEW] [firebase-provider.tsx](file:///home/vinicius/worktress/app/sales-flow/app/components/firebase-provider.tsx)
A React context provider that wraps the application. It:
1. Listens for client Firebase auth state changes.
2. Manages real-time data listener snapshot streams for:
   - `tasks` (recalculating late days dynamically)
   - `metais` (metals transactions)
   - `usuarios` (users cache list)
   - `task_delete_requests` (delete approvals)
3. Exposes this real-time state via a React Context.

#### [NEW] [useFirebase.ts](file:///home/vinicius/worktress/app/sales-flow/app/hooks/useFirebase.ts)
A custom hook to consume the real-time databases and authentication states easily within layout and sub-page views.

#### [NEW] [api-actions.ts](file:///home/vinicius/worktress/app/sales-flow/app/lib/api-actions.ts)
A backend/client action helper implementing standard API calls with Zod validation. It wraps calls to `https://goldtech-fabricacoes-api.onrender.com`:
- `loginAction(email, password)`: Calls `/api/login` and signs into Firebase on the client.
- `logoutAction()`: Calls `/api/logout`.
- `fetchJFDashboardData()`: Fetches summary metrics, alerts, items in production, categories, monthly sales charts, and stone types.
- `fetchJMDashboardData()`: Fetches similar JM metrics.
- `fetchMaintenanceData()`: Fetches items under repair.
- `fetchResellData(from, to)`: Fetches revenda records.
- `fetchPartnersData()`: Fetches comodato and sales per partner.
- `photographyActions`: Handles fetching, creating, patching, and deleting photo bags.

---

### Pages and Layouts

We will structure the router pages under `/app` to represent the application pages:

#### [MODIFY] [layout.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/layout.tsx)
Integrate the global state providers (`FirebaseProvider`, TanStack `QueryClientProvider`, and Sonner's `<Toaster />`).

#### [NEW] [(dashboard)/layout.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/layout.tsx)
A shared dashboard layout that houses the responsive Sidebar (featuring user profile display, pages navigation with access permissions enforcement, and log-out controls) and the Topbar (carrying the page titles, search inputs, theme togglers, and Firebase cloud check syncing state indicator).

#### [NEW] [login/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/login/page.tsx)
The login interface showing the SalesFlow logo, email and password credentials inputs, animated password visibility control, and login error alert box.

#### [NEW] [(dashboard)/tasks/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/tasks/page.tsx)
The main "Minhas Tarefas" list:
- Houses KPIs (Today's total, Completed %, Pending, Delayed)
- Real-time task cards displaying delays, deadlines, descriptions, priorities, and assignees.
- Integrates the quick search input and the Filter/Sort panels.
- Add Task & Edit Task dialogs using shadcn/ui.
- Logic is fully isolated into `useTasks.ts` hook.

#### [NEW] [(dashboard)/kanban/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/kanban/page.tsx)
The Kanban view with four status columns: Pending, In Progress, Blocked, and Completed. Drag and drop task status updates. Logic isolated in `useKanban.ts`.

#### [NEW] [(dashboard)/calendar/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/calendar/page.tsx)
Real-time calendar displaying task schedules on month grid with day tasks expansion view. Logic isolated in `useCalendar.ts`.

#### [NEW] [(dashboard)/team/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/team/page.tsx)
Performance board showcasing individual team statistics, task completion rates, delay counters, and active tasks.

#### [NEW] [(dashboard)/dashboard/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/dashboard/page.tsx)
Global statistics cards and team productivity ranking tables.

#### [NEW] [(dashboard)/reports/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/reports/page.tsx)
CSV extraction interface supporting file generation for all tasks, pending tasks, done tasks, team members, metals balance, and movements.

#### [NEW] [(dashboard)/metals/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/metals/page.tsx)
Metal balance KPIs (Gold, Silver, Platinum) along with transaction creation form and history logs table.

#### [NEW] [(dashboard)/fabricacoes-jf/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/fabricacoes-jf/page.tsx)
JF Factory Dashboard:
- Stock, production, and sold KPI boards
- Critical stock indicators alerts list
- Category balance tables
- Recharts-powered monthly sales bar & line charts, and stone-type metrics charts
- Fully isolated in `useJFDashboard.ts`

#### [NEW] [(dashboard)/fabricacoes-jm/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/fabricacoes-jm/page.tsx)
JM Factory Dashboard:
- Mirror layout of JF with JM data feeds.
- Fully isolated in `useJMDashboard.ts`

#### [NEW] [(dashboard)/manutencao/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/manutencao/page.tsx)
Repair items registry tracking destinations, dates, references, and descriptions.

#### [NEW] [(dashboard)/revenda/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/revenda/page.tsx)
Resell data log tracking metrics by supplier and dates.

#### [NEW] [(dashboard)/ia/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/ia/page.tsx)
Meeting analyzer textarea with processing indicators, mock analyzer task extractor outputs, and bulk save dialog interfaces.

#### [NEW] [(dashboard)/photography/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/photography/page.tsx)
Photo bags status tracking interface (pending, photographed, cataloged, uploaded).

#### [NEW] [(dashboard)/partners/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/partners/page.tsx)
Partner consignment (comodato) metrics and sales lists.

#### [NEW] [(dashboard)/users/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/users/page.tsx)
Admin page managing team users, access permissions configurations, roles, and profile entries.

#### [NEW] [(settings)/settings/page.tsx](file:///home/vinicius/worktress/app/sales-flow/app/app/\(dashboard\)/settings/page.tsx)
Admin project configuration form.

---

## Verification Plan

### Automated Tests
- Build verification to ensure all TypeScript and page configurations compilation succeed:
  `npm run build`

### Manual Verification
1. Run local development environment: `npm run dev`.
2. Access local dev server `/login` and test authentication flow.
3. Validate sidebar permissions based on active credentials.
4. Verify tasks list loads from live Firestore and is reactive.
5. Check if all form wrapper items are fully integrated with react-hook-form.
6. Test tab transitions, filter combinations, sorting configs, and CSV downloads.
