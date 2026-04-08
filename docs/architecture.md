# TaxWise AI — System Architecture

## Overview

TaxWise AI is a microservice-based AI platform that automates W-2 federal tax return processing.
It is composed of four independently deployable services communicating over HTTP within a shared Docker network.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client"
        U[Browser]
    end

    subgraph "Frontend (Nginx / Vite)"
        FE[React + Vite SPA\nTailwind + shadcn/ui\nPort 80]
    end

    subgraph "API Layer"
        NA[Node.js API Server\nExpress + Drizzle ORM\nPort 8080]
        PA[Python FastAPI\nSQLAlchemy + Redis\nPort 8000]
    end

    subgraph "AI Layer"
        LLM[LLM Microservice\nPyTorch + HuggingFace\nPort 9000]
        OR[OpenRouter AI\nGemini Flash 1.5\nExternal]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL 16\nShared DB)]
        RD[(Redis 7\nCache)]
        OB[(Object Storage\nW-2 PDFs)]
    end

    U -->|HTTPS| FE
    FE -->|/api/*| NA
    FE -->|/api/v1/*| PA
    NA -->|SQL| PG
    NA -->|OpenRouter API| OR
    PA -->|SQL| PG
    PA -->|Cache| RD
    PA -->|Train/Benchmark| LLM
    LLM -->|PyTorch weights| OB
```

---

## Service Map

| Service | Stack | Port | Responsibility |
|---------|-------|------|---------------|
| **frontend** | React 18, Vite, Tailwind, shadcn/ui | 80 | Dashboard SPA, all user-facing pages |
| **api-server** | Node.js 24, Express, Drizzle ORM | 8080 | Auth, CRUD, tax bracket calculation, OCR |
| **python-api** | Python 3.11, FastAPI, SQLAlchemy | 8000 | LLM management, scraping, advanced analytics |
| **llm-service** | PyTorch, HuggingFace Transformers | 9000 | Model training, fine-tuning, benchmarking |
| **postgres** | PostgreSQL 16 | 5432 | Persistent storage (shared) |
| **redis** | Redis 7 | 6379 | Python API response cache |

---

## Data Flow — W-2 Processing

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant NA as Node API
    participant OS as Object Storage
    participant OR as OpenRouter AI

    U->>FE: Upload W-2 PDF
    FE->>NA: POST /api/storage/uploads/request-url
    NA->>OS: Generate presigned PUT URL
    OS-->>NA: Upload URL
    NA-->>FE: Upload URL
    FE->>OS: PUT PDF file (direct upload)
    FE->>NA: POST /api/w2-documents {objectPath}
    NA->>OR: Extract W-2 data via Gemini OCR prompt
    OR-->>NA: Extracted JSON {wages, withheld, ein, ...}
    NA->>NA: Store extracted data in DB
    NA-->>FE: W2Document {status: "extracted"}
    FE->>NA: POST /api/tax-returns/:id/calculate
    NA->>NA: Apply 2024 IRS bracket calculation
    NA-->>FE: TaxCalculationResult {refund, owed, ...}
```

---

## Knowledge Graph

```mermaid
graph LR
    TP[Taxpayer] -->|employs| EM[Employer]
    EM -->|issued| W2[W-2 Document]
    W2 -->|belongs_to| TR[Tax Return]
    TR -->|governed_by| LW[Tax Law]
    TR -->|calculated_by| AI[AI Agent]
    AI -->|trained_on| DS[Dataset]
    DS -->|scraped_from| WEB[Web Source]
```

Nodes are coloured by type and visualised in an interactive 3D force graph (Three.js / react-force-graph-3d).

---

## Authentication & RBAC

```mermaid
flowchart TD
    A[User visits app] --> B{Authenticated?}
    B -- No --> C[Redirect to /api/login]
    C --> D[Replit OIDC / PKCE flow]
    D --> E[Exchange code for session cookie]
    E --> F[Fetch user profile + role]
    B -- Yes --> F
    F --> G{Role?}
    G -- admin --> H[Full access]
    G -- tax_professional --> I[Returns + W2 + AI Agent]
    G -- client --> J[Own returns only]
    G -- viewer --> K[Read-only]
```

---

## Python FastAPI — Factory Pattern

```mermaid
classDiagram
    class Settings {
        +app_env: str
        +database_url: str
        +redis_url: str
        +get_settings() Settings
    }

    class TaxReturnService {
        <<interface>>
        +list_returns(db, user_id)
        +get_by_id(db, id)
        +create(db, payload)
        +calculate(db, id)
        +summary(db)
    }

    class FullFineTuneTrainer {
        +train(dataset_source, epochs, ...)
        +_load_model_and_tokenizer()
        +_build_dataset(tokenizer, ...)
    }

    class LoRATrainer {
        +_load_model_and_tokenizer()
    }

    LoRATrainer --|> FullFineTuneTrainer
    TaxReturnService ..> Settings
    FullFineTuneTrainer ..> Settings
```

---

## Caching Strategy

| Layer | Tool | TTL | Invalidated On |
|-------|------|-----|----------------|
| Tax return list | Redis | 120s | Create / Delete |
| Dashboard summary | Redis | 300s | Create / Delete |
| Knowledge graph | Redis | 600s | Entity update |
| API responses | Redis | 300s | Mutation |

Cache is implemented via the `@cached(prefix, ttl)` Python decorator in `app/core/cache.py`.
It falls back silently to no-cache when Redis is unavailable (local dev without Docker).
