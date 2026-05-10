# LLM Guide — Deploying Applications to the GlueOps Platform

You are an LLM helping a user deploy an application onto the **GlueOps** platform. This document is a self-contained reference. Read it in full before generating any files for the user.

It is **agent-agnostic** — nothing here assumes Claude Code, Cursor, Continue, an OpenAI Assistant, or any specific harness. Anything that can read markdown and produce code can use it.

---

## 1. Mental Model

GlueOps is a **GitOps-driven Kubernetes platform**. The user does **not** run `kubectl`. They push YAML to Git and ArgoCD reconciles it onto the cluster.

Two repositories are involved in any deployment:

| Repo | Purpose | Who edits it |
|---|---|---|
| **`<org>/deployment-configurations`** | Helm values per app per environment. ArgoCD watches this. | Anyone deploying an app |
| **App source repo** (e.g. `<org>/my-app`) | Application code + `Dockerfile`. Builds a container image. | Application developers |

**Deployment flow:** App repo CI builds an image and pushes it to a registry → developer updates the image tag in `deployment-configurations` → ArgoCD detects the commit → cluster syncs (~3 min) → DNS propagates (~2 min more for new hostnames).

**Key implication:** when a user asks "how do I deploy X to GlueOps?", the answer is almost always *"create or edit YAML files in the deployment-configurations repo"*. You do not generate raw Kubernetes manifests — you generate Helm values for the platform's chart.

---

## 2. The `deployment-configurations` Repo Layout

```
deployment-configurations/
├── apps/
│   └── <app-name>/
│       ├── base/
│       │   └── base-values.yaml          # shared across all envs of this app
│       └── envs/
│           ├── prod/values.yaml          # per-env overrides
│           ├── stage/values.yaml
│           ├── uat/values.yaml
│           └── previews/                 # ephemeral PR environments
│               ├── common/values.yaml
│               └── pull-request-number/<N>/values.yaml
├── common/
│   └── common-values.yaml                # shared across ALL apps
└── env-overlays/
    ├── nonprod/env-values.yaml           # shared across all nonprod envs
    └── prod/env-values.yaml              # shared across prod
```

### Naming rules

- **`<app-name>`** is the directory under `apps/`. By convention it matches the app's source-repo name.
- **Environment names** under `envs/` are arbitrary (`prod`, `stage`, `uat`, `qa`, …). The directory name becomes the env suffix.
- **`previews/`** auto-generates ephemeral environments per open pull request.

### The cardinal naming convention

ArgoCD names each application as **`<app-folder>-<env-folder>`**. The Helm chart uses this as the **Service name**. So an app at `apps/my-app/envs/prod/` produces a Service called **`my-app-prod`**.

This is why hostnames look like `my-app-prod.apps.<captain-domain>` — the `-prod` suffix is structural, not cosmetic. Don't strip it.

---

## 3. The `base/base-values.yaml` File

Defines the container image and other config shared across every environment of this app.

```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

Put things that rarely vary by env (registry, repository, port) in `base-values.yaml`. Put things that *do* vary (image tag, replicas, env vars, hostnames) in `envs/<env>/values.yaml`.

---

## 4. The `envs/<env>/values.yaml` File

Per-environment values. Most fields are toggled by an `enabled: true` flag — the chart ships with everything off so you opt in.

A complete example showing the common building blocks:

```yaml
deployment:
  enabled: true
  replicas: 2
  envVariables:
    - name: GREETING_MESSAGE
      value: "Hello, World!"

service:
  enabled: true

ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'

externalSecret:
  enabled: true
  secrets:
    my-app:
      dataFrom:
        key: secret/my-app
