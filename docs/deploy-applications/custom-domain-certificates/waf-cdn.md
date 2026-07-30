---
id: custom-domains-waf-cdn
title: "Using a WAF or CDN"
---

# Using a WAF or CDN

Putting a WAF/CDN provider — CloudFront, Cloudflare, Fastly, Bunny.net, and similar — in front of your application gives you managed edge certificates **plus** WAF rules, DDoS protection, and caching. The provider issues and renews the certificate that browsers see; you point your domain's DNS at their edge.

This composes cleanly with the platform:

- **Edge certificates don't conflict with platform certificates.** A domain can hold valid certificates from multiple sources simultaneously. For example, AWS Certificate Manager (CloudFront) validates ownership with its own uniquely-named DNS record, entirely separate from Let's Encrypt's.
- **Your origin still needs TLS.** The CDN connects to your application over HTTPS, so keep a valid certificate on the platform side using either the [automated](/deploy-applications/custom-domain-certificates/custom-domains-cert-manager-route53) or [manual](/deploy-applications/custom-domain-certificates/custom-domains-certbot) approach — or configure the CDN to trust the captain-domain hostname as the origin.
- **CAA records** must permit every CA in play (e.g. `letsencrypt.org` and `amazon.com`).

Setups vary by provider — if you're interested in fronting your GlueOps-hosted application with a WAF/CDN, [reach out](https://www.glueops.dev/contact-us) and we'll help you get it configured.
