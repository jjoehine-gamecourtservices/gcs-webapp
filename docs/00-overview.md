# GCS Web Application — Overview

## Purpose
This project is a web-based recreation of the existing GCS desktop application.
The desktop application remains the source of truth until this web application
is fully functional and verified.

## Current Phase
Phase 2: Base web + API routing behind a single LAN hostname.

Goals of Phase 2:
- Web UI served at http://gcs.local/
- API served at http://gcs.local/api/*
- Both reachable from other computers on the office LAN

Out of scope for Phase 2:
- Authentication
- Database
- Business logic
- External integrations (ComputerEase, Monday, etc.)
- Mobile app

## Guiding Principles
- One step at a time with hard verification checkpoints
- No mixing of legacy infrastructure
- No feature work before infrastructure is proven
- Documentation is the source of truth
