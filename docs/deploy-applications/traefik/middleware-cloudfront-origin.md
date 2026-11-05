---
id: traefik-middleware-cloudfront-origin
title: "Middleware: Allow Only CloudFront (Origin Verify)"
description: "Block requests that bypass your CloudFront distribution, using a secret origin header checked by Traefik forwardAuth."
---

# Middleware: Allow Only CloudFront (Origin Verify)

Put Amazon CloudFront in front of an application and make sure visitors can't go around it. CloudFront adds a secret header to every request it sends to your origin, and Traefik rejects any request that doesn't carry it. You deploy one small verifier, and each application you want to protect opts in with a single line.

## How it works

1. A visitor requests your site through CloudFront.
2. CloudFront forwards the request to your origin and adds `X-Origin-Verify: <secret>` as a custom origin header.
3. Traefik's **forwardAuth** middleware sends only that header to the verifier, a small nginx service in your namespace.
4. The verifier compares it with the values in your secret store. It returns `200` on a match and `403` otherwise.
5. On `200`, Traefik removes `X-Origin-Verify` and forwards the request to your app, so the secret never reaches your application or its logs. On `403`, the visitor gets `403 Forbidden`.

## Prerequisites

- An application already deployed and reachable — see [Basic IngressRoute](./traefik-basic-ingressroute) or [Standard Kubernetes Ingress](./traefik-standard-ingress).
- Write access to your environment's secret store — see [Manage Environment Secrets](../manage-environment-secrets).
- Permission to create or edit a CloudFront distribution in your AWS account.

Domains and namespaces throughout this guide fill in from the **Captain Domain** box in the navigation bar. Your environment namespace is the first label of that domain — for `nonprod.example.onglueops.com`, the namespace is `nonprod`.

## Step 1 — Generate and store the secret

Generate a random value:

```bash
openssl rand -hex 32
```

In your secret store, under the `secret/` mount, create the path `traefik-cloudfront-verifier/<env>` with one key. `<env>` is your environment folder name under `envs/`, e.g. `prod` — not the namespace. Type the value exactly as shown, brackets and quotes included:

```
ORIGIN_VERIFY_SECRETS   ["<output of the command above>"]
```

You'll paste the same value (without the brackets and quotes) into CloudFront in Step 4. The array holds a second value only while [rotating the secret](#rotating-the-secret).

:::warning
Each value must be letters and digits only, which `openssl rand -hex 32` guarantees. The verifier refuses to start if the key is missing, the array is empty, or any value has another character. Line breaks are ignored, so a pretty-printed array works.
:::

## Step 2 — Deploy the verifier

