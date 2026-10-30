---
id: traefik-middleware-cloudfront-origin
title: "Middleware: Allow Only CloudFront (Origin Verify)"
description: "Make sure only your own CloudFront distribution can reach your application, using a secret origin header checked by Traefik forwardAuth."
---

# Middleware: Allow Only CloudFront (Origin Verify)

Put Amazon CloudFront in front of an application and make sure visitors can't go around it. CloudFront adds a secret header to every request it sends to your origin, and Traefik rejects any request that doesn't carry it. You deploy one small verifier, and each application you want to protect opts in with a single line.

An IP allow list on CloudFront's address ranges is **not** enough: every AWS customer's distribution uses the same ranges, so anyone could point their own distribution at your origin. The secret header ties traffic to **your** distribution. See [Middleware: IP Allow List](./traefik-middleware-ip-allowlist) for the IP-based approach and why it doesn't cover this case.

## How it works

1. A visitor requests your site through CloudFront.
2. CloudFront forwards the request to your origin and adds `X-Origin-Verify: <secret>` as a custom origin header.
3. Traefik's **forwardAuth** middleware sends only that header to the verifier, a small nginx service in your namespace.
4. The verifier compares it with the value in your secret store. It returns `200` on a match and `403` otherwise.
5. On `200`, Traefik removes `X-Origin-Verify` and forwards the request to your app, so the secret never reaches your application or its logs. On `403`, the visitor gets `403 Forbidden`.

