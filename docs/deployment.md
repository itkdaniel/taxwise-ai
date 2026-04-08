# Deployment Guide

## Prerequisites

- Docker Engine 24+ and Docker Compose v2+
- Git
- A server with at least 4 GB RAM (8 GB recommended for LLM service)
- Optional: NVIDIA GPU + nvidia-docker2 for accelerated LLM training

---

## Quick Start (Local Docker)

```bash
# 1. Clone the repository
git clone https://github.com/itkdaniel/taxwise-ai.git
cd taxwise-ai

# 2. Copy and configure environment files
cp services/python-api/.env.development services/python-api/.env.development.local

# 3. Set required secrets in docker-compose.yml or .env
export POSTGRES_PASSWORD=my_secure_password
export SESSION_SECRET=$(openssl rand -hex 32)
export OPENROUTER_API_KEY=your_key_here

# 4. Build and start all services
docker compose up --build

# 5. Run database migrations
docker compose exec api-server pnpm --filter @workspace/db run migrate
docker compose exec python-api python cli.py db migrate

# 6. Seed with sample data (optional)
docker compose exec api-server pnpm --filter @workspace/scripts run seed

# 7. Open the app
open http://localhost
```

---

## Development Mode (Hot Reload)

```bash
# Mount source volumes for live code reloading
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

---

## Production Deployment

### Step 1 — Provision server

Recommended: Ubuntu 22.04 LTS with Docker pre-installed.

```bash
# Install Docker on Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### Step 2 — Clone and configure

```bash
git clone https://github.com/itkdaniel/taxwise-ai.git /opt/taxwise-ai
cd /opt/taxwise-ai
```

Create `/opt/taxwise-ai/.env.prod`:
```bash
POSTGRES_USER=taxwise
POSTGRES_PASSWORD=<long-random-password>
POSTGRES_DB=taxwise
SESSION_SECRET=<openssl rand -hex 32>
OPENROUTER_API_KEY=<your-key>
SECRET_KEY=<openssl rand -hex 32>
```

### Step 3 — Build and start

```bash
docker compose --env-file .env.prod up -d --build
```

### Step 4 — Set up Nginx reverse proxy + TLS

```nginx
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo certbot --nginx -d yourdomain.com
```

### Step 5 — Configure GitHub Actions CD

Add these repository secrets in GitHub Settings → Secrets:

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | Your server IP |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private SSH key |

Push to `main` to trigger automatic deployment.

---

## GPU-Accelerated LLM Training

Uncomment the GPU section in `docker-compose.yml`:

```yaml
llm-service:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

Install nvidia-container-toolkit:
```bash
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

---

## Health Checks

| Service | Endpoint |
|---------|----------|
| Node.js API | http://localhost:8080/api/healthz |
| Python API | http://localhost:8000/healthz |
| LLM Service | http://localhost:9000/healthz |
| Frontend | http://localhost/ |

---

## Scaling

Scale individual services independently:

```bash
# Scale Python API to 3 instances (load-balanced by Docker)
docker compose up -d --scale python-api=3
```

For production scale, deploy behind a load balancer (Traefik / Nginx upstream / AWS ALB).
