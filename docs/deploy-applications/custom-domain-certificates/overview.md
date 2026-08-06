---
id: custom-domains-overview
title: "Custom Domain Certificates: Overview"
---

# Custom Domain Certificates

Every GlueOps cluster automatically provides TLS for hostnames under your [captain domain](/glueops-captain-domain) (e.g. `myapp.apps.nonprod.mycompany.glueopshosted.com`). This section covers certificates for **domains you own** — `www.example.com`, `*.example.com`, `api.otherdomain.com` — served by applications on the platform.

## Choosing an approach

| Your situation | Recommended approach |
|---|---|
| Your DNS is hosted on Route53 (or another [provider cert-manager supports](https://cert-manager.io/docs/configuration/acme/dns01/#supported-dns01-providers)) and you can create a narrowly-scoped API credential | [Automated certificates with cert-manager](/deploy-applications/custom-domain-certificates/custom-domains-cert-manager-route53) — fully automated issuance **and renewal** |
| You want certificates managed outside the platform, or your DNS provider isn't supported | [Manual certificates with certbot](/deploy-applications/custom-domain-certificates/custom-domains-certbot) — you issue and renew; the platform serves what you upload |

A few facts that apply to every approach:

- **Wildcard certificates (`*.example.com`) can only be issued via DNS validation** (the ACME DNS-01 challenge). No web-server-based (HTTP-01) method can issue wildcards — this is a Let's Encrypt rule, not a platform limitation.
- **A domain can hold valid certificates from several sources at once.** Certificates issued here don't conflict with certificates your CDN or another team issues for the same names.
- **If your domain uses CAA records**, make sure they permit the CA you're using (`letsencrypt.org` for the options documented here). Check with `dig CAA example.com`.
- **SAN planning tip:** `*.example.com` covers `www.example.com` but *not* `test.www.example.com` — that needs `*.www.example.com`. Conversely, avoid listing names a wildcard already covers; every extra unique challenge name is extra DNS work.

:::info Coming soon: DNS-PERSIST-01
Let's Encrypt is rolling out a new validation method where you create **one static DNS TXT record once** and all future issuance and renewals validate against it automatically — no per-renewal DNS changes and no API credentials. Support depends on Let's Encrypt production availability and [cert-manager implementation](https://github.com/cert-manager/cert-manager/issues/8373). We will document it here once it's usable end-to-end.
:::