The [examples repository](https://github.com/GlueOps/deployment-configurations-examples) has the verifier (`traefik-cloudfront-verifier`) plus two protected apps: `traefik-cloudfront` (IngressRoute) and `traefik-ingress-cloudfront` (standard Ingress).

## Prerequisites

- An application already deployed and reachable — see [Basic IngressRoute](./traefik-basic-ingressroute) or [Standard Kubernetes Ingress](./traefik-standard-ingress).
- Write access to your environment's secret store — see [Manage Environment Secrets](../manage-environment-secrets).
- Permission to create a CloudFront distribution in your AWS account.

Domains and namespaces throughout this guide fill in from the **Captain Domain** box in the navigation bar. Your environment namespace is the first label of that domain — for `nonprod.example.onglueops.com`, the namespace is `nonprod`.

## Step 1 — Generate and store the secret

Generate a random value:

```bash
openssl rand -hex 32
```

In your secret store, create the path `traefik-cloudfront-verifier/<environment>` with one key:

```
ORIGIN_VERIFY_SECRET   <output of the command above>
```

You'll paste the same value into CloudFront in Step 4. A second, optional key, `ORIGIN_VERIFY_SECRET_PREVIOUS`, is only used while [rotating the secret](#rotating-the-secret).

:::warning
Use letters and digits only, which `openssl rand -hex 32` guarantees. The verifier refuses to start if the value is empty or contains any other character, including a trailing newline or space.
:::

## Step 2 — Deploy the verifier

Create a new application directory, `apps/traefik-cloudfront-verifier/`.

**`base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: nginxinc/nginx-unprivileged
  tag: 1.29-alpine@sha256:0c79d56aee561a1d81c63f00eee5fb5fe29279560cdc55e91425133104c7fbe6
  port: 8080
```

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 2
  envVariables:
    # Without this, envsubst would also replace nginx's own $variables if an env var shares the name.
    - name: NGINX_ENVSUBST_FILTER
      value: "^ORIGIN_VERIFY_"
  securityContext:
    runAsNonRoot: true
    runAsUser: 101
    seccompProfile:
      type: RuntimeDefault
  containerSecurityContext:
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop: ["ALL"]
  resources:
    requests:
      cpu: 10m
      memory: 16Mi
    limits:
      memory: 64Mi
  readinessProbe:
    httpGet:
      path: /healthz
      port: http
  livenessProbe:
    httpGet:
      path: /healthz
      port: http
  volumes:
    - name: nginx
      configMap:
        name: '{{ include "app.name" . }}-nginx'
        defaultMode: 0755
    - name: confd
      emptyDir: {}
    - name: tmp
      emptyDir: {}
  volumeMounts:
    - name: nginx
      mountPath: /etc/nginx/templates
      readOnly: true
    - name: nginx
      mountPath: /docker-entrypoint.d/05-require-origin-verify-secret.envsh
      subPath: 05-require-origin-verify-secret.envsh
    - name: confd
      mountPath: /etc/nginx/conf.d
    - name: tmp
      mountPath: /tmp

service:
  enabled: true

podDisruptionBudget:
  enabled: true
  minAvailable: 1

# Expected header value. Write it to the secret store first, e.g.:
#   vault kv put secret/traefik-cloudfront-verifier/prod ORIGIN_VERIFY_SECRET=<openssl rand -hex 32>
# Every key at this path becomes an env var in the verifier container. During a rotation, also
# set ORIGIN_VERIFY_SECRET_PREVIOUS to the old value so both are accepted.
# Values are read at startup: after changing them (or the nginx config below), run
#   kubectl rollout restart deployment/traefik-cloudfront-verifier-prod
externalSecret:
  enabled: true
  secrets:
    origin-verify:
      dataFrom:
        key: secret/traefik-cloudfront-verifier/prod

configMap:
  enabled: true
  configs:
    nginx:
      data: |-
        # Sourced before envsubst. An unset value would leave a literal "${...}" in the config as a guessable value,
        # so PREVIOUS defaults to the current value when no rotation is in progress.
        05-require-origin-verify-secret.envsh: |
          case "$ORIGIN_VERIFY_SECRET" in
            "" | *[!A-Za-z0-9]*) echo "ORIGIN_VERIFY_SECRET must be set and alphanumeric" >&2; exit 1 ;;
          esac
          export ORIGIN_VERIFY_SECRET_PREVIOUS="${ORIGIN_VERIFY_SECRET_PREVIOUS:-$ORIGIN_VERIFY_SECRET}"
          case "$ORIGIN_VERIFY_SECRET_PREVIOUS" in
            *[!A-Za-z0-9]*) echo "ORIGIN_VERIFY_SECRET_PREVIOUS must be alphanumeric" >&2; exit 1 ;;
          esac
        default.conf.template: |
          server {
            listen 8080;
            server_tokens off;
            access_log off;
            default_type text/plain;
            location = /healthz { return 200 "ok\n"; }
            location / {
              if ($http_x_origin_verify = "${ORIGIN_VERIFY_SECRET}") { return 200; }
              if ($http_x_origin_verify = "${ORIGIN_VERIFY_SECRET_PREVIOUS}") { return 200; }
              return 403 "Forbidden\n";
            }
          }

customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: traefik-cloudfront-origin-verify
    spec:
      forwardAuth:
        address: 'http://{{ include "app.name" . }}.{{ include "app.namespace" . }}.svc.cluster.local:8080/'
        authRequestHeaders:
          - X-Origin-Verify
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: traefik-cloudfront-strip-header
    spec:
      headers:
        customRequestHeaders:
          X-Origin-Verify: ""
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: traefik-cloudfront-origin-guard
    spec:
      chain:
        middlewares:
          - name: traefik-cloudfront-origin-verify
          - name: traefik-cloudfront-strip-header
