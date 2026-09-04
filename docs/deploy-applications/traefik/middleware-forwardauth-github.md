---
id: traefik-middleware-forwardauth-github
title: "Middleware: Login with GitHub (Forward Auth)"
description: "Put a GitHub login in front of any application using your own OAuth App, oauth2-proxy, and Traefik forwardAuth."
---

# Middleware: Login with GitHub (Forward Auth)

Put a login screen in front of any application, so only members of **your** GitHub organization can reach it. You deploy one small auth proxy, and each application you want to protect opts in with a single annotation.

This uses **your own** GitHub OAuth App. It is independent of the GitHub login you use for ArgoCD and other platform pages — your users, your organization, your access policy.

## How it works

Traefik asks the auth proxy about every request before forwarding it:

1. A request arrives for your application.
2. Traefik calls oauth2-proxy's `/oauth2/auth` endpoint (**forwardAuth**).
3. If the request has a valid session, oauth2-proxy returns `202` and Traefik forwards it to your app, adding the user's identity as request headers.
4. If not, oauth2-proxy returns `401`, and a middleware turns that into a redirect to GitHub to sign in.

The session lives in a cookie scoped to a parent domain, which is why one auth proxy can cover every app under `*.apps.CAPTAIN_DOMAIN`.

## Prerequisites

- An application already deployed and reachable — see [Standard Kubernetes Ingress](./traefik-standard-ingress).
- Permission to create an OAuth App in your GitHub organization.
- Write access to your environment's secret store — see [Manage Environment Secrets](../manage-environment-secrets).

Domains and namespaces throughout this guide fill in from the **Captain Domain** box in the navigation bar. Set it to your [captain domain](../../glueops-captain-domain) and every example below matches your environment. Your environment namespace is the first label of that domain — for `nonprod.example.onglueops.com`, the namespace is `nonprod`.

## Step 1 — Register a GitHub OAuth App

Create the app **in your organization**, not on a personal account. An org-owned app survives people leaving, and if your org enables third-party application restrictions it is trusted automatically instead of needing approval.

Go to `https://github.com/organizations/YOUR_ORG/settings/applications/new`:

| Field | Value |
|---|---|
| Application name | `oauth2-proxy` |
| Homepage URL | `https://oauth2.apps.CAPTAIN_DOMAIN` |
| Authorization callback URL | `https://oauth2.apps.CAPTAIN_DOMAIN/oauth2/callback` |
| Enable Device Flow | leave unchecked |

Click **Register application**, copy the **Client ID**, then **Generate a new client secret** and copy it immediately — GitHub shows it only once.

:::caution
The callback URL must match `OAUTH2_PROXY_REDIRECT_URL` in Step 3 exactly — same scheme, same host, no trailing slash. A mismatch fails at the very end of the login flow with a redirect URI error.
:::

## Step 2 — Store the credentials

Generate a cookie secret. oauth2-proxy accepts only 16, 24, or 32-byte values:

```bash
openssl rand -base64 32 | tr -- '+/' '-_'
```

In your secret store, create the path `oauth2-proxy/<environment>` with these three keys:

```
OAUTH2_PROXY_CLIENT_ID       <client ID from Step 1>
OAUTH2_PROXY_CLIENT_SECRET   <client secret from Step 1>
OAUTH2_PROXY_COOKIE_SECRET   <output of the command above>
```

:::warning
These key names become environment variables verbatim — `dataFrom` injects the whole path with `envFrom`. A misspelled key is not an error: oauth2-proxy simply never sees the value and fails to start or refuses every login.
:::

## Step 3 — Deploy the auth proxy

Create a new application directory, `apps/oauth2-proxy/`.

**`base/base-values.yaml`**
```yaml
image:
  registry: quay.io
  repository: oauth2-proxy/oauth2-proxy
  tag: v7.15.3
  port: 4180
```

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">