```

### Building blocks

| Block | Purpose | When to enable |
|---|---|---|
| `deployment` | The Pods (replicas, env vars, image overrides) | Always, for any running app |
| `service` | ClusterIP Service in front of the Pods | Always, if anything routes to the app |
| `ingress` | Standard Kubernetes Ingress (simple HTTP routing) | Most web apps |
| `externalSecret` | Pulls values from the secret store into env vars | When secrets are needed |
| `customResources` (list) | Arbitrary YAML — IngressRoute, Middleware, TLSOption, etc. | Advanced Traefik features |
| `customResourcesMap` (map) | Same, but deep-merged across files | When sharing/overriding resources across base + env files |

---

## 5. Helm Template Expressions (use these, don't hardcode)

Inside any code-fenced YAML you write for a values file, the following are resolved at deploy time. Use them rather than hardcoding.

| Expression | Resolves to | Example output |
|---|---|---|
| `{{ .Values.captain_domain }}` | The cluster's base domain | `my-cluster.my-tenant.onglueops.com` |
| `{{ include "app.name" . }}` | The ArgoCD app name | `my-app-prod` |
| `{{ include "app.namespace" . }}` | The target namespace | `nonprod` |

**Never** hardcode the captain domain or the app name in YAML — the platform fills them in.

---

## 6. Routing — Two Approaches

### A. Standard Kubernetes Ingress (preferred for simple cases)

Use the `ingress:` block. Produces a `networking.k8s.io/v1` Ingress with `ingressClassName: public-traefik`. external-dns auto-discovers the hostname from the spec.

```yaml
ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'
          paths:                       # optional — omit for catch-all
            - path: /api
              pathType: Prefix
        - hostname: 'my-app-alt.apps.{{ .Values.captain_domain }}'
```

You can attach Traefik middleware (defined via `customResources`) to a standard Ingress through annotations:

```yaml
ingress:
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: nonprod-my-mw@kubernetescrd
```

**Critical caveat:** `Ingress` annotations are **not** processed by Helm's `tpl` function. The namespace prefix (`nonprod-` above) must be **hardcoded** to your actual namespace. IngressRoute CRDs do not have this limitation.

### B. Traefik IngressRoute CRD (for advanced features)

When you need middleware chains, priority routing, canary, sticky sessions via CRD, or TLSOption, use IngressRoute via `customResources` or `customResourcesMap`:

```yaml
customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

**Required IngressRoute annotations:**

| Annotation | Why |
|---|---|
| `kubernetes.io/ingress.class: public-traefik` | Tells Traefik to handle this route |
| `external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}` | Tells external-dns to create the DNS record |

Standard Ingress doesn't need either — `ingressClassName` handles the first and external-dns auto-discovers the hostname for the second.

### Available Traefik CRDs

| CRD | Purpose |
|---|---|
| `IngressRoute` | HTTP/HTTPS routing |
| `IngressRouteTCP` | TCP routing (e.g. Postgres) |
| `Middleware` | Headers, auth, rate limit, redirects, IP allowlists |
| `TLSOption` | TLS version / cipher config |
| `TraefikService` | Weighted services, mirroring (canary) |
| `ServersTransport` | Backend connection options |

### EntryPoints

| Name | Port | Protocol |
|---|---|---|
| `web` | 80 | HTTP |
| `websecure` | 443 | HTTPS |

Most IngressRoutes should list both.

---

## 7. `customResources` (list) vs `customResourcesMap` (map)

Both render arbitrary YAML. Choose based on whether you need cross-file merging.

| | `customResources` (list) | `customResourcesMap` (map) |
|---|---|---|
| Shape | YAML list of `\| ` block strings | YAML map keyed by arbitrary names |
| Merging across `base` + `envs/<env>/` files | **List is fully replaced** — env wins, base lost | **Deep-merged** by key |
| When to use | All resources in one file | Resources split across base + env, or overrides per env |

**Trap:** if you put a list `customResources` in both `base-values.yaml` and `envs/prod/values.yaml`, the base list is silently discarded. Use `customResourcesMap` whenever resources are split across files.

---

## 8. Secrets — `externalSecret` + OpenBao

GlueOps ships with OpenBao as the secret store. Secrets live at paths like `secret/<app-name>` and are pulled into Kubernetes via `ExternalSecret`.