```

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 2
  envVariables:
    # Without this, envsubst would also replace nginx's own $variables if an env var shares the name.
    - name: NGINX_ENVSUBST_FILTER
      value: "^ORIGIN_VERIFY_"
  securityContext:
    runAsNonRoot: true
    runAsUser: 101
    seccompProfile:
      type: RuntimeDefault
  containerSecurityContext:
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop: ["ALL"]
  resources:
    requests:
      cpu: 10m
      memory: 16Mi
    limits:
      memory: 64Mi
  readinessProbe:
    httpGet:
      path: /healthz
      port: http
  livenessProbe:
    httpGet:
      path: /healthz
      port: http
  volumes:
    - name: nginx
      configMap:
        name: '{{ include "app.name" . }}-nginx'
        defaultMode: 0755
    - name: confd
      emptyDir: {}
    - name: tmp
      emptyDir: {}
  volumeMounts:
    - name: nginx
      mountPath: /etc/nginx/templates
      readOnly: true
    - name: nginx
      mountPath: /docker-entrypoint.d/05-require-origin-verify-secret.envsh
      subPath: 05-require-origin-verify-secret.envsh
    - name: confd
      mountPath: /etc/nginx/conf.d
    - name: tmp
      mountPath: /tmp

service:
  enabled: true

podDisruptionBudget:
  enabled: true
  minAvailable: 1

# Expected header value. Write it to the secret store first, e.g.:
#   vault kv put secret/traefik-cloudfront-verifier/prod ORIGIN_VERIFY_SECRET=<openssl rand -hex 32>
# Every key at this path becomes an env var in the verifier container. During a rotation, also
# set ORIGIN_VERIFY_SECRET_PREVIOUS to the old value so both are accepted.
# Values are read at startup: after changing them (or the nginx config below), run
#   kubectl rollout restart deployment/traefik-cloudfront-verifier-prod
externalSecret:
  enabled: true
  secrets:
    origin-verify:
      dataFrom:
        key: secret/traefik-cloudfront-verifier/prod

configMap:
  enabled: true
  configs:
    nginx:
      data: |-
        # Sourced before envsubst. An unset value would leave a literal "${...}" in the config as a guessable value,
        # so PREVIOUS defaults to the current value when no rotation is in progress.
        05-require-origin-verify-secret.envsh: |
          case "$ORIGIN_VERIFY_SECRET" in
            "" | *[!A-Za-z0-9]*) echo "ORIGIN_VERIFY_SECRET must be set and alphanumeric" >&2; exit 1 ;;
          esac
          export ORIGIN_VERIFY_SECRET_PREVIOUS="${ORIGIN_VERIFY_SECRET_PREVIOUS:-$ORIGIN_VERIFY_SECRET}"
          case "$ORIGIN_VERIFY_SECRET_PREVIOUS" in
            *[!A-Za-z0-9]*) echo "ORIGIN_VERIFY_SECRET_PREVIOUS must be alphanumeric" >&2; exit 1 ;;
          esac
        default.conf.template: |
          server {
            listen 8080;
            server_tokens off;
            access_log off;
            default_type text/plain;
            location = /healthz { return 200 "ok\n"; }
            location / {
              if ($http_x_origin_verify = "${ORIGIN_VERIFY_SECRET}") { return 200; }
              if ($http_x_origin_verify = "${ORIGIN_VERIFY_SECRET_PREVIOUS}") { return 200; }
              return 403 "Forbidden\n";
            }
          }

customResourcesMap:
  origin-verify: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: traefik-cloudfront-origin-verify
    spec:
      forwardAuth:
        address: 'http://{{ include "app.name" . }}.{{ include "app.namespace" . }}.svc.cluster.local:8080/'
        authRequestHeaders:
          - X-Origin-Verify
  strip-header: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: traefik-cloudfront-strip-header
    spec:
      headers:
        customRequestHeaders:
          X-Origin-Verify: ""
  origin-guard: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: traefik-cloudfront-origin-guard
    spec:
      chain:
        middlewares:
          - name: traefik-cloudfront-origin-verify
          - name: traefik-cloudfront-strip-header
```

</TabItem>
</Tabs>

The three middlewares are what protected apps use:

