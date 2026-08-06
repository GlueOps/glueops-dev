---
id: custom-domains-certbot
title: "Manual Certificates with certbot"
---

# Manual Certificates with certbot

Issue a multi-domain (including wildcard) certificate yourself with [certbot](https://certbot.eff.org/), upload it to your environment's secrets vault, and have the platform serve it on your ingress. Use this when you want certificates fully under your control, or when your DNS provider isn't [supported by cert-manager](https://cert-manager.io/docs/configuration/acme/dns01/#supported-dns01-providers).

:::caution You own renewals
Certificates issued this way do **not** renew themselves — repeat this process before every expiry. Let's Encrypt certificate lifetimes are moving from 90 days to 45 days during 2026, which doubles the renewal cadence. If you can, prefer the [automated cert-manager approach](/deploy-applications/custom-domain-certificates/custom-domains-cert-manager-route53).
:::

## Prerequisites

**`base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

## Step 1 — Issue the certificate

Wildcards require DNS validation, so use the manual DNS-01 flow (certbot will prompt you to create TXT records at your DNS provider):

```bash
certbot certonly --manual --preferred-challenges dns \
  -d "example.com" \
  -d "*.example.com" \
  -d "*.www.example.com" \
  --key-type ecdsa
```

Tips:

- List each name once and let wildcards do the work: `*.www.example.com` already covers `test.www.example.com`; don't add names a wildcard covers.
- certbot prompts for one TXT record per unique challenge name (`example.com` + `*.example.com` share one). Create each record, **wait for it to be visible** (`dig TXT _acme-challenge.example.com`), then continue.
- Output lands in `/etc/letsencrypt/live/example.com/`: `fullchain.pem` (certificate + chain) and `privkey.pem` (private key).

## Step 2 — Upload to your vault

In your environment's OpenBao/Vault UI (see [Managing Environment Secrets](/deploy-applications/manage-environment-secrets)), create a secret at a dedicated path:

- Path: `secret/<your-app>-tls`
- Key `tls_crt`: contents of `fullchain.pem`
- Key `tls_key`: contents of `privkey.pem`

## Step 3 — Reference it from your application values

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

externalSecret:
  enabled: true
  secrets:
    app:                                     # your existing app env secrets — keep as-is
      dataFrom:
        key: secret/<app_name>/<environment>
    tls-customer-domain:                     # creates Secret <app-name>-tls-customer-domain
      type: kubernetes.io/tls
      data:
        "tls.crt":
          remoteRef:
            key: secret/<your-app>-tls
            property: tls_crt
        "tls.key":
          remoteRef:
            key: secret/<your-app>-tls
            property: tls_key

ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" $ }}.apps.{{ .Values.captain_domain }}'
        - hostname: www.example.com
  tls:
    - secretName: '{{ include "app.name" $ }}-tls-customer-domain'
      hosts:
        - "example.com"
        - "*.example.com"
        - "*.www.example.com"
```

## Step 4 — Deploy and verify

Commit the values change to your deployment-configurations repository and wait for Argo CD to sync (or click **Sync** in the Argo CD UI). The `ExternalSecret` appears in your application's resource tree and turns **Healthy** once it has pulled the certificate from the vault. Then check the served certificate:

```bash
curl -vI https://www.example.com 2>&1 | grep -E "subject|issuer|expire"
```

## Renewing

Repeat Step 1 (new TXT values each time) and update the two vault keys in Step 2. The ExternalSecret refreshes the in-cluster secret automatically — no redeploy needed. Set yourself a reminder comfortably before the `notAfter` date:

```bash
openssl x509 -enddate -noout -in fullchain.pem
```
