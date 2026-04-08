# Development Guide

## Project Structure

```
taxwise-ai/
├── artifacts/
│   ├── api-server/          # Node.js Express API (TypeScript)
│   │   ├── src/routes/      # Route handlers per domain
│   │   ├── Dockerfile
│   │   └── package.json
│   └── taxwise-ai/          # React Vite SPA
│       ├── src/pages/       # One file per page
│       ├── src/components/  # Shared UI components
│       ├── Dockerfile
│       └── nginx.conf
├── lib/
│   ├── api-client-react/    # Auto-generated React Query hooks (Orval)
│   ├── db/                  # Drizzle ORM schema + migrations
│   └── replit-auth-web/     # Replit OIDC auth hook
├── services/
│   ├── python-api/          # FastAPI microservice
│   │   ├── app/
│   │   │   ├── api/         # Route factory + versioned routers
│   │   │   ├── core/        # Config, DB, Cache
│   │   │   ├── models/      # SQLAlchemy ORM models
│   │   │   ├── schemas/     # Pydantic schemas
│   │   │   └── services/    # Business logic
│   │   ├── tests/           # pytest test suite
│   │   ├── cli.py           # Typer CLI
│   │   ├── main.py          # FastAPI entry point
│   │   └── Dockerfile
│   └── llm-service/         # PyTorch LLM service
│       ├── app/
│       │   ├── preprocessor.py
│       │   ├── trainer.py
│       │   └── benchmarker.py
│       ├── main.py
│       └── Dockerfile
├── scripts/                 # Database seed scripts
├── docs/                    # This documentation
├── .github/workflows/       # CI/CD GitHub Actions
├── docker-compose.yml       # Production compose
└── docker-compose.dev.yml   # Development overrides
```

---

## Local Development (No Docker)

### Prerequisites

- Node.js 24+, pnpm 9+
- Python 3.11+, pip
- PostgreSQL 16 running locally
- (Optional) Redis

### Node.js services

```bash
# Install all workspace dependencies
pnpm install

# Build the generated API client library
pnpm --filter @workspace/api-client-react run build

# Run database migrations
pnpm --filter @workspace/db run migrate

# Seed the database
pnpm --filter @workspace/scripts run seed

# Start all Node.js services (uses Replit workflows)
pnpm --filter @workspace/api-server run dev     # Port 8080
pnpm --filter @workspace/taxwise-ai run dev     # Port auto (PORT env var)
```

### Python services

```bash
cd services/python-api

# Install dependencies
pip install -r requirements.txt

# Set environment
export APP_ENV=development

# Run migrations (Alembic)
python cli.py db migrate

# Start FastAPI
python cli.py serve --reload

# Or directly:
uvicorn main:app --reload --port 8000
```

---

## Adding a New API Endpoint

### Node.js (Express)

1. Add route file: `artifacts/api-server/src/routes/myDomain/index.ts`
2. Register in `artifacts/api-server/src/routes/index.ts`
3. Add OpenAPI spec to `lib/api-client-react/openapi.yaml`
4. Regenerate client: `pnpm --filter @workspace/api-client-react run codegen`
5. Rebuild library: `pnpm --filter @workspace/api-client-react run build`

### Python (FastAPI)

1. Add Pydantic schema to `services/python-api/app/schemas/`
2. Add SQLAlchemy model to `services/python-api/app/models/`
3. Add service to `services/python-api/app/services/`
4. Add router to `services/python-api/app/api/v1/`
5. Register in `services/python-api/app/api/factory.py`
6. Write tests in `services/python-api/tests/`

---

## Running Tests

### Node.js

```bash
pnpm test                              # all tests
pnpm --filter @workspace/taxwise-ai run typecheck
```

### Python

```bash
cd services/python-api
pytest tests/ -v                       # all tests
pytest tests/ -v --html=report.html   # with HTML report (requires pytest-html)
pytest tests/test_tax_returns.py -k "test_calculate"  # specific test
```

---

## Environment Variables Reference

### Node.js API Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | — | Express session signing key |
| `PORT` | ✅ | — | HTTP listen port |
| `NODE_ENV` | — | development | Runtime environment |
| `OPENROUTER_API_KEY` | — | — | OpenRouter AI key (Gemini/etc) |

### Python FastAPI

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_ENV` | — | development | Selects .env.{APP_ENV} file |
| `DATABASE_URL` | ✅ | — | SQLAlchemy connection string |
| `REDIS_URL` | — | redis://localhost:6379/0 | Cache (optional) |
| `SECRET_KEY` | ✅ | — | JWT signing key |
| `OPENROUTER_API_KEY` | — | — | AI model API key |
| `LLM_SERVICE_URL` | — | http://llm-service:9000 | LLM service address |

---

## Code Style

### TypeScript
- Strict mode enabled (`"strict": true` in tsconfig.base.json)
- ESLint + Prettier (run `pnpm lint`)
- Prefer named exports over default exports for utilities

### Python
- Ruff for linting (`ruff check .`)
- MyPy for type checking (`mypy app --ignore-missing-imports`)
- Google-style docstrings
- Type hints required on all public functions
- Decorators for cross-cutting concerns (caching, logging)
- Generic typing with `TypeVar` for reusable abstractions
