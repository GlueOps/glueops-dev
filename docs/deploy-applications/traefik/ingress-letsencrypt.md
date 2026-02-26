---
id: traefik-ingress-letsencrypt
title: "Let's Encrypt Certificates (Standard Ingress)"
---

# Let's Encrypt Certificates (Standard Ingress)

The simplest way to get free, auto-renewing TLS certificates from [Let's Encrypt](https://letsencrypt.org/) — add a single annotation to your standard Kubernetes Ingress and cert-manager handles the rest.

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

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

ingress:
  enabled: true
  ingressClassName: public-traefik
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-public-traefik
  entries:
    - name: public
      hosts:
        - hostname: app.example.com
        - hostname: api.example.com
  tls:
    - secretName: traefik-ingress-letsencrypt-cert
      hosts:
        - app.example.com
        - api.example.com
```

## How It Works

1. cert-manager watches for Ingress resources with the `cert-manager.io/cluster-issuer` annotation
2. When it detects this Ingress, it automatically creates a `Certificate` resource matching the `tls[].hosts` list
3. cert-manager requests the certificate from Let's Encrypt using the HTTP-01 challenge — it creates a temporary solver Ingress to serve the ACME validation token at `http://<domain>/.well-known/acme-challenge/<token>`
4. Once validated, Let's Encrypt issues the certificate and cert-manager stores it in the Secret specified by `tls[].secretName`
5. Traefik picks up the Secret and serves the certificate for HTTPS connections

No explicit `Certificate` CRD is needed — the `cert-manager.io/cluster-issuer` annotation triggers everything automatically.

:::info
**DNS must point to the Traefik load balancer before cert-manager can complete the HTTP-01 challenge.** Create A or CNAME records for your custom domains pointing to the Traefik LB's external IP or hostname. The challenge will fail if Let's Encrypt cannot reach port 80 on your domains.
:::

:::tip
This is the simplest approach for Let's Encrypt certificates. If you need more control — such as separate HTTP/HTTPS entrypoints, middleware on the HTTPS route, or non-standard TLS options — use the [IngressRoute approach](./traefik-letsencrypt) instead.
:::

## What Gets Created

| Resource | Name | Purpose |
|----------|------|---------|
| Deployment | `traefik-ingress-letsencrypt-prod` | Runs the application pods |
| Service | `traefik-ingress-letsencrypt-prod` | ClusterIP service for internal routing |
| Ingress | `traefik-ingress-letsencrypt-prod-public` | Routes traffic for both hostnames, triggers cert-manager |
| Certificate | *(auto-created by cert-manager)* | Requests a TLS cert from Let's Encrypt via HTTP-01 |
| Secret | `traefik-ingress-letsencrypt-cert` | Stores the issued TLS certificate and private key |

## Verify

```bash
# Test HTTPS — should return a valid Let's Encrypt certificate
curl -v https://app.example.com
curl -v https://api.example.com
```

You can monitor certificate status from the ArgoCD dashboard.

## Key Points

- The `cert-manager.io/cluster-issuer: letsencrypt-public-traefik` annotation is all that's needed to trigger certificate issuance — no `Certificate` CRD required
- The `tls[].hosts` list must match the hostnames in `entries[].hosts[].hostname` — cert-manager uses the TLS hosts to determine which domains to include in the certificate
- Multiple domains listed in `tls[].hosts` create a single SAN (Subject Alternative Name) certificate covering all of them
- cert-manager automatically renews certificates before they expire (default: 30 days before expiry)
- The `external-dns` annotation is **not needed** here because custom domains have DNS managed outside the platform. If your domain's DNS zone is managed by external-dns, it will auto-discover hostnames from the Ingress spec
