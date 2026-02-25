# Pattern: Standard Kubernetes Ingress Guide

**Use for:** Guides that use the Helm chart's built-in `ingress` config (no `customResources` needed for routing).

```markdown
---
id: traefik-<feature-name>
title: "<Display Title>"
---

# <Display Title>

<Description>

## Prerequisites

**`base/base-values.yaml`**
~~~yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
~~~

## Configuration

**`envs/prod/values.yaml`**
~~~yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'
~~~

## Verify

~~~bash
kubectl get ingress -n nonprod | grep <app-name>
# CAPTAIN_DOMAIN is replaced dynamically with the reader's domain
curl https://<app-name>.apps.CAPTAIN_DOMAIN
~~~

## Key Points

- <Key points>
```

## Notes

- No `<Tabs>` needed — standard Ingress only uses one configuration approach
- Hostname must be wrapped in **single quotes** for YAML compatibility with `{{ }}`
- `ingressClassName: public-traefik` — always use the field, never the annotation