**`envs/prod/values.yaml`**
```yaml
externalSecret:
  enabled: true
  secrets:
    app:
      dataFrom:
        key: secret/oauth2-proxy/prod

service:
  enabled: true

deployment:
  enabled: true
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
  envVariables:
    - name: OAUTH2_PROXY_PROVIDER
      value: "github"
    - name: OAUTH2_PROXY_GITHUB_ORG
      value: "YOUR_ORG"
    - name: OAUTH2_PROXY_SCOPE
      value: "user:email read:org"
    - name: OAUTH2_PROXY_UPSTREAMS
      value: "static://204"
    - name: OAUTH2_PROXY_HTTP_ADDRESS
      value: "0.0.0.0:4180"
    - name: OAUTH2_PROXY_REVERSE_PROXY
      value: "true"
    - name: OAUTH2_PROXY_SET_XAUTHREQUEST
      value: "true"
    - name: OAUTH2_PROXY_REDIRECT_URL
      value: "https://oauth2.apps.CAPTAIN_DOMAIN/oauth2/callback"
    - name: OAUTH2_PROXY_COOKIE_DOMAINS
      value: ".apps.CAPTAIN_DOMAIN"
    - name: OAUTH2_PROXY_WHITELIST_DOMAINS
      value: ".apps.CAPTAIN_DOMAIN"
    - name: OAUTH2_PROXY_COOKIE_SECURE
      value: "true"
    - name: OAUTH2_PROXY_COOKIE_CSRF_PER_REQUEST
      value: "true"
    - name: OAUTH2_PROXY_EMAIL_DOMAINS
      value: "*"

ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: 'oauth2.apps.{{ .Values.captain_domain }}'

customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-ssl-redirect
    spec:
      redirectScheme:
        scheme: https
        permanent: true
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-forwardauth
    spec:
      forwardAuth:
        address: https://oauth2.apps.{{ .Values.captain_domain }}/oauth2/auth
        trustForwardHeader: true
        authResponseHeaders:
          - authorization
          - x-auth-request-user
          - x-auth-request-email
          - x-auth-request-access-token
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-errors-redirect
    spec:
      plugin:
        redirectErrors:
          status: ["401-403"]
          target: "https://oauth2.apps.{{ .Values.captain_domain }}/oauth2/start?rd={url}"
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-with-redirect
    spec:
      chain:
        middlewares:
          - name: oauth2-apps-ssl-redirect
          - name: oauth2-apps-errors-redirect
          - name: oauth2-apps-forwardauth
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-no-redirect
    spec:
      chain:
        middlewares:
          - name: oauth2-apps-ssl-redirect
          - name: oauth2-apps-forwardauth
```

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`envs/prod/values.yaml`**
```yaml
externalSecret:
  enabled: true
  secrets:
    app:
      dataFrom:
        key: secret/oauth2-proxy/prod

service:
  enabled: true

deployment:
  enabled: true
  replicas: 2
  envVariables:
    - name: OAUTH2_PROXY_PROVIDER
      value: "github"
    - name: OAUTH2_PROXY_GITHUB_ORG
      value: "YOUR_ORG"
    - name: OAUTH2_PROXY_SCOPE
      value: "user:email read:org"
    - name: OAUTH2_PROXY_UPSTREAMS
      value: "static://204"
    - name: OAUTH2_PROXY_HTTP_ADDRESS
      value: "0.0.0.0:4180"
    - name: OAUTH2_PROXY_REVERSE_PROXY
      value: "true"
    - name: OAUTH2_PROXY_SET_XAUTHREQUEST
      value: "true"
    - name: OAUTH2_PROXY_REDIRECT_URL
      value: "https://oauth2.apps.CAPTAIN_DOMAIN/oauth2/callback"
    - name: OAUTH2_PROXY_COOKIE_DOMAINS
      value: ".apps.CAPTAIN_DOMAIN"
    - name: OAUTH2_PROXY_WHITELIST_DOMAINS
      value: ".apps.CAPTAIN_DOMAIN"
    - name: OAUTH2_PROXY_COOKIE_SECURE
      value: "true"
    - name: OAUTH2_PROXY_COOKIE_CSRF_PER_REQUEST
      value: "true"
    - name: OAUTH2_PROXY_EMAIL_DOMAINS
      value: "*"

ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: 'oauth2.apps.{{ .Values.captain_domain }}'

customResourcesMap:
  ssl-redirect: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-ssl-redirect
    spec:
      redirectScheme:
        scheme: https
        permanent: true
  forwardauth: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-forwardauth
    spec:
      forwardAuth:
        address: https://oauth2.apps.{{ .Values.captain_domain }}/oauth2/auth
        trustForwardHeader: true
        authResponseHeaders:
          - authorization
          - x-auth-request-user
          - x-auth-request-email
          - x-auth-request-access-token
  errors-redirect: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-errors-redirect
    spec:
      plugin:
        redirectErrors:
          status: ["401-403"]
          target: "https://oauth2.apps.{{ .Values.captain_domain }}/oauth2/start?rd={url}"
  with-redirect: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-with-redirect
    spec:
      chain:
        middlewares:
          - name: oauth2-apps-ssl-redirect
          - name: oauth2-apps-errors-redirect
          - name: oauth2-apps-forwardauth
  no-redirect: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: oauth2-apps-no-redirect
    spec:
      chain:
        middlewares:
          - name: oauth2-apps-ssl-redirect
          - name: oauth2-apps-forwardauth
```