### Step 1 — write secrets to the store

The user logs into the secret store (linked from their cluster info page at `https://cluster-info.<captain-domain>`), uses role **editor**, picks the `secret/` mount, and creates a secret at path `secret/<app-name>` with whatever keys they need (e.g. `SECRET_MESSAGE`, `DATABASE_URL`).

### Step 2 — add `externalSecret` to values.yaml

```yaml
externalSecret:
  enabled: true
  secrets:
    my-app:                         # ExternalSecret resource name
      dataFrom:
        key: secret/my-app          # vault path — pulls ALL keys at once
```

`dataFrom.key` slurps every key under that path and injects each as an env var on the Pod. Static (non-secret) env vars stay in `deployment.envVariables`.

---

## 9. Service Reference Pattern (in IngressRoutes)

Always reference the app's service using the templated name and namespace, never hardcoded:

```yaml
services:
  - name: '{{ include "app.name" . }}'              # → my-app-prod
    namespace: '{{ include "app.namespace" . }}'    # → nonprod
    port: 80                                         # matches image.port from base-values.yaml
```

The single quotes are required because the value starts with `{`.

---

## 10. Middleware Reference Format (Standard Ingress only)

When attaching a Traefik `Middleware` CRD to a **standard Ingress** via the `traefik.ingress.kubernetes.io/router.middlewares` annotation, the format is:

```
<namespace>-<middleware-name>@kubernetescrd
```

Example: `nonprod-my-headers-mw@kubernetescrd`.

Annotations are not Helm-templated, so the namespace must be **literal**. Most GlueOps deployments land in the `nonprod` namespace; verify with the user if unsure. IngressRoute CRDs reference middleware as a plain `name:` field with no namespace prefix.

---

## 11. Verification — No `kubectl` Available

Platform users **do not have kubectl access**. Verification is via:

1. **`curl`** against the public hostname:
   ```bash
   curl https://my-app-prod.apps.<captain-domain>
   curl -I https://my-app-prod.apps.<captain-domain>          # for header inspection
   curl https://my-app-prod.apps.<captain-domain>/?env=true   # whoami env dump
   ```
2. **ArgoCD dashboard** (linked from the cluster info page) — for resource status, sync state, ExternalSecret status, certificate readiness.

When suggesting verification, prefer `curl` for routing/headers, and point at the ArgoCD UI for *resource state* (cert issuance, ExternalSecret sync, IngressRoute admittance).

---

## 12. Timing Expectations

| Event | Approx duration |
|---|---|
| Git push → ArgoCD sync | ~3 minutes |
| New hostname → DNS resolvable | ~2 additional minutes after sync |
| Let's Encrypt cert issuance | ~1–2 minutes after Ingress/IngressRoute is admitted |
| ExternalSecret refresh after vault write | seconds |

---

## 13. Common Patterns — Quick Recipes

### Sticky sessions (Standard Ingress)
Add Service annotations:
```yaml
service:
  enabled: true
  annotations:
    traefik.ingress.kubernetes.io/service.sticky.cookie: "true"
    traefik.ingress.kubernetes.io/service.sticky.cookie.name: "my-sticky-cookie"
    traefik.ingress.kubernetes.io/service.sticky.cookie.maxage: "3600"
```

### Force HTTPS (redirect HTTP → HTTPS)
Define a `redirectScheme` Middleware in `customResources`, then attach it to the Ingress via the `router.middlewares` annotation. Restrict entrypoints to `web,websecure`.

### Multiple hostnames for one app
Add multiple entries to `ingress.entries[].hosts[]`. Each becomes its own DNS record.

### Path-based routing
Add `paths:` under a host. **Specifying paths drops the catch-all** — add `path: /` if you want everything else routed too.

### Custom domains (not under `apps.<captain-domain>`)
Use any hostname you control in `hosts[].hostname`. Point the DNS record (CNAME/ALIAS) to the platform's public load balancer — the platform admin can provide the target.

