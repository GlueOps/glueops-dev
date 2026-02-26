---
id: introduction
title: GlueOps Platform Overview
type: explainer
---


GlueOps provides a GitOps-driven platform for deploying applications across production and non-production environments. Push to Git, and the platform handles the rest — builds, deployments, preview environments, secrets, and observability.

## How It Works

**Control Plane** — ArgoCD monitors your Git repositories and automatically syncs application deployments to your cluster. Changes are applied within minutes of a push.

**Deployment Configurations Repository** — A central Git repository where you define your applications, environments, and routing. Each app has a folder with base values and per-environment overrides. The platform also generates ephemeral preview environments for pull requests.

**Application Repositories** — Your application code and Dockerfile/Containerfile. Each repository produces a container image that the platform deploys.

**Secrets** — GlueOps provides a secrets management solution for securely storing sensitive values like API keys and database credentials, accessible only to authorized applications.

**Observability** — Centralized logs, metrics dashboards, and configurable alerts are provisioned automatically for every deployed application.

**Routing** — Traefik handles ingress routing, TLS termination, and middleware (rate limiting, IP allowlists, sticky sessions, etc.). Your [captain domain](glueops-captain-domain) serves as the default base for all service URLs.
