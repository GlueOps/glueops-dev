---
id: traefik-basic-ingressroute
title: Basic IngressRoute
---

# Basic IngressRoute

The simplest Traefik `IngressRoute` — route all traffic for a hostname to a single service.

## Prerequisites

Your app needs a `Deployment` and `Service` enabled:

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
  ingressroute: |
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

</TabItem>
</Tabs>

## What Gets Created

| Resource | Name | Purpose |
|----------|------|---------|
| Deployment | `my-app-prod` | Runs the application pods |
| Service | `my-app-prod` | ClusterIP service for internal routing |
| IngressRoute | `my-app` | Routes external traffic to the service |

## Verify

```bash
# Check the IngressRoute exists
kubectl get ingressroutes -n nonprod | grep my-app

# Check the service
kubectl get svc -n nonprod | grep my-app

# Test the route (after ~2 min for DNS)
curl https://my-app.apps.nonprod.jupiter.onglueops.rocks
```

## Key Points

- The `kubernetes.io/ingress.class: public-traefik` annotation tells Traefik to handle this IngressRoute
- The `external-dns.alpha.kubernetes.io/target` annotation creates the DNS record pointing to the load balancer
- The service name must match the ArgoCD app name: `<app-folder>-<env-folder>` (e.g., `my-app-prod`)
- Both `web` and `websecure` entrypoints are included so the app is reachable on both HTTP and HTTPS
