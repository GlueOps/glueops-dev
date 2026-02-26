---
id: traefik-letsencrypt
title: "Let's Encrypt Certificates (IngressRoute)"
---

# Let's Encrypt Certificates (IngressRoute)

Issue free, auto-renewing TLS certificates from [Let's Encrypt](https://letsencrypt.org/) using cert-manager's HTTP-01 challenge solver, with traffic routed through a Traefik `IngressRoute`.

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
    apiVersion: cert-manager.io/v1
    kind: Certificate
    metadata:
      name: traefik-letsencrypt-cert
    spec:
      secretName: traefik-letsencrypt-cert
      issuerRef:
        name: letsencrypt-public-traefik
        kind: ClusterIssuer
      dnsNames:
        - app.example.com
        - api.example.com
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: traefik-letsencrypt-redirect
    spec:
      redirectScheme:
        scheme: https
        permanent: true
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: traefik-letsencrypt-http
      annotations:
        kubernetes.io/ingress.class: public-traefik
    spec:
      entryPoints:
        - web
      routes:
        - match: Host(`app.example.com`) || Host(`api.example.com`)
          kind: Rule
          middlewares:
            - name: traefik-letsencrypt-redirect
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: traefik-letsencrypt-https
      annotations:
        kubernetes.io/ingress.class: public-traefik
    spec:
      entryPoints:
        - websecure
      routes:
        - match: Host(`app.example.com`) || Host(`api.example.com`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
      tls:
        secretName: traefik-letsencrypt-cert
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
  certificate: |
    apiVersion: cert-manager.io/v1
    kind: Certificate
    metadata:
      name: traefik-letsencrypt-cert
    spec:
      secretName: traefik-letsencrypt-cert
      issuerRef:
        name: letsencrypt-public-traefik
        kind: ClusterIssuer
      dnsNames:
        - app.example.com
        - api.example.com
  redirect-middleware: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: traefik-letsencrypt-redirect
    spec:
      redirectScheme:
        scheme: https
        permanent: true
  http-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: traefik-letsencrypt-http
      annotations:
        kubernetes.io/ingress.class: public-traefik
    spec:
      entryPoints:
        - web
      routes:
        - match: Host(`app.example.com`) || Host(`api.example.com`)
          kind: Rule
          middlewares:
            - name: traefik-letsencrypt-redirect
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
  https-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: traefik-letsencrypt-https
      annotations:
        kubernetes.io/ingress.class: public-traefik
    spec:
      entryPoints:
        - websecure
      routes:
        - match: Host(`app.example.com`) || Host(`api.example.com`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
      tls:
        secretName: traefik-letsencrypt-cert
```

</TabItem>
</Tabs>

## How It Works

The HTTP-01 challenge flow:

1. The `Certificate` resource tells cert-manager to request a TLS certificate from Let's Encrypt for `app.example.com` and `api.example.com`
2. cert-manager creates an **Order** and one **Challenge** per domain
3. For each challenge, cert-manager creates a temporary solver `Ingress` that serves the ACME validation token at `http://<domain>/.well-known/acme-challenge/<token>`
4. Let's Encrypt sends an HTTP request to each domain to verify ownership
5. Once all challenges pass, Let's Encrypt issues the certificate
6. cert-manager stores the certificate in the Kubernetes Secret `traefik-letsencrypt-cert`
7. The HTTPS IngressRoute references that Secret via `tls.secretName`, and Traefik serves the certificate to clients

:::info
**DNS must point to the Traefik load balancer before cert-manager can complete the HTTP-01 challenge.** Create A or CNAME records for your custom domains pointing to the Traefik LB's external IP or hostname. The challenge will fail if Let's Encrypt cannot reach port 80 on your domains.
:::

:::caution
The HTTP redirect IngressRoute on the `web` entrypoint will **not** interfere with ACME challenges. cert-manager's temporary solver Ingress creates a route with a more specific path match (`/.well-known/acme-challenge/...`) that takes priority over the catch-all redirect.
:::

## What Gets Created

| Resource | Name | Purpose |
|----------|------|---------|
| Deployment | `traefik-letsencrypt-prod` | Runs the application pods |
| Service | `traefik-letsencrypt-prod` | ClusterIP service for internal routing |
| Certificate | `traefik-letsencrypt-cert` | Requests a TLS cert from Let's Encrypt via HTTP-01 |
| Secret | `traefik-letsencrypt-cert` | Stores the issued TLS certificate and private key |
| Middleware | `traefik-letsencrypt-redirect` | Redirects HTTP → HTTPS (301 permanent) |
| IngressRoute | `traefik-letsencrypt-http` | Catches HTTP traffic and redirects to HTTPS |
| IngressRoute | `traefik-letsencrypt-https` | Serves HTTPS traffic with the Let's Encrypt certificate |

## Verify

```bash
# Check the Certificate resource status
kubectl get certificates -n nonprod | grep traefik-letsencrypt-cert
# READY should be True

# Check the TLS Secret was created
kubectl get secrets -n nonprod | grep traefik-letsencrypt-cert

# Test HTTPS — should return a valid Let's Encrypt certificate
curl -v https://app.example.com
curl -v https://api.example.com

# Test HTTP → HTTPS redirect (should return 301)
curl -D- -o /dev/null http://app.example.com
# HTTP/1.1 301 Moved Permanently
# Location: https://app.example.com/

# Debug if certificate is not ready
kubectl describe certificate traefik-letsencrypt-cert -n nonprod
kubectl describe challenges -n nonprod
```

## Key Points

- The `Certificate` resource uses `ClusterIssuer` (not `Issuer`) — the `letsencrypt-public-traefik` ClusterIssuer is pre-configured on the platform
- Multiple domains can share a single certificate by listing them all in `dnsNames` — this creates a SAN (Subject Alternative Name) certificate
- cert-manager automatically renews certificates before they expire (default: 30 days before expiry)
- The `external-dns` annotation is **not included** on these IngressRoutes because custom domains have DNS managed outside the platform. If your domain's DNS zone is managed by external-dns, add `external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}` to the IngressRoute annotations
- The `tls.secretName` on the HTTPS IngressRoute must match the `secretName` in the `Certificate` resource
