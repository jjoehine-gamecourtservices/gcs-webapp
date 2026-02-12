# Architecture

## High-Level
- Backend: FastAPI (Python)
- Frontend (Phase 2): static HTML served by nginx
- Reverse Proxy: Caddy
- Containerization: Docker + Docker Compose
- Host OS: Windows (Docker Desktop with WSL2 backend)
- Network: Office LAN
- LAN hostname: gcs.local (via hosts file entry)

## Routing
- http://gcs.local/ -> web (nginx)
- http://gcs.local/api/* -> api (FastAPI)
  - Caddy strips /api prefix before proxying to FastAPI

## Current Services
### API (FastAPI)
- Container: gcs_api
- Internal: api:8000 (Docker network)
- Host port: 8000 (direct debug access)
- Health: /health (or via proxy at /api/health)

### Web (nginx)
- Container: gcs_web
- Internal: web:80
- Serves: frontend/public/index.html

### Reverse Proxy (Caddy)
- Container: gcs_caddy
- Listens on: :80
- Proxies:
  - /api/* -> api:8000
  - everything else -> web:80

## File Structure
gcs-webapp/
- backend/
  - app/main.py
  - Dockerfile
  - requirements.txt
- frontend/
  - public/index.html
  - nginx.conf
- infra/
  - docker-compose.yml
  - caddy/Caddyfile
- docs/
  - 00-overview.md
  - 01-architecture.md
  - 03-runbook.md
