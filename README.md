# TaxWise AI — Agentic AI W-2 Tax Return Automation Platform

> A full-stack, microservice-architected platform that automates federal W-2 tax return processing using AI-powered OCR, custom LLM training, knowledge graph visualisation, and a real-time testing dashboard.

[![CI](https://github.com/itkdaniel/taxwise-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/itkdaniel/taxwise-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **AI-Powered OCR** | Extracts W-2 data (wages, EIN, withheld amounts) from PDF uploads using Google Gemini via OpenRouter |
| **Manual Entry** | Fallback form-based W-2 entry with full validation |
| **Tax Calculation** | 2024 IRS progressive bracket calculation (single, MFJ, HoH) |
| **Knowledge Graph** | Interactive 3D (Three.js) and 2D force graph visualising taxpayer → employer → document relationships |
| **Custom LLM Training** | Train custom language models from scratch using PyTorch + HuggingFace Transformers on scraped data |
| **Web Scraper** | Async BFS crawler that collects training data from any website |
| **LLM Benchmarking** | Perplexity, accuracy, and throughput metrics for trained models |
| **Test Reports** | Color-coded test execution dashboard with per-case results and screenshots |
| **System Logs** | Live-streamed, color-coded infrastructure logs (error/warn/info/debug) |
| **RBAC Auth** | Replit OIDC authentication with role-based access (admin, tax_professional, client, viewer) |
| **Caching** | Redis-backed response cache with Python decorator API |
| **CI/CD** | GitHub Actions pipelines for lint, test, Docker build, and deploy |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (SPA)                      │
│           React 18 + Vite + Tailwind + shadcn/ui        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
          ┌──────────────▼──────────────┐
          │       Nginx (port 80)       │
          │  Static assets + API proxy  │
          └──────┬───────────┬──────────┘
                 │           │
    /api/*       │           │ /api/v1/*
                 │           │
   ┌─────────────▼─┐   ┌────▼──────────────┐
   │  Node.js API  │   │  Python FastAPI    │
   │  Express 4    │   │  SQLAlchemy + PEFT │
   │  Port 8080    │   │  Port 8000         │
   └──────┬────────┘   └──────┬────────────┘
          │                   │
          │   ┌───────────────▼────────┐
          │   │    LLM Microservice    │
          │   │  PyTorch + Transformers│
          │   │    Port 9000           │
          │   └────────────────────────┘
          │
   ┌──────▼──────────┐    ┌──────────────┐
   │  PostgreSQL 16  │    │   Redis 7    │
   │  (shared DB)    │    │   (cache)    │
   └─────────────────┘    └──────────────┘
```

See [docs/architecture.md](docs/architecture.md) for full Mermaid diagrams.

---

## 🚀 Quick Start

### Option 1 — Docker Compose (Recommended)

```bash
git clone https://github.com/itkdaniel/taxwise-ai.git
cd taxwise-ai

# Set secrets
export POSTGRES_PASSWORD=mysecret
export SESSION_SECRET=$(openssl rand -hex 32)
export OPENROUTER_API_KEY=your_key

# Build and start all 6 services
docker compose up --build

# Open in browser
open http://localhost
```

### Option 2 — Local Development (Node.js)

```bash
# Prerequisites: Node.js 24+, pnpm 9+, PostgreSQL 16
git clone https://github.com/itkdaniel/taxwise-ai.git
cd taxwise-ai

# Install all workspace dependencies
pnpm install

# Build generated API client
pnpm --filter @workspace/api-client-react run build

# Run database migrations + seed
pnpm --filter @workspace/db run migrate
pnpm --filter @workspace/scripts run seed

# Start services (in separate terminals)
pnpm --filter @workspace/api-server run dev    # API: port 8080
PORT=5173 pnpm --filter @workspace/taxwise-ai run dev  # UI: port 5173
```

### Option 3 — Local Development (Python API)

```bash
# Prerequisites: Python 3.11+
cd services/python-api
pip install -r requirements.txt
export APP_ENV=development
python cli.py serve --reload
```

### Option 4 — GitHub Binary Release

Download pre-built Docker images from GitHub Container Registry:

```bash
# Pull latest images
docker pull ghcr.io/itkdaniel/taxwise/api-server:main
docker pull ghcr.io/itkdaniel/taxwise/python-api:main
docker pull ghcr.io/itkdaniel/taxwise/frontend:main

# Run using published compose file
curl -O https://raw.githubusercontent.com/itkdaniel/taxwise-ai/main/docker-compose.yml
docker compose up -d
```

---

## 📁 Project Structure

```
taxwise-ai/
├── artifacts/
│   ├── api-server/          # Node.js Express API
│   └── taxwise-ai/          # React Vite SPA
├── lib/
│   ├── api-client-react/    # Auto-generated React Query hooks
│   ├── db/                  # Drizzle ORM + migrations
│   └── replit-auth-web/     # Replit OIDC auth
├── services/
│   ├── python-api/          # FastAPI + SQLAlchemy microservice
│   │   ├── app/
│   │   │   ├── api/         # Router factory (versioned)
│   │   │   ├── core/        # Config, DB, Cache decorators
│   │   │   ├── models/      # SQLAlchemy ORM models
│   │   │   ├── schemas/     # Pydantic with generic typing
│   │   │   └── services/    # Business logic + caching
│   │   ├── tests/           # pytest suite with mocked data
│   │   └── cli.py           # Typer CLI tool
│   └── llm-service/         # PyTorch LLM service
│       └── app/
│           ├── preprocessor.py  # Multi-format data cleaner
│           ├── trainer.py       # LoRA + full fine-tuning
│           └── benchmarker.py   # Perplexity + throughput eval
├── docs/                    # Architecture + deployment docs
├── .github/workflows/       # CI (lint+test) + CD (push+deploy)
├── docker-compose.yml       # Production compose
├── docker-compose.dev.yml   # Dev overrides (hot-reload)
└── scripts/                 # DB seed scripts
```

---

## 🤖 LLM Training Pipeline

The LLM microservice supports building language models completely from scratch:

```bash
# 1. Scrape training data from any website
python cli.py scrape https://irs.gov --max-pages 50 --output irs_docs.jsonl

# 2. Start a fine-tuning job (via CLI or API)
python cli.py train --model-id 1 --dataset ./irs_docs.jsonl --epochs 5

# 3. Benchmark the trained model
curl http://localhost:9000/benchmark \
  -d '{"model_id": 1, "checkpoint_path": "/checkpoints/1_1", "eval_texts": ["..."]}'

# 4. Generate text from the model
curl http://localhost:9000/generate \
  -d '{"checkpoint_path": "/checkpoints/1_1", "prompt": "W-2 box 1 wages are"}'
```

Supported base models: any HuggingFace Transformers model (GPT-2, LLaMA, Mistral, etc.).
LoRA adapters are used automatically when the `peft` library is installed for memory-efficient training.

---

## 🧪 Testing

```bash
# Node.js TypeScript checks
pnpm --filter @workspace/taxwise-ai run typecheck
pnpm --filter @workspace/api-server run typecheck

# Python tests with coverage
cd services/python-api
pytest tests/ -v --tb=short

# Specific test class
pytest tests/test_tax_returns.py::TestTaxReturnService::test_calculate_tax_single_filer -v
```

Test output includes:
- ✅ Service-layer unit tests with mocked DB sessions
- ✅ HTTP integration tests via FastAPI TestClient
- ✅ Tax bracket calculation regression tests (2024 IRS values)
- ✅ Data preprocessor quality filter tests
- ✅ API response shape validation

---

## 🔧 CLI Reference

```bash
python cli.py --help

Commands:
  serve    Start the FastAPI server
  db       Database management (migrate, seed)
  scrape   Scrape a website for LLM training data
  train    Trigger a fine-tuning job
  status   Show service configuration summary
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System design diagrams (Mermaid) |
| [docs/deployment.md](docs/deployment.md) | Docker, production, GPU setup |
| [docs/development.md](docs/development.md) | Local dev, adding endpoints, env vars |

---

## 🔑 Environment Variables

### Node.js API (`artifacts/api-server/`)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Express session secret |
| `PORT` | ✅ | HTTP listen port |
| `OPENROUTER_API_KEY` | — | For AI OCR + chat features |

### Python API (`services/python-api/.env.development`)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | SQLAlchemy connection string |
| `REDIS_URL` | — | Redis cache URL |
| `SECRET_KEY` | ✅ | JWT signing key |
| `OPENROUTER_API_KEY` | — | AI model API key |
| `LLM_SERVICE_URL` | — | LLM service address |

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [OpenRouter](https://openrouter.ai) — AI model routing (Google Gemini Flash 1.5)
- [HuggingFace Transformers](https://huggingface.co/docs/transformers) — LLM fine-tuning
- [react-force-graph](https://github.com/vasturiano/react-force-graph) — 3D/2D knowledge graph
- [Drizzle ORM](https://orm.drizzle.team) — Type-safe SQL for Node.js
- [shadcn/ui](https://ui.shadcn.com) — Accessible React component library
