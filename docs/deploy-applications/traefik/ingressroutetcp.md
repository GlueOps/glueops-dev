---
id: traefik-ingressroutetcp
title: IngressRouteTCP
---

# IngressRouteTCP

Route raw TCP traffic to your service using Traefik's `IngressRouteTCP` CRD. This is useful for non-HTTP protocols like databases, MQTT, or custom TCP services.

## Prerequisites

**`base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

## Configuration

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: TLSOption
    metadata:
      name: tcp-tls-options
    spec:
      alpnProtocols:
        - http/1.1
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRouteTCP
    metadata:
      name: my-app-tcp
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - websecure
      routes:
        - match: HostSNI(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
      tls:
        options:
          name: tcp-tls-options
          namespace: '{{ include "app.namespace" . }}'
```

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

customResourcesMap:
  tls-options: |
    apiVersion: traefik.io/v1alpha1
    kind: TLSOption
    metadata:
      name: tcp-tls-options
    spec:
      alpnProtocols:
        - http/1.1
  tcp-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRouteTCP
    metadata:
      name: my-app-tcp
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - websecure
      routes:
        - match: HostSNI(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
      tls:
        options:
          name: tcp-tls-options
          namespace: '{{ include "app.namespace" . }}'
```

</TabItem>
</Tabs>

## How It Works

- **`HostSNI`** matcher — Routes based on the TLS Server Name Indication (SNI) field. The client must send the correct hostname in the TLS ClientHello
- **`TLSOption` with `alpnProtocols`** — Controls which ALPN protocols Traefik advertises during the TLS handshake. Setting `http/1.1` prevents HTTP/2 negotiation, which is necessary because `IngressRouteTCP` forwards raw bytes and cannot translate between HTTP protocol versions
- **TLS termination at Traefik** — Traefik terminates TLS and forwards the decrypted TCP stream to the backend. The backend does **not** need to handle TLS itself
- **EntryPoint `websecure`** — Uses port 443. TCP routing requires a TLS-capable entrypoint for SNI matching

## Verify

```bash
curl https://my-app-tcp-prod.apps.CAPTAIN_DOMAIN
```

:::note
The `-prod` suffix matches your environment folder name (`envs/prod/`). If you deploy to a different environment like `envs/uat/`, the suffix changes accordingly (e.g., `my-app-tcp-uat`).
:::

Expected output (from `traefik/whoami`):
```
Hostname: my-app-tcp-prod-xxxxxxxxxx-xxxxx
IP: 127.0.0.1
...
GET / HTTP/1.1
Host: my-app-tcp-prod.apps.CAPTAIN_DOMAIN
```

## Key Points

- TCP routes require **TLS with SNI** — Traefik needs the SNI hostname to route traffic to the correct backend since TCP has no `Host` header like HTTP
- **`TLSOption` is required** for HTTP backends — Without it, Traefik advertises HTTP/2 via ALPN. Since `IngressRouteTCP` forwards raw TCP bytes (not HTTP), an HTTP/2 client sends binary frames the backend cannot parse. The `TLSOption` restricts ALPN to `http/1.1` to avoid this
- `HostSNI(*)` matches **all** hostnames — use this only if you have a single TCP service on the entrypoint, or for catch-all routing
- TCP routing shares the same entrypoint ports as HTTP/HTTPS routes — Traefik uses SNI to distinguish between them

:::tip
For protocol-specific backends, set `alpnProtocols` to the appropriate value. For example, the [PostgreSQL TCP example](./traefik-ingressroutetcp-postgres) uses `alpnProtocols: [postgresql]`.
:::

:::caution
**`IngressRouteTCP` does not support middleware.** If you need middleware (rate limiting, headers, etc.), use a standard `IngressRoute` with TLS termination at Traefik instead.
:::

:::info
Common use cases for IngressRouteTCP:
- **Databases** — MySQL, PostgreSQL, MongoDB connections
- **Message brokers** — MQTT, AMQP, Kafka
- **Custom protocols** — Any TCP-based service that needs direct connectivity
:::
