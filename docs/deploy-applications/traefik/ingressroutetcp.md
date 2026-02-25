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
        passthrough: true
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
        passthrough: true
```

</TabItem>
</Tabs>

## How It Works

- **`HostSNI`** matcher — Routes based on the TLS Server Name Indication (SNI) field. The client must send the correct hostname in the TLS ClientHello
- **`tls.passthrough: true`** — Traefik does NOT terminate TLS. The encrypted connection is forwarded directly to the backend service, which must handle TLS itself
- **EntryPoint `websecure`** — Uses port 443. TCP routing requires a TLS-capable entrypoint for SNI matching

## Verify

```bash
# Check the IngressRouteTCP exists
kubectl get ingressroutetcps -n nonprod | grep my-app-tcp

# Test with openssl (SNI-based connection)
openssl s_client -connect my-app-tcp.apps.CAPTAIN_DOMAIN:443 \
  -servername my-app-tcp.apps.CAPTAIN_DOMAIN
```

:::warning
With `tls.passthrough: true`, Traefik forwards the raw TLS connection to the backend without terminating it. The backend service **must** handle TLS itself. If your backend does not speak TLS natively (e.g., `traefik/whoami`), the TLS handshake will fail. For a working end-to-end test, use a backend with TLS configured (e.g., an nginx container with TLS certificates).
:::

## Key Points

- TCP routes require **TLS with SNI** — Traefik needs the SNI hostname to route traffic to the correct backend since TCP has no `Host` header like HTTP
- `HostSNI(*)` matches **all** hostnames — use this only if you have a single TCP service on the entrypoint, or for catch-all routing
- The backend service must handle TLS termination when using `passthrough: true`
- TCP routing shares the same entrypoint ports as HTTP/HTTPS routes — Traefik uses SNI to distinguish between them

:::caution
**TLS passthrough** means Traefik cannot inspect or modify the traffic (no middleware support). If you need middleware, use a standard IngressRoute with TLS termination at Traefik instead.
:::

:::info
Common use cases for IngressRouteTCP:
- **Databases** — MySQL, PostgreSQL, MongoDB connections
- **Message brokers** — MQTT, AMQP, Kafka
- **Custom protocols** — Any TCP-based service that needs direct connectivity
:::
