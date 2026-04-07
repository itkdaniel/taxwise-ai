# TaxWise AI - W-2 Tax Return Automation Platform

## Overview

Full-stack agentic AI tax automation platform. pnpm monorepo with TypeScript throughout.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (CJS bundle for API), Vite (frontend)
- **Auth**: Replit Auth (OIDC + PKCE) via `@workspace/replit-auth-web`
- **AI**: OpenRouter (Google Gemini priority) via `@workspace/integrations-openrouter-ai`
- **Storage**: GCS Object Storage via `@workspace/object-storage-web`
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + wouter + framer-motion

## Artifacts

- **`artifacts/api-server`** — Express API on port 8080, path `/api`
- **`artifacts/taxwise-ai`** — React Vite frontend on port 22332, path `/`

## Key Packages

- `lib/api-spec` — OpenAPI spec source of truth
- `lib/api-client-react` — Orval-generated React Query hooks
- `lib/api-zod` — Orval-generated Zod schemas
- `lib/db` — Drizzle ORM schema + database client
- `lib/replit-auth-web` — `useAuth()` hook for frontend
- `lib/integrations-openrouter-ai` — OpenRouter client
- `lib/object-storage-web` — GCS object storage client

## Database Tables

- `users`, `sessions` — auth
- `tax_returns` — tax returns per user
- `w2_documents` — W-2 docs linked to tax returns
- `training_datasets`, `training_jobs` — AI agent training
- `graph_entities`, `graph_connections` — knowledge graph
- `test_reports`, `test_cases` — test reports
- `log_entries` — application logs
- `conversations`, `messages` — OpenRouter chat

## API Routes (all under `/api`)

- `GET /healthz` — health check
- `GET|POST /login|/callback|/logout|/auth/user` — Replit Auth flow
- `POST /mobile-auth/token-exchange|/logout` — mobile auth
- `POST /storage/uploads/request-url` — presigned upload URL
- `GET /storage/public-objects/*|/storage/objects/*` — serve files
- `GET|POST /tax-returns` — list/create tax returns
- `GET /tax-returns/summary` — aggregate stats
- `GET|PUT|DELETE /tax-returns/:id` — CRUD
- `POST /tax-returns/:id/calculate` — run tax calculation
- `POST /tax-returns/:id/validate` — validate return
- `GET|POST /w2-documents` — list/create W-2 docs
- `GET|PUT|DELETE /w2-documents/:id` — CRUD
- `POST /w2-documents/:id/extract` — AI OCR extraction
- `GET /ai-agent/models` — list available AI models
- `GET|PUT /ai-agent/config` — agent configuration
- `GET|POST /ai-agent/datasets` — training datasets
- `POST /ai-agent/datasets/:id/scrape` — web scraping
- `POST /ai-agent/train` — start training job
- `GET /ai-agent/training-jobs` — list jobs
- `GET|POST /knowledge-graph/entities` — entities
- `GET|PUT|DELETE /knowledge-graph/entities/:id`
- `GET|POST /knowledge-graph/connections`
- `GET /knowledge-graph/graph` — full graph data
- `GET|POST /test-reports` — test reports
- `GET /test-reports/stats` — aggregate stats
- `POST /test-reports/run` — run tests
- `GET|PUT /test-reports/:id`
- `POST /test-reports/:id/export`
- `GET /logs` — application logs
- `GET|PUT /users/me` — user profile
- `PUT /users/me/settings` — user settings
- `GET|POST /openrouter/conversations`
- `GET|DELETE /openrouter/conversations/:id`
- `GET|POST /openrouter/conversations/:id/messages`

## Frontend Pages

- `/` — Dashboard with stats and quick actions
- `/tax-returns` — Tax returns list with status badges
- `/tax-returns/:id` — Tax return detail + W-2 list
- `/w2-upload` — Drag-drop upload + manual entry tabs
- `/ai-agent` — AI model selector, config, training jobs
- `/knowledge-graph` — 3D force graph (Three.js), 2D view tabs
- `/test-reports` — Color-coded test report table
- `/test-reports/:id` — Test case detail
- `/logs` — Color-coded live log viewer
- `/settings` — User profile, role, security settings
- `/login` — Replit Auth login gate

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
