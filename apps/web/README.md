# Web app

React + TypeScript + Vite + Tailwind v4. Shared by the team: each person wires the screens for their part.

```bash
pnpm dev:web      # http://localhost:5173  (proxies /api to the worker on :8787)
pnpm dev:worker   # in a second terminal, for Ask / search
```

| Screen | File | Owner |
| --- | --- | --- |
| Home (gravity panels, coverage counters) | `src/pages/Home.tsx` | Navneet |
| Research Atlas (ranking, reason codes) | `src/pages/Atlas.tsx` | Navneet |
| Investigation page (runs, receipts) | `src/pages/Investigation.tsx` | Navneet |
| Ask the archive (six-beat answer) | `src/pages/Ask.tsx` | Anish |
| Mission Lab (evidence coverage) | `src/pages/MissionLab.tsx` | Juvana |
| Referee | `src/pages/Referee.tsx` | Juvana |
| Missing Experiment | `src/pages/MissingExperiment.tsx` | Juvana |
| Limits | `src/pages/Limits.tsx` | anyone |

- Data comes from `src/lib/data.ts` (fixtures now; switch to the real release there only).
- Every value goes through `ValueCell` (evidence badge + source receipt; missing = "not documented", never 0).
- Lights are always labeled "Evidence coverage, not a safety rating."
