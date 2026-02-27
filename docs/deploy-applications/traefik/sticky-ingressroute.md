---
id: traefik-sticky-ingressroute
title: "Sticky Sessions (IngressRoute)"
---

# Sticky Sessions (IngressRoute)

Pin a user to the same backend pod using cookie-based session affinity, configured directly on the IngressRoute service reference. Useful when running multiple replicas and your app maintains in-memory session state.

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
  replicas: 2

service:
  enabled: true

customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: traefik-sticky
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
              sticky:
                cookie:
                  name: my-sticky-cookie
                  maxAge: 3600
                  secure: true
                  httpOnly: true
                  sameSite: none
```

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 2

service:
  enabled: true

customResourcesMap:
  ingressroute: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: traefik-sticky
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
              sticky:
                cookie:
                  name: my-sticky-cookie
                  maxAge: 3600
                  secure: true
                  httpOnly: true
                  sameSite: none
```

</TabItem>
</Tabs>

## What Gets Created

| Resource | Name | Purpose |
|----------|------|---------|
| Deployment | `traefik-sticky-prod` | Runs 2 replicas of the application |
| Service | `traefik-sticky-prod` | ClusterIP service for internal routing |
| IngressRoute | `traefik-sticky` | Routes traffic with cookie-based pod affinity |

## Verify

```bash
# First request — check for the sticky cookie in the response
curl -v https://traefik-sticky-prod.apps.CAPTAIN_DOMAIN 2>&1 | grep -i set-cookie
# Output should include: Set-Cookie: my-sticky-cookie=<hash>; ... Secure; HttpOnly; SameSite=None

# Subsequent requests with the cookie go to the same pod
curl -b "my-sticky-cookie=<hash>" https://traefik-sticky-prod.apps.CAPTAIN_DOMAIN
# The "Hostname:" line in the whoami response should be the same across multiple requests
```

:::note
The `-prod` suffix matches your environment folder name (`envs/prod/`). If you deploy to a different environment like `envs/uat/`, the suffix changes accordingly (e.g., `traefik-sticky-uat`).
:::

## Key Points

- Sticky sessions are configured on the **service reference** inside the IngressRoute `routes[].services[]` block — not via annotations
- Requires `replicas > 1` to observe the effect (with a single replica, all requests go to the same pod regardless)
- Traefik manages the sticky cookie entirely — your application does not need to set or read it
- `secure: true` ensures the cookie is only sent over HTTPS
- `httpOnly: true` prevents JavaScript from accessing the cookie
- `sameSite: none` allows the cookie to be sent on cross-origin requests (requires `secure: true`)
- This is the IngressRoute CRD equivalent of the [annotation-based sticky sessions](./traefik-standard-ingress) approach used with standard Kubernetes Ingress

:::info
**Choosing a cookie name:** The `name` field sets the cookie name. Use a descriptive name to avoid collisions if your app sets its own cookies. Traefik generates the cookie value automatically — it's a hash of the backend pod.
:::
