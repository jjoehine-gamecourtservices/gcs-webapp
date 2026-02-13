Runbook

Environment: Production (image-only, version enforced)
Entrypoint: infra\prod-up.bat
Rule: Never run raw docker compose in prod.

1️⃣ Bring Up Production Stack

From gcs-webapp\infra:

prod-up.bat


Uses version from:

infra\.env.prod


Or explicitly:

prod-up.bat 0.1.2


This will:

Enforce GCS_VERSION

Verify required images exist locally

Validate merged compose config

Start stack (no build, no pull)

Verify restart policy (unless-stopped)

2️⃣ Restart a Single Service (Deterministic)

Example: restart reverse proxy only

prod-up.bat restart caddy


Other examples:

prod-up.bat restart api
prod-up.bat restart web

3️⃣ Check Stack Status
prod-up.bat ps

4️⃣ View Logs
prod-up.bat logs caddy
prod-up.bat logs api
prod-up.bat logs web


Add -f to follow:

prod-up.bat logs -f api

5️⃣ Validate Config (Strict Gate)
prod-up.bat config


Fails immediately if:

GCS_VERSION missing

compose files invalid

image tags malformed

6️⃣ LAN Hostname Setup (Office Machines)

Edit (as Administrator):

C:\Windows\System32\drivers\etc\hosts


Add:

192.168.1.123 gcs.local

7️⃣ Health Checks
Proxy Health (Caddy)
curl http://gcs.local/health


Expected:

ok

API Through Proxy
curl http://gcs.local/api/health

API Direct (Debug Only)
curl http://127.0.0.1:8000/health

API Inside Container (Authoritative)
prod-up.bat exec api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"

8️⃣ Reboot Recovery Test

Reboot host machine.

Wait for Docker Desktop to start.

Run:

prod-up.bat ps


Expected:

All services running

Restart policy = unless-stopped

🚫 What NOT To Do In Production

Do NOT run:

docker compose up --build
docker compose restart
docker compose down


Raw compose bypasses version enforcement and deterministic env injection.

Always use:

prod-up.bat <command>

Architecture Summary

Backend: FastAPI (uvicorn)

Frontend: Vite + React

Reverse Proxy: Caddy

Image-only deployment

Version locked via:

image: gcs/api:${GCS_VERSION?...}
image: gcs/web:${GCS_VERSION?...}