</TabItem>
</Tabs>

:::warning Write the domain out in full in the environment variables
Values under `deployment.envVariables` are **not** template-rendered, unlike `ingress` hostnames and `customResources`, which are. Writing `{{ .Values.captain_domain }}` in an environment variable passes that text to oauth2-proxy unchanged, and every login silently redirect-loops. Type the domain out in full, and check it matches the ingress hostname above it.
:::

## Step 4 — Protect an application

Add one annotation to the application you want to protect. Nothing else about it changes.

**`apps/my-app/envs/prod/values.yaml`**
```yaml
ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      annotations:
        traefik.ingress.kubernetes.io/router.middlewares: CAPTAIN_NAMESPACE-oauth2-apps-with-redirect@kubernetescrd
      hosts:
        - hostname: '{{ include "app.name" $ }}.apps.{{ .Values.captain_domain }}'
```

The annotation format is `<namespace>-<middleware name>@kubernetescrd`. Annotations are not template-rendered either, so write the namespace out in full.

:::caution Get the annotation exactly right, or the route breaks
If any part of the reference is wrong — the name, the namespace, or the `@kubernetescrd` suffix — Traefik cannot resolve the middleware and stops serving the route entirely, returning **404**. Your application becomes unreachable rather than unprotected, so a typo is loud rather than dangerous.

The case that *does* leave an application public is **forgetting the annotation altogether**. Always confirm with the check below.
:::

## What Gets Created

| Resource | Name | Purpose |
|---|---|---|
| Deployment + Service | `oauth2-proxy-<env>` | Answers `/oauth2/auth`; has no backend of its own |
| Ingress | `oauth2.apps.CAPTAIN_DOMAIN` | Where browsers complete the GitHub login |
| ExternalSecret | `oauth2-proxy-<env>-app` | Injects the three credentials as environment variables |
| Middleware | `oauth2-apps-ssl-redirect` | Forces HTTPS before authenticating |
| Middleware | `oauth2-apps-forwardauth` | Asks oauth2-proxy about each request |
| Middleware | `oauth2-apps-errors-redirect` | Turns `401` into a redirect to GitHub |
| Middleware | `oauth2-apps-with-redirect` | The chain browsers use |
| Middleware | `oauth2-apps-no-redirect` | The chain APIs use — returns `401` instead of redirecting |

## Verify