### Let's Encrypt TLS
On a **standard Ingress**, add the annotation `cert-manager.io/cluster-issuer: letsencrypt`. On an **IngressRoute**, follow the dedicated guide pattern (cert-manager Certificate resource referencing the host).

### TCP services (Postgres, Redis, etc.)
Use `IngressRouteTCP` via `customResources`.

---

## 14. Gotchas Cheat Sheet

| Gotcha | Fix |
|---|---|
| Hardcoded a captain domain in YAML | Replace with `{{ .Values.captain_domain }}` |
| Used hostname without templated app name | Use `{{ include "app.name" . }}` so env suffix is correct |
| `customResources` (list) defined in both base and env file | Switch to `customResourcesMap` (map) — lists don't merge |
| Standard Ingress middleware not applying | Verify the `<namespace>-` prefix is literal (not Helm-templated) |
| New hostname returns 404 | Wait ~2 min for external-dns; check ArgoCD sync status |
| `path: /api` defined but `/` returns 404 | Explicit paths drop the catch-all; add `path: /` if needed |
| Env var from secret doesn't appear | Confirm vault path matches `dataFrom.key`; check ExternalSecret status in ArgoCD |
| IngressRoute admitted but no DNS record | Missing `external-dns.alpha.kubernetes.io/target` annotation |
| Service name "doesn't exist" in IngressRoute | Use `{{ include "app.name" . }}` — service name is `<app>-<env>`, not `<app>` |
| TLS cert pending forever | Check that DNS resolves first; HTTP-01 challenge needs the hostname reachable |

---

## 15. What to Ask the User Before Generating Files

If the user asks "help me deploy my app", these are the minimum questions to disambiguate:

1. **App name** — what's the directory under `apps/`? (Usually their repo name.)
2. **Environments** — which envs? (`prod`, `stage`, `uat`, …)
3. **Container image** — registry + repository + initial tag, and the **port** the app listens on.
4. **Replicas** per env.
5. **Hostname** — default `apps.<captain-domain>` subdomain, or a custom domain?
6. **Routing complexity** — basic hostname only? Path routing? Middleware (auth, headers, rate limit)? Sticky sessions? TCP?
7. **Env vars** — any static ones? Any from secrets? Where are the secrets stored (default: `secret/<app-name>` in OpenBao)?
8. **TLS** — Let's Encrypt (default for `apps.<captain-domain>` hostnames is automatic) or BYO cert?

For most apps, the answer is: standard Ingress, `apps.<captain-domain>` hostname, one or two replicas, image from their registry. Reach for IngressRoute CRDs only when a Standard Ingress can't express what they need.

---

## 16. Output Checklist

When generating files for a user, deliver:

1. The **directory structure** they should create (a tree diagram).
2. The contents of `apps/<app-name>/base/base-values.yaml`.
3. The contents of `apps/<app-name>/envs/<env>/values.yaml` for each env they want.
4. The exact **hostname(s)** their app will be reachable at after deploy (using their captain domain).
5. **Verification commands** — `curl` against the hostname, plus a pointer to the ArgoCD dashboard for resource state.
6. Any **out-of-band steps** (e.g. "add `SECRET_MESSAGE` to vault path `secret/my-app` before pushing").

Do not generate raw Kubernetes manifests, kubectl commands, or anything that bypasses the GitOps flow. Everything goes through values files in the `deployment-configurations` repo.

---

## 17. Further Reading

The canonical, browseable docs live at **https://docs.glueops.dev**. Source: https://github.com/GlueOps/glueops-dev/tree/main/docs.

Particularly useful pages:
- Deploy Your First App — end-to-end hello-world walkthrough
- Manage Environment Secrets — ExternalSecret + OpenBao
- Traefik Ingress: Overview & Concepts — Standard vs CRD routing
- Standard Kubernetes Ingress — sticky sessions, paths, multi-host, middleware, TLS redirect
- Basic IngressRoute, Middleware guides, Canary, Let's Encrypt, IngressRouteTCP
