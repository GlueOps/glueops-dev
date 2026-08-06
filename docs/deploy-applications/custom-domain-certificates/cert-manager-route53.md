---
id: custom-domains-cert-manager-route53
title: "Automated Certificates with cert-manager (Route53)"
---

# Automated Certificates with cert-manager (Route53)

Issue and **automatically renew** Let's Encrypt certificates — including wildcards — for a domain whose DNS is hosted in your own AWS Route53 account. Everything runs inside your application's namespace using the standard app Helm chart: no platform changes, and your AWS credential is only readable by your own workloads.

This guide uses Route53. The same pattern works for any [DNS provider cert-manager supports natively](https://cert-manager.io/docs/configuration/acme/dns01/#supported-dns01-providers) — only the `solvers` block of the Issuer changes. Providers that require a cert-manager *webhook* (GoDaddy, OVH, and others) need a cluster-level component: [contact GlueOps](https://www.glueops.dev/contact-us) if you need one of those.

## How it works

1. You create a narrowly-scoped IAM credential in **your** AWS account that can only edit DNS records in the hosted zone for your domain.
2. You store the secret key in your environment's secrets vault.
3. Your app deploys a namespaced cert-manager `Issuer` and a `Certificate` through the app chart's `customResourcesMap`. cert-manager answers Let's Encrypt's DNS-01 challenges by writing temporary TXT records in your zone, and renews the certificate automatically before expiry.

## Step 1 — Create a scoped IAM credential (your AWS account)

Create a policy that can only touch your hosted zone (find your zone ID in the Route53 console):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "route53:GetChange", "Resource": "arn:aws:route53:::change/*" },
    { "Effect": "Allow",
      "Action": ["route53:ChangeResourceRecordSets", "route53:ListResourceRecordSets"],
      "Resource": "arn:aws:route53:::hostedzone/YOUR_ZONE_ID" }
  ]
}
```

Attach it to a dedicated IAM user (e.g. `cert-manager-dns01`) and create an access key. You'll need the **Access Key ID** (goes in values, not secret) and the **Secret Access Key** (goes in the vault, next step).

## Step 2 — Store the secret key in your vault

In your environment's OpenBao/Vault UI (see [Managing Environment Secrets](/deploy-applications/manage-environment-secrets)), create a secret at a **dedicated path** — do not mix it into a path your app already pulls environment variables from:

- Path: `secret/<your-app>-route53-dns01`
- Key: `secret_access_key`, Value: *the IAM secret access key*

## Step 3 — Configure your application values

```yaml
externalSecret:
  enabled: true
  secrets:
    app:                                        # your existing app env secrets — keep as-is
      dataFrom:
        key: secret/<app_name>/<environment>
    route53-dns01:                              # creates Secret <app-name>-route53-dns01
      data:
        secret-access-key:
          remoteRef:
            key: secret/<your-app>-route53-dns01
            property: secret_access_key

# Entries under `secrets` are independent — if your app already pulls its
# environment variables through an entry like `app` above, leave it untouched
# and add `route53-dns01` alongside it.

customResourcesMap:
  dns01-issuer: |
    apiVersion: cert-manager.io/v1
    kind: Issuer
    metadata:
      name: {{ include "app.name" $ }}-dns01
      namespace: {{ include "app.namespace" $ }}
    spec:
      acme:
        server: https://acme-v02.api.letsencrypt.org/directory
        privateKeySecretRef:
          name: {{ include "app.name" $ }}-dns01-acme-key
        solvers:
          - dns01:
              route53:
                region: us-east-1                 # region of the Route53 API client; any valid region works
                hostedZoneID: YOUR_ZONE_ID
                accessKeyID: YOUR_ACCESS_KEY_ID
                secretAccessKeySecretRef:
                  name: {{ include "app.name" $ }}-route53-dns01
                  key: secret-access-key
  customer-cert: |
    apiVersion: cert-manager.io/v1
    kind: Certificate
    metadata:
      name: {{ include "app.name" $ }}-customer
      namespace: {{ include "app.namespace" $ }}
    spec:
      secretName: {{ include "app.name" $ }}-tls-customer-domain
      dnsNames:
        - "example.com"
        - "*.example.com"
      issuerRef:
        kind: Issuer
        name: {{ include "app.name" $ }}-dns01

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
```

:::caution Don't combine with the cluster-issuer annotation
When you define an explicit `Certificate` like this, do **not** also set the `cert-manager.io/cluster-issuer` annotation on the ingress — that would create a second, competing certificate request for the same secret.
:::

## Step 4 — Deploy and verify

1. Commit the values change to your deployment-configurations repository and wait for Argo CD to sync the application (or click **Sync** in the Argo CD UI).
2. In the Argo CD UI, open your application's resource tree. You'll see the `Issuer`, the `Certificate`, and — while issuance is running — its child `CertificateRequest`, `Order`, and `Challenge` resources appear underneath it. First issuance typically completes in 2–5 minutes; the `Certificate` turns **Healthy** when the certificate has been issued.
3. Check the served certificate:

```bash
curl -vI https://www.example.com 2>&1 | grep -E "subject|issuer"
```

## Troubleshooting

If the `Certificate` stays unhealthy, click the `Challenge` resource in the Argo CD resource tree — its status and events tell you what's wrong:

- **`AccessDenied`** — the IAM policy doesn't cover the zone, or the zone ID is wrong.
- **`Waiting for DNS-01 challenge propagation`** — normal for the first few minutes; cert-manager retries until the TXT record is visible publicly.
- **CAA errors from Let's Encrypt** — your domain's CAA records don't allow `letsencrypt.org`; check `dig CAA example.com`.
- **Testing repeatedly?** Switch the Issuer's `server` to the staging endpoint (`https://acme-staging-v02.api.letsencrypt.org/directory`) while iterating. Let's Encrypt production has [rate limits](https://letsencrypt.org/docs/rate-limits/) (e.g. 5 duplicate certificates per week). Staging certificates are not browser-trusted — switch back when done and delete the old secret via the Argo CD UI so a production certificate is issued.

## Renewal

Nothing to do — cert-manager renews automatically (roughly a third of the certificate lifetime before expiry) using the same DNS-01 flow. Keep the IAM credential valid; if you rotate it, update the vault secret and the `accessKeyID` in values.
