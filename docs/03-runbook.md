# Runbook

## Start the stack
From gcs-webapp/infra:

docker compose up -d --build

## Check containers
docker compose ps

## LAN hostname setup
Add to hosts file on each office machine (as Admin):
C:\Windows\System32\drivers\etc\hosts

192.168.1.123 gcs.local

## Verify UI
curl http://gcs.local/

## Verify API through proxy
curl http://gcs.local/api/health

## Verify API directly (debug)
curl http://127.0.0.1:8000/health

## Verify API inside container (authoritative)
docker compose exec api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
