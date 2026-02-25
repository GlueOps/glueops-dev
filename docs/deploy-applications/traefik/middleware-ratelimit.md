---
id: traefik-middleware-ratelimit
title: "Middleware: Rate Limiting"
---

# Middleware: Rate Limiting

Protect your application from excessive requests using Traefik's `rateLimit` Middleware.

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
    kind: Middleware
    metadata:
      name: rate-limit
    spec:
      rateLimit:
        average: 10
        burst: 20
        period: 1s
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-ratelimit
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
          middlewares:
            - name: rate-limit
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
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
  middleware: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: rate-limit
    spec:
      rateLimit:
        average: 10
        burst: 20
        period: 1s
  ingressroute: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-ratelimit
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
          middlewares:
            - name: rate-limit
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

</TabItem>
</Tabs>

## How It Works

| Parameter | Description | Value in Example |
|-----------|-------------|------------------|
| `average` | Maximum sustained requests per `period` | `10` requests/second |
| `burst` | Maximum allowed burst of requests above `average` | `20` requests |
| `period` | Time window for the `average` calculation | `1s` (1 second) |

With the example configuration:
- Steady state: 10 requests per second are allowed
- Burst: Up to 20 requests can be made in a short burst before rate limiting kicks in
- Once the burst is exhausted, excess requests receive a **429 Too Many Requests** response

## Verify

```bash
# Check the middleware
kubectl get middlewares -n nonprod | grep rate-limit

# Normal request — should return 200
curl https://my-app.apps.nonprod.jupiter.onglueops.rocks

# Trigger rate limiting — rapid burst
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}\n" https://my-app.apps.nonprod.jupiter.onglueops.rocks
done
# After ~20 requests, you should see 429 responses
```

## Key Points

- Rate limiting is applied **per source IP** by default
- The `period` field accepts Go duration strings: `1s`, `1m`, `1h`
- If `period` is omitted, it defaults to `1s`
- `burst` must be >= `average`

:::info
For production workloads, tune `average` and `burst` based on your expected traffic patterns. Start with generous limits and tighten based on monitoring.
:::