- `traefik-cloudfront-origin-verify` calls the verifier and forwards **only** `X-Origin-Verify`, so cookies and authorization headers never reach it.
- `traefik-cloudfront-strip-header` deletes `X-Origin-Verify` once the check has passed.
- `traefik-cloudfront-origin-guard` chains the two, check first and strip second. Protected apps reference only this one.

:::caution The verifier reads the secret at startup
Changing the value in your secret store, or editing the nginx config, doesn't affect pods that are already running. Restart the verifier afterwards, either with the **Restart** action on the `traefik-cloudfront-verifier-prod` Deployment in ArgoCD, or with kubectl (needs the Debugger tier, see [Access tiers](../access-cluster-with-kubectl#access-tiers)):

```bash
kubectl rollout restart deployment/traefik-cloudfront-verifier-prod -n CAPTAIN_NAMESPACE
```
:::

## Step 3 — Protect an application

Point the application's route at the guard middleware. Nothing else about the app changes.

<Tabs>
<TabItem value="ingressroute" label="IngressRoute (CRD)">

**`apps/traefik-cloudfront/envs/prod/values.yaml`**
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

</TabItem>
<TabItem value="ingress" label="Standard Ingress">

**`apps/traefik-ingress-cloudfront/envs/prod/values.yaml`**
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

The annotation format is `<namespace>-<middleware name>@kubernetescrd`. Annotations are not template-rendered, so write the namespace out in full.

</TabItem>
</Tabs>

:::warning Every route to the app needs the middleware
Protection is per route. Any other IngressRoute or Ingress that points at the same Service without the guard is a way around CloudFront. Put the middleware on every hostname the app answers on.
:::

## Step 4 — Configure CloudFront

Create a distribution with these settings. Use the protected app's own hostname as the origin, so Traefik's `Host()` rule matches and the cluster's wildcard certificate is valid for it.

| Setting | Value |
|---|---|
| Origin domain | `traefik-cloudfront-prod.apps.CAPTAIN_DOMAIN` |
| Protocol | **HTTPS only**, minimum TLSv1.2 — over HTTP the secret header crosses the internet in plain text |
| Add custom header | Name `X-Origin-Verify`, value from Step 1 |
| Cache policy | `CachingDisabled`, or your own policy (see Key Points) |
| Origin request policy | `AllViewerExceptHostHeader` |
| Viewer protocol policy | Redirect HTTP to HTTPS |

If you test with an HTTP-only origin, treat the secret as exposed and rotate it afterwards.

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
  default = "traefik-cloudfront-prod.apps.CAPTAIN_DOMAIN"
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

Pass the secret through an environment variable (`TF_VAR_origin_verify_secret`) rather than a file in Git. The value is still stored in the OpenTofu state, so keep the state somewhere private.

## What Gets Created

| Resource | Name | Purpose |
|---|---|---|
| Deployment + Service | `traefik-cloudfront-verifier-<env>` | nginx that answers `200` or `403`; 2 replicas |
| PodDisruptionBudget | `traefik-cloudfront-verifier-<env>` | Keeps one verifier running during node maintenance |
| ConfigMap | `traefik-cloudfront-verifier-<env>-nginx` | nginx config template and the startup check |
| ExternalSecret | `traefik-cloudfront-verifier-<env>-origin-verify` | Injects `ORIGIN_VERIFY_SECRET` as an environment variable |
| Middleware | `traefik-cloudfront-origin-verify` | forwardAuth to the verifier |
| Middleware | `traefik-cloudfront-strip-header` | Removes the header before your app |
| Middleware | `traefik-cloudfront-origin-guard` | The chain protected apps reference |

The `-prod` suffix comes from the environment folder name (`envs/prod/`).

## Verify

Through CloudFront, the app answers normally:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<distribution>.cloudfront.net/
# 200
```

Straight to the origin, without the header, it's refused:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://traefik-cloudfront-prod.apps.CAPTAIN_DOMAIN/
# 403

curl -s -o /dev/null -w "%{http_code}\n" -H "X-Origin-Verify: guess" https://traefik-cloudfront-prod.apps.CAPTAIN_DOMAIN/
# 403
```