Copy [`apps/traefik-cloudfront-verifier/`](https://github.com/GlueOps/deployment-configurations-examples/tree/main/apps/traefik-cloudfront-verifier) from the examples repository into your deployment-configurations repository, next to your other apps, and rename `envs/prod` to your `<env>` if it differs. The only line to change is the secret path, which must match Step 1:

```yaml
# Store ORIGIN_VERIFY_SECRETS at this path first: a JSON array of letters-and-digits strings, e.g. ["<value>"].
# Change "prod" to your envs/ folder name. Values are read at startup, so restart the Deployment after changing them.
externalSecret:
  enabled: true
  secrets:
    origin-verify:
      dataFrom:
        key: secret/traefik-cloudfront-verifier/prod
```

The rest of the folder — the nginx verifier, its probes, security settings and the three middlewares listed under [What Gets Created](#what-gets-created) — doesn't need changes. Commit it, and ArgoCD creates the `traefik-cloudfront-verifier-<env>` app. Protected apps reference only `traefik-cloudfront-origin-guard`, which runs the check first and removes the header second.

:::caution The verifier reads the secret at startup
Changing the value in your secret store doesn't affect pods that are already running. Afterwards, open the `traefik-cloudfront-verifier-<env>` app in ArgoCD, choose **Restart** from the menu on its Deployment, and wait until the app shows **Healthy**. If it stays **Progressing** for more than a minute, the new value is probably malformed: open the newest pod's logs, fix the value, and restart again. One old pod keeps serving meanwhile, so do this right after every change.
:::

## Step 3 — Protect an application

The application must be in the same namespace as the verifier. Add the guard to its route; nothing else about the app changes.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="ingressroute" label="IngressRoute (CRD)">

Add the two `middlewares` lines to each route in your IngressRoute:

```yaml
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          middlewares:                                # add
            - name: traefik-cloudfront-origin-guard   # add
          services:
            - name: '{{ include "app.name" . }}'
```

<details>
<summary>Full example app (<code>apps/traefik-cloudfront/envs/prod/values.yaml</code>)</summary>

```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

# Requires the traefik-cloudfront-verifier app, which defines the traefik-cloudfront-origin-guard Middleware.
# Point your CloudFront origin at this hostname and add the X-Origin-Verify custom origin header.
customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: traefik-cloudfront
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
            - name: traefik-cloudfront-origin-guard
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

</details>

</TabItem>
<TabItem value="ingress" label="Standard Ingress">

Add the annotation to your Ingress:

```yaml
ingress:
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: CAPTAIN_NAMESPACE-traefik-cloudfront-origin-guard@kubernetescrd
```

The format is `<namespace>-<middleware name>@kubernetescrd`. Annotations are not template-rendered, so write the namespace out in full. If the annotation already lists middlewares, add this one to the comma-separated list.

<details>
<summary>Full example app (<code>apps/traefik-ingress-cloudfront/envs/prod/values.yaml</code>)</summary>

```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

# Requires the traefik-cloudfront-verifier app, which defines the traefik-cloudfront-origin-guard Middleware.
ingress:
  enabled: true
  ingressClassName: public-traefik
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: CAPTAIN_NAMESPACE-traefik-cloudfront-origin-guard@kubernetescrd
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'
```

</details>

</TabItem>
</Tabs>

:::warning Every route to the app needs the guard
Protection is per route. Any other IngressRoute or Ingress that points at the same Service without the guard is a way around CloudFront.
:::

## Step 4 — Configure CloudFront

Set these on the distribution in front of the app. Use the app's own hostname as the origin — `<app folder>-<env>.apps.CAPTAIN_DOMAIN` — so Traefik's `Host()` rule matches and the cluster's wildcard certificate is valid for it. If the distribution already exists, check its origin domain and origin request policy against this table before you change anything else.

| Setting | Value |
|---|---|
| Origin domain | Your app's hostname, e.g. `my-app-prod.apps.CAPTAIN_DOMAIN` |
| Protocol | **HTTPS only**, minimum TLSv1.2 — over HTTP the secret crosses the internet in plain text, so rotate it if you ever test that way |
| Add custom header | Name `X-Origin-Verify`, value from Step 1 |
| Cache policy | `CachingDisabled`, or your own policy |
| Origin request policy | `AllViewerExceptHostHeader` |
| Viewer protocol policy | Redirect HTTP to HTTPS |

:::caution Don't forward the viewer's Host header
`AllViewerExceptHostHeader` makes CloudFront send the origin hostname as `Host`, which is what Traefik routes on. Policies that forward the viewer's `Host` (such as `AllViewer`) send `*.cloudfront.net` or your custom domain instead. With an HTTPS origin the certificate no longer matches and CloudFront returns `502`; with an HTTP origin the route doesn't match and Traefik returns `404`.
:::

<details>
<summary>The same distribution in OpenTofu</summary>

```hcl
provider "aws" {
  region = "us-east-1"
}

variable "origin_domain" {
  type    = string
  default = "my-app-prod.apps.CAPTAIN_DOMAIN"
}

variable "origin_verify_secret" {
  type      = string
  sensitive = true
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_distribution" "app" {
  enabled     = true
  price_class = "PriceClass_100"

  origin {
    origin_id   = "traefik"
    domain_name = var.origin_domain

    custom_header {
      name  = "X-Origin-Verify"
      value = var.origin_verify_secret
    }

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id         = "traefik"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

</details>

Pass the secret through an environment variable (`TF_VAR_origin_verify_secret`) rather than a file in Git. The value is still stored in the OpenTofu state, so keep the state somewhere private. With many distributions, have them all read the same variable, so a rotation is a single `tofu apply`.

## What Gets Created

| Resource | Name | Purpose |
|---|---|---|
| Deployment + Service | `traefik-cloudfront-verifier-<env>` | nginx that answers `200` or `403`; 2 replicas, preferably on different nodes |
| PodDisruptionBudget | `traefik-cloudfront-verifier-<env>` | Keeps one verifier running during node maintenance |
| ConfigMap | `traefik-cloudfront-verifier-<env>-nginx` | nginx main config (4 workers) and the startup script that checks the values and writes the server config |
| ExternalSecret | `traefik-cloudfront-verifier-<env>-origin-verify` | Injects `ORIGIN_VERIFY_SECRETS` as an environment variable |
| Middleware | `traefik-cloudfront-origin-verify` | forwardAuth to the verifier; forwards only `X-Origin-Verify` |
| Middleware | `traefik-cloudfront-strip-header` | Removes the header before your app |
| Middleware | `traefik-cloudfront-origin-guard` | The chain protected apps reference |

The `-<env>` suffix is your environment folder name, e.g. `-prod` for `envs/prod/`.

## Verify

In ArgoCD, the `traefik-cloudfront-verifier-<env>` app and your app should be **Synced** and **Healthy**.

Through CloudFront, the app answers normally:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<distribution>.cloudfront.net/
# 200
```

Straight to the origin, without the header, it's refused:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://my-app-prod.apps.CAPTAIN_DOMAIN/
# 403

curl -s -o /dev/null -w "%{http_code}\n" -H "X-Origin-Verify: guess" https://my-app-prod.apps.CAPTAIN_DOMAIN/
# 403
```

The example apps run `traefik/whoami`, which echoes the request headers it receives. Through CloudFront, `X-Origin-Verify` should **not** appear in its output.

Use the response code to tell the outcomes apart:

| Request | Response | Meaning | Fix |
|---|---|---|---|
| Direct to origin | `403` | Working — the origin is protected | — |
| Direct to origin | `200` | The route has no guard. **The app is public.** | Add the middleware or annotation; confirm the sync completed in ArgoCD |
| Any | `404` | The middleware reference doesn't resolve, or the `Host` doesn't match the route | Check the name and namespace prefix against the Middlewares in the verifier app in ArgoCD; check the origin request policy |
| Through CloudFront | `502` | CloudFront can't connect: the origin certificate doesn't match the hostname it sends, or the origin is unreachable | Use `AllViewerExceptHostHeader`; set the origin domain to the app's own hostname |
| Any | `500` | The verifier has no ready pods | Open the verifier app in ArgoCD: a pod that won't start shows why in its logs (for example `ORIGIN_VERIFY_SECRETS` not set or malformed); check the ExternalSecret synced |
| Through CloudFront | `403` | CloudFront's header value doesn't match the secret store | Compare the values; restart the verifier after changing the secret |

## Rotating the secret

The verifier accepts every value in the array, so you can rotate without rejecting requests:

1. Generate a new value and add it to the array, keeping the old one: `["<new>", "<old>"]`. Wait a few seconds for the ExternalSecret to sync, restart the verifier in ArgoCD, wait until it's **Healthy**, and confirm the new value is accepted:

   ```bash
   read -rs NEW   # paste the new value; keeps it out of your shell history
   curl -s -o /dev/null -w "%{http_code}\n" -H "X-Origin-Verify: $NEW" https://my-app-prod.apps.CAPTAIN_DOMAIN/
   # 200
   ```

2. Update the custom header value on **every** distribution that uses this verifier. Then list any that still send a different value or haven't finished deploying — this must print nothing before you continue:

   ```bash
   aws cloudfront list-distributions --output text \
     --query "DistributionList.Items[?Origins.Items[?CustomHeaders.Items[?HeaderName=='X-Origin-Verify' && HeaderValue!='$NEW']] || Status!='Deployed'].[Id,Status]"
   ```

3. Remove the old value, `["<new>"]`, restart the verifier in ArgoCD, and wait until it's **Healthy**. Old pods keep serving for about 10 seconds while they shut down, so wait that long, then confirm the old value is refused:

   ```bash
   read -rs OLD   # paste the old value
   curl -s -o /dev/null -w "%{http_code}\n" -H "X-Origin-Verify: $OLD" https://my-app-prod.apps.CAPTAIN_DOMAIN/
   # 403
   ```

:::warning Don't skip the last step
Until the old value is removed from the array, it still opens your origin. If you're rotating because the old value leaked, the rotation hasn't helped until it's removed.
:::

## Key Points

- This blocks requests that bypass CloudFront. It's a shared secret, not user authentication — combine it with [Login with GitHub](./traefik-middleware-forwardauth-github) or your app's own login if you need to know who the visitor is.
- Failures are closed: a bad reference returns `404` and a missing verifier returns `500`. The only way to leave an app public is a route without the guard.
- One verifier can protect any number of apps in the same namespace, and any number of distributions that send a value from its array. If it's down, every protected app returns `500`, so watch its health in ArgoCD.
- CloudFront replaces any `X-Origin-Verify` a visitor sends with its own value, so visitors can't spoof it through CloudFront.
- The platform's Traefik access logs drop request headers, and the verifier's own access log is off, so the secret isn't logged. Don't enable header logging on either.
- Turn caching back on only for content that's safe to cache. `CachingDisabled` also keeps CloudFront from caching an error page while you're setting up.

## Related

- [Middleware: Login with GitHub (Forward Auth)](./traefik-middleware-forwardauth-github) — the same forwardAuth pattern, for user login
- [Standard Kubernetes Ingress](./traefik-standard-ingress) — middleware annotations on standard Ingress
- [Manage Environment Secrets](../manage-environment-secrets) — storing the secret