The auth proxy answers health checks:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://oauth2.apps.CAPTAIN_DOMAIN/ping
# 200
```

A protected app redirects an unauthenticated visitor to sign in:

```bash
curl -sI https://my-app-prod.apps.CAPTAIN_DOMAIN | grep -E "HTTP|location"
# HTTP/2 302
# location: https://oauth2.apps.CAPTAIN_DOMAIN/oauth2/start?rd=https%3A%2F%2Fmy-app-prod.apps...
```

Following that redirect should reach `github.com/login/oauth/authorize` carrying your client ID. Confirm the middlewares exist in your namespace:

```bash
kubectl get middleware -n CAPTAIN_NAMESPACE
```

Use the response code to tell the three outcomes apart:

| Response | Meaning | Fix |
|---|---|---|
| `302` to `oauth2.apps.CAPTAIN_DOMAIN` | Working — the app is protected | — |
| `200` | The annotation is missing or was never applied. **The app is public.** | Add the annotation; confirm the sync completed |
| `404` | The annotation is present but its reference does not resolve, so Traefik dropped the route | Check the name, the namespace prefix, and the `@kubernetescrd` suffix against `kubectl get middleware -n CAPTAIN_NAMESPACE` |

## Protecting apps on a custom domain

The session cookie is scoped to `.apps.CAPTAIN_DOMAIN`, so browsers only send it to hosts beneath that domain. An application on your own domain needs **its own oauth2-proxy instance**:

- Deploy a second copy, for example at `auth.example.com`, with `OAUTH2_PROXY_COOKIE_DOMAINS` and `OAUTH2_PROXY_WHITELIST_DOMAINS` set to `.example.com` and `OAUTH2_PROXY_REDIRECT_URL` pointing at that host.
- Give its middlewares a different prefix — `oauth2-example-*` rather than `oauth2-apps-*`. All your applications share one namespace, so unprefixed names collide as soon as a second domain appears.
- Add a certificate for the auth host with `cert-manager.io/cluster-issuer: letsencrypt-public-traefik` on its ingress. Hosts under `CAPTAIN_DOMAIN` are covered by a wildcard certificate automatically; your own domain is not. See [Custom Domain Certificates](../custom-domain-certificates/custom-domains-overview).

You do **not** need a second GitHub OAuth App. A single OAuth App accepts up to 10 authorization callback URLs — open its settings, click **Add callback URL**, and add `https://auth.example.com/oauth2/callback` alongside the first one.

## Browser applications and APIs

Use `oauth2-apps-with-redirect` for anything people visit in a browser: unauthenticated requests are sent to GitHub to sign in.

Use `oauth2-apps-no-redirect` for endpoints called by scripts and CI. It returns a plain `401` instead of a redirect, which is what a non-browser client can actually handle. It is also the chain to fall back to if the `redirectErrors` plugin is ever unavailable — users then see a `401` rather than a login page, but access control still holds.

## Key Points

- Values under `deployment.envVariables` are **not** templated; `ingress` hostnames and `customResources` **are**. This asymmetry is the most common cause of a broken setup — write the captain domain out literally in environment variables.
- `OAUTH2_PROXY_UPSTREAMS: "static://204"` is deliberate. This proxy authenticates but serves nothing; your traffic never passes through it, so it is not a bottleneck.
- `read:org` scope is required in addition to `user:email`, otherwise the organization membership check cannot run and every login is rejected.
- Access is controlled by `OAUTH2_PROXY_GITHUB_ORG`. Add `OAUTH2_PROXY_GITHUB_TEAM` to narrow it further to specific teams.
- Middleware names are shared across every application in your namespace. Prefix them per domain from the start — renaming later means editing every protected application's annotation.
- A malformed annotation fails **closed**: Traefik drops the route and returns `404` rather than serving the application unprotected. The only way to leave an app public is to omit the annotation entirely.
- Changing `OAUTH2_PROXY_COOKIE_SECRET` signs everyone out immediately.
- `OAUTH2_PROXY_REVERSE_PROXY: "true"` makes oauth2-proxy trust `X-Forwarded-*` headers from any source. That is safe here because Traefik is the only route into your application, but do not expose the proxy through another path.

## Related

- [Standard Kubernetes Ingress](./traefik-standard-ingress) — the ingress this builds on
- [Middleware: Basic Auth](./traefik-middleware-basicauth) — a simpler shared-password alternative
- [Manage Environment Secrets](../manage-environment-secrets) — storing the credentials
- [Custom Domain Certificates](../custom-domain-certificates/custom-domains-overview) — certificates for your own domains