The example apps run `traefik/whoami`, which echoes the request headers it receives. Through CloudFront, `X-Origin-Verify` should **not** appear in its output.

Confirm the middlewares and verifier pods exist in your namespace:

```bash
kubectl get middleware,pods -n CAPTAIN_NAMESPACE | grep cloudfront
```

Use the response code to tell the outcomes apart:

| Request | Response | Meaning | Fix |
|---|---|---|---|
| Direct to origin | `403` | Working — the origin is protected | — |
| Direct to origin | `200` | The route has no guard middleware. **The app is public.** | Add the middleware or annotation; confirm the sync completed |
| Any | `404` | The middleware reference doesn't resolve, or the `Host` doesn't match the route | Check the name and namespace prefix against `kubectl get middleware -n CAPTAIN_NAMESPACE`; check the origin request policy |
| Through CloudFront | `502` | CloudFront can't connect: the origin certificate doesn't match the hostname it sends, or the origin is unreachable | Use `AllViewerExceptHostHeader`; set the origin domain to the app's own hostname |
| Any | `500` | The verifier has no ready pods | `kubectl get pods -n CAPTAIN_NAMESPACE`; check the ExternalSecret synced |
| Through CloudFront | `403` | CloudFront's header value doesn't match the secret store — or a rotation's step 3 ran before every distribution was updated | Compare the values; restart the verifier after changing the secret |

## Rotating the secret

The verifier accepts two values — `ORIGIN_VERIFY_SECRET` and, during a rotation, `ORIGIN_VERIFY_SECRET_PREVIOUS` — so you can change the secret without rejecting any requests:

1. Generate a new value. In your secret store, set `ORIGIN_VERIFY_SECRET_PREVIOUS` to the **current** value and `ORIGIN_VERIFY_SECRET` to the **new** one. Restart the verifier. It now accepts both.
2. Update the custom header value on **every** distribution that uses this verifier, and wait until each one shows **Deployed**.
3. Delete `ORIGIN_VERIFY_SECRET_PREVIOUS` from your secret store and restart the verifier again. Only the new value is accepted from now on.

Check that the old value is still accepted before step 2, and refused after step 3:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "X-Origin-Verify: <old value>" https://traefik-cloudfront-prod.apps.CAPTAIN_DOMAIN/
# 200 during the rotation, 403 after step 3
```

:::caution
Don't do step 3 until every distribution has finished deploying the new value. Any distribution still sending the old value gets `403` once it's removed.
:::

## Key Points

- This blocks requests that bypass CloudFront. It's a shared secret, not user authentication — combine it with [Login with GitHub](./traefik-middleware-forwardauth-github) or your app's own login if you need to know who the visitor is.
- Protection is per route, and failures are closed (`404` for a bad reference, `500` for a missing verifier). The only way to leave an app public is a route without `traefik-cloudfront-origin-guard`.
- One verifier can protect any number of apps in the same namespace, and any number of distributions that send the same value.
- CloudFront replaces any `X-Origin-Verify` a visitor sends with its own value, so visitors can't spoof it through CloudFront.
- The platform's Traefik access logs drop request headers, and the verifier's own access log is off, so the secret isn't logged. Don't enable header logging on either.
- Turn caching back on only for content that's safe to cache. `CachingDisabled` also keeps CloudFront from caching an error page while you're setting up.

## Related

- [Middleware: Login with GitHub (Forward Auth)](./traefik-middleware-forwardauth-github) — the same forwardAuth pattern, for user login
- [Middleware: IP Allow List](./traefik-middleware-ip-allowlist) — restricting by source IP
- [Standard Kubernetes Ingress](./traefik-standard-ingress) — middleware annotations on standard Ingress
- [Manage Environment Secrets](../manage-environment-secrets) — storing the secret
