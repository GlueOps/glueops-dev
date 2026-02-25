---
id: traefik-ingressroutetcp-postgres
title: "IngressRouteTCP: PostgreSQL"
---

# IngressRouteTCP: PostgreSQL

Route PostgreSQL traffic through Traefik using an `IngressRouteTCP` with **TLS termination**. Traefik terminates TLS using the cluster's wildcard certificate and forwards plain TCP to the PostgreSQL pod — no SSL configuration needed on the backend.

:::warning
**Ephemeral data only.** This example does not use persistent storage. All PostgreSQL data is lost when the pod restarts. The GlueOps platform does not support local storage. For production databases, use a managed database service.
:::

## Prerequisites

**`base/base-values.yaml`**
```yaml
# PostgreSQL 18 — used to demonstrate TCP routing via Traefik.
# Data is ephemeral (no persistent volume). All data is lost on pod restart.

image:
  registry: docker.io
  repository: postgres
  tag: "18"
  port: 5432
```

## Configuration

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">

**`envs/prod/values.yaml`**
```yaml
# NOTE: PostgreSQL data is ephemeral. This example uses no persistent
# storage — all data is lost when the pod restarts. This is intentional;
# the GlueOps platform does not support local storage.

deployment:
  enabled: true
  replicas: 1
  envVariables:
    - name: POSTGRES_PASSWORD
      value: "glueops-demo"

service:
  enabled: true

customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: TLSOption
    metadata:
      name: postgres-tls-options
    spec:
      alpnProtocols:
        - postgresql
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRouteTCP
    metadata:
      name: traefik-tcp-postgres
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - websecure
      routes:
        - match: HostSNI(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          services:
            - name: {{ include "app.name" . }}
              namespace: {{ include "app.namespace" . }}
              port: 5432
      tls:
        options:
          name: postgres-tls-options
          namespace: {{ include "app.namespace" . }}
```

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`envs/prod/values.yaml`**
```yaml
# NOTE: PostgreSQL data is ephemeral. This example uses no persistent
# storage — all data is lost when the pod restarts. This is intentional;
# the GlueOps platform does not support local storage.

deployment:
  enabled: true
  replicas: 1
  envVariables:
    - name: POSTGRES_PASSWORD
      value: "glueops-demo"

service:
  enabled: true

customResourcesMap:
  tls-options: |
    apiVersion: traefik.io/v1alpha1
    kind: TLSOption
    metadata:
      name: postgres-tls-options
    spec:
      alpnProtocols:
        - postgresql
  tcp-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRouteTCP
    metadata:
      name: traefik-tcp-postgres
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - websecure
      routes:
        - match: HostSNI(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          services:
            - name: {{ include "app.name" . }}
              namespace: {{ include "app.namespace" . }}
              port: 5432
      tls:
        options:
          name: postgres-tls-options
          namespace: {{ include "app.namespace" . }}
```

</TabItem>
</Tabs>

## How It Works

- **`TLSOption` with `alpnProtocols: [postgresql]`** — PostgreSQL clients negotiate TLS using the `postgresql` ALPN protocol. By default, Traefik only accepts `h2`/`http/1.1`. The `TLSOption` tells Traefik to accept the `postgresql` ALPN, allowing TLS termination to succeed
- **`tls.options` (no `passthrough`)** — Traefik terminates TLS using the cluster's wildcard certificate and forwards **plain TCP** to PostgreSQL. The backend does not need SSL configured
- **`HostSNI` matcher** — Routes based on the TLS Server Name Indication (SNI) field sent during the TLS handshake
- **EntryPoint `websecure`** — Clients connect on port 443. The PostgreSQL client must support `sslnegotiation=direct` (PostgreSQL 17+ client)
- **Port 5432** — The service port matches the PostgreSQL default. Traefik forwards traffic from port 443 to port 5432 on the backend

## Verify

```bash
# Check the resources exist
kubectl get ingressroutetcps -n nonprod | grep traefik-tcp-postgres
kubectl get tlsoptions -n nonprod | grep postgres-tls-options

# Connect with psql (requires PostgreSQL 17+ client for sslnegotiation=direct)
docker run --rm postgres:18 \
  psql "host=<app-name>-prod.apps.CAPTAIN_DOMAIN port=443 \
        user=postgres password=glueops-demo dbname=postgres \
        sslmode=require sslnegotiation=direct" \
  -c "SELECT 1;"
```

:::info
**Why `sslnegotiation=direct`?** Standard PostgreSQL connections start unencrypted, then upgrade to TLS via the `SSLRequest` message. But Traefik's `IngressRouteTCP` expects TLS from the very first byte (for SNI matching). The `sslnegotiation=direct` option (PostgreSQL 17+ clients) makes `psql` start with a TLS handshake immediately, which is what Traefik needs.
:::

## Key Points

- **No SSL on the backend** — Traefik terminates TLS with the cluster's valid wildcard cert, then forwards plain TCP to PostgreSQL
- **TLSOption is required** — Without it, Traefik rejects the connection because the PostgreSQL ALPN protocol (`postgresql`) doesn't match the default HTTP protocols
- **Client must be PostgreSQL 17+** — Only PostgreSQL 17+ clients support `sslnegotiation=direct`, which is required for connecting through Traefik
- **Data is ephemeral** — No persistent volume is attached. All data is lost on pod restart. For production, use a managed database service

:::caution
**The `TLSOption` affects all `IngressRouteTCP` routes that reference it.** If you have other TCP services on the same entrypoint, make sure the `TLSOption` name is unique and only referenced by the PostgreSQL route.
:::
