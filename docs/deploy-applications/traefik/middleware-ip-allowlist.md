---
id: traefik-middleware-ip-allowlist
title: "Middleware: IP Allow List"
---

# Middleware: IP Allow List

Restrict access to your application by IP address or CIDR range using Traefik's `ipAllowList` Middleware.

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
      name: ip-allowlist
    spec:
      ipAllowList:
        sourceRange:
          - "203.0.113.0/24"
          - "198.51.100.50/32"
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-ip
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
            - name: ip-allowlist
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`base/base-values.yaml`** (extends the image config)
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80

customResourcesMap:
  middleware: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: ip-allowlist
    spec:
      ipAllowList:
        sourceRange:
          - "203.0.113.0/24"
          - "198.51.100.50/32"
```

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

customResourcesMap:
  ingressroute: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-ip
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
            - name: ip-allowlist
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

:::tip
With `customResourcesMap`, the IP allowlist middleware is defined in `base-values.yaml` (shared across all environments) while the IngressRoute with the environment-specific hostname is in `envs/prod/values.yaml`. Both get merged and rendered.
:::

</TabItem>
</Tabs>

## Verify

```bash
# Check the middleware
kubectl get middlewares -n nonprod | grep ip-allowlist
kubectl describe middleware ip-allowlist -n nonprod

# From an allowed IP — should return 200
curl https://my-app.apps.nonprod.jupiter.onglueops.rocks

# From a blocked IP — should return 403 Forbidden
```

## Key Points

- Replace the example CIDR ranges with your actual allowed IPs
- Use `"0.0.0.0/0"` to allow all IPv4 addresses (useful for initial testing)
- You can find your current public IP with `curl ifconfig.me`
- Multiple CIDR ranges are supported — add as many `sourceRange` entries as needed

:::caution
If you lock yourself out by setting an incorrect IP range, you can fix it by updating the values file and pushing — ArgoCD will sync the change automatically.
:::
