---
id: registry-ecr
title: "AWS ECR"
---

# Pull Images from AWS ECR

Deploy applications whose images live in a **private Amazon ECR** repository. ECR is different from other registries: its registry tokens **expire every 12 hours**, so a static credential in the vault would stop working half a day later. Instead, the platform's external-secrets operator exchanges a long-lived (narrowly-scoped) IAM credential for a fresh ECR token on a schedule, using the [`ECRAuthorizationToken` generator](https://external-secrets.io/latest/api/generator/ecr/).

## How it works

1. You create a scoped IAM credential in **your** AWS account that can only pull from your ECR repositories.
2. You store the key pair in your environment's vault; an ExternalSecret syncs it into your app's namespace.
3. An `ECRAuthorizationToken` generator plus a second ExternalSecret (deployed through the app chart's `customResourcesMap`) exchange it for a fresh registry token every few hours and maintain the image pull secret your pods use.

The token generator and the pull-secret ExternalSecret are always deployed through the chart's **`customResourcesMap`** passthrough (not the built-in `externalSecret:` block). The built-in block prefixes secret names (`<app-name>-<key>`) and produces `Opaque` secrets — but a Kubernetes image pull secret must have a **fixed name** and the **`kubernetes.io/dockerconfigjson`** type, which only the raw manifest gives you.

:::note Which namespace?
The `namespace: {{ include "app.namespace" $ }}` field in the manifests below resolves to your environment's namespace automatically — the **first label of your cluster's [captain domain](/glueops-captain-domain)** (the namespace is `prod` on a cluster reached at `prod.<tenant>.onglueops.com`, `nonprod` at `nonprod.<tenant>.onglueops.com`, and so on). It is never hardcoded to `prod` — leave the `include` expression as-is and it works on every cluster.
:::

## Choosing a pattern

Pick the pattern that matches how your cluster is laid out:

| Pattern | Use when | Pull secret |
|---------|----------|-------------|
| [Per-app pull secret](#per-app-pull-secret) | One app (or a few) pulls from ECR and each app manages its own credential | `<app-name>-registry-cred`, defined inside the app |
| [One shared pull secret for the cluster](#one-shared-pull-secret-for-the-cluster) | Many apps share a namespace (or a single AWS account / ECR serves every app) | one `ecr-regcred`, created once per namespace by a dedicated app |
| [One pull secret per environment](#one-pull-secret-per-environment) | Each environment is a **separate namespace** with its own AWS account / ECR | one `ecr-regcred` per environment namespace |

All three use the same `ECRAuthorizationToken` → ExternalSecret chain; they differ only in **who owns the pull secret** and **how many** there are.

## Per-app pull secret

Each application defines its own ECR pull secret, named `<app-name>-registry-cred`. Use this when only one or a handful of apps pull from ECR and you want the credential to live alongside the app.

### Step 1 — Create a scoped IAM credential (your AWS account)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "ecr:GetAuthorizationToken", "Resource": "*" },
    { "Effect": "Allow",
      "Action": ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"],
      "Resource": "arn:aws:ecr:YOUR_REGION:YOUR_ACCOUNT_ID:repository/my-app*" }
  ]
}
```

Attach it to a dedicated IAM user (e.g. `image-pull-my-app`) and create an access key.

### Step 2 — Upload the key pair to your vault

In your environment's OpenBao/Vault UI (see [Managing Environment Secrets](/deploy-applications/manage-environment-secrets)), create a secret at a dedicated path:

- Path: `secret/<your-app>-ecr-iam`
- Key `access_key_id`: the Access Key ID
- Key `secret_access_key`: the Secret Access Key

### Step 3 — Configure your application values

**`base/base-values.yaml`**

```yaml
image:
  registry: YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com
  repository: my-app
  tag: v1.0.0
  port: 8080
  pullSecrets: my-app-registry-cred   # maintained by the ExternalSecret below
```

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
    ecr-iam:                           # creates Secret <app-name>-ecr-iam
      data:
        access-key-id:
          remoteRef:
            key: secret/<your-app>-ecr-iam
            property: access_key_id
        secret-access-key:
          remoteRef:
            key: secret/<your-app>-ecr-iam
            property: secret_access_key

customResourcesMap:
  ecr-token-generator: |
    apiVersion: generators.external-secrets.io/v1alpha1
    kind: ECRAuthorizationToken
    metadata:
      name: my-app-ecr-token
      namespace: {{ include "app.namespace" $ }}
    spec:
      region: YOUR_REGION
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: my-app-ecr-iam
            key: access-key-id
          secretAccessKeySecretRef:
            name: my-app-ecr-iam
            key: secret-access-key
  ecr-pull-secret: |
    apiVersion: external-secrets.io/v1
    kind: ExternalSecret
    metadata:
      name: my-app-registry-cred
      namespace: {{ include "app.namespace" $ }}
    spec:
      refreshInterval: 6h              # well inside the 12h token lifetime
      target:
        name: my-app-registry-cred
        template:
          type: kubernetes.io/dockerconfigjson
          data:
            .dockerconfigjson: |
              {
                "auths": {
                  "{{ `{{ .proxy_endpoint }}` }}": {
                    "username": "{{ `{{ .username }}` }}",
                    "password": "{{ `{{ .password }}` }}",
                    "auth": "{{ `{{ printf "%s:%s" .username .password | b64enc }}` }}"
                  }
                }
              }
      dataFrom:
        - sourceRef:
            generatorRef:
              apiVersion: generators.external-secrets.io/v1alpha1
              kind: ECRAuthorizationToken
              name: my-app-ecr-token
```

Replace `my-app` with your application's name throughout (the first ExternalSecret's target is automatically named `<app-name>-ecr-iam`).

:::caution Why the double braces?
Everything inside `customResourcesMap` is rendered by Helm first, but the `.dockerconfigjson` template lines belong to **external-secrets' own** template engine. The `` {{ `...` }} `` wrappers make Helm emit those placeholders literally so external-secrets can process them. Keep them exactly as shown. This escaping is identical in all three patterns on this page.
:::

### Step 4 — Deploy and verify

Commit the values to your deployment-configurations repository and wait for Argo CD to sync (or click **Sync**). In the resource tree you'll see both ExternalSecrets and the `ECRAuthorizationToken`; when they're **Healthy**, the pull secret exists and the application pod starts normally. The token refreshes itself every 6 hours from then on — nothing to renew manually.

See [Troubleshooting](#troubleshooting) if the pod shows `ImagePullBackOff`.

## One shared pull secret for the cluster

When many apps share a namespace — or a single AWS account / ECR serves every app — you don't want each app carrying its own credential. Instead, a **dedicated, workload-less app** creates exactly one pull secret named `ecr-regcred` per namespace, and every other app references it by that fixed name.

**Design:** an app `apps/aws-ecr-iam/` that runs no workloads. Its only job is to render the full chain once per namespace:

| Resource | Name | Purpose |
|----------|------|---------|
| `ExternalSecret` | `aws-ecr-iam-creds` | Pulls the AWS key pair from the vault |
| `ECRAuthorizationToken` | `ecr-regcred-token` | Mints a short-lived ECR token from those keys |
| `ExternalSecret` | `ecr-regcred` | Builds the `kubernetes.io/dockerconfigjson` pull secret |

Because it's one release in one namespace, the fixed names never collide, and every other app can pull with **no per-app config**.

### Step 1 — Create a scoped IAM credential (your AWS account)

Same as the per-app pattern, but scope the pull actions to **every** repository your apps use (not just one):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "ecr:GetAuthorizationToken", "Resource": "*" },
    { "Effect": "Allow",
      "Action": ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"],
      "Resource": "arn:aws:ecr:YOUR_REGION:YOUR_ACCOUNT_ID:repository/*" }
  ]
}
```

### Step 2 — Upload the key pair to your vault

Store the AWS keys once, at a shared path:

- Path: `secret/aws-ecr-iam/creds`
- Key `access_key_id`: the Access Key ID
- Key `secret_access_key`: the Secret Access Key

### Step 3 — Add the `aws-ecr-iam` app

**`apps/aws-ecr-iam/base/base-values.yaml`**

```yaml
appName: aws-ecr-iam

# This app owns nothing but the cluster's shared ecr-regcred pull secret.
service:
  enabled: false
deployment:
  enabled: false
cronJob:
  enabled: false
job:
  enabled: false

customResourcesMap:
  aws-creds: |
    apiVersion: external-secrets.io/v1
    kind: ExternalSecret
    metadata:
      name: aws-ecr-iam-creds
      namespace: {{ include "app.namespace" $ }}
    spec:
      refreshInterval: 1h
      secretStoreRef:
        kind: ClusterSecretStore
        name: vault-backend
      target:
        name: aws-ecr-iam-creds
        creationPolicy: Owner
      data:
        - secretKey: access_key_id
          remoteRef:
            key: secret/aws-ecr-iam/creds
            property: access_key_id
        - secretKey: secret_access_key
          remoteRef:
            key: secret/aws-ecr-iam/creds
            property: secret_access_key
  ecr-token-generator: |
    apiVersion: generators.external-secrets.io/v1alpha1
    kind: ECRAuthorizationToken
    metadata:
      name: ecr-regcred-token
      namespace: {{ include "app.namespace" $ }}
    spec:
      region: YOUR_REGION
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-ecr-iam-creds
            key: access_key_id
          secretAccessKeySecretRef:
            name: aws-ecr-iam-creds
            key: secret_access_key
  ecr-pull-secret: |
    apiVersion: external-secrets.io/v1
    kind: ExternalSecret
    metadata:
      name: ecr-regcred
      namespace: {{ include "app.namespace" $ }}
    spec:
      refreshInterval: 6h              # well inside the 12h token lifetime
      target:
        name: ecr-regcred
        creationPolicy: Owner
        template:
          type: kubernetes.io/dockerconfigjson
          data:
            .dockerconfigjson: |
              {
                "auths": {
                  "{{ `{{ .proxy_endpoint }}` }}": {
                    "username": "{{ `{{ .username }}` }}",
                    "password": "{{ `{{ .password }}` }}",
                    "auth": "{{ `{{ printf "%s:%s" .username .password | b64enc }}` }}"
                  }
                }
              }
      dataFrom:
        - sourceRef:
            generatorRef:
              apiVersion: generators.external-secrets.io/v1alpha1
              kind: ECRAuthorizationToken
              name: ecr-regcred-token
```

`apps/aws-ecr-iam/envs/prod/values.yaml` is intentionally empty (`{}`) — all config lives in `base`.

:::info Pinning `appName`
`appName: aws-ecr-iam` keeps the release's resource names deterministic (`aws-ecr-iam-creds`) regardless of environment, so the `ECRAuthorizationToken` can reference the creds secret by a static name.
:::

### Step 4 — Point every app at `ecr-regcred`

In `common/common-values.yaml` (merged into every app), set the shared pull secret once:

```yaml
image:
  pullSecrets: ecr-regcred
```

Any workload in a namespace that contains a secret named `ecr-regcred` now pulls private ECR images with no further configuration. Individual apps can still override `image.pullSecrets` if they need a different credential.

## One pull secret per environment

When each environment is a **separate namespace (or cluster) with its own AWS account / ECR**, `prod` and `stage` need *different* credentials. Use the same dedicated-app design as above, but move the per-environment scalars — the vault path and region — into each environment's values file so the chain stays DRY in `base`.

:::warning Requires isolated namespaces
This pattern only works when each environment's release lands in **its own namespace** — which in GlueOps normally means each environment is a **separate cluster with its own captain domain**, so its namespace is that domain's first label (`prod`, `stage`, …). If two environments resolve to the **same** namespace, both releases write the same fixed-name `ecr-regcred` and will fight over ownership. In that case use the [shared](#one-shared-pull-secret-for-the-cluster) pattern instead.
:::

**Vault:** per-environment paths, e.g. `secret/aws-ecr-iam/prod/creds` and `secret/aws-ecr-iam/stage/creds`, each with `access_key_id` and `secret_access_key`.

**`apps/aws-ecr-iam/base/base-values.yaml`** — the chain, parameterized with `.Values.ecr.*`:

```yaml
appName: aws-ecr-iam

service:
  enabled: false
deployment:
  enabled: false
cronJob:
  enabled: false
job:
  enabled: false

customResourcesMap:
  aws-creds: |
    apiVersion: external-secrets.io/v1
    kind: ExternalSecret
    metadata:
      name: aws-ecr-iam-creds
      namespace: {{ include "app.namespace" $ }}
    spec:
      refreshInterval: 1h
      secretStoreRef:
        kind: ClusterSecretStore
        name: vault-backend
      target:
        name: aws-ecr-iam-creds
        creationPolicy: Owner
      data:
        - secretKey: access_key_id
          remoteRef:
            key: {{ .Values.ecr.vaultPath }}
            property: access_key_id
        - secretKey: secret_access_key
          remoteRef:
            key: {{ .Values.ecr.vaultPath }}
            property: secret_access_key
  ecr-token-generator: |
    apiVersion: generators.external-secrets.io/v1alpha1
    kind: ECRAuthorizationToken
    metadata:
      name: ecr-regcred-token
      namespace: {{ include "app.namespace" $ }}
    spec:
      region: {{ .Values.ecr.region }}
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-ecr-iam-creds
            key: access_key_id
          secretAccessKeySecretRef:
            name: aws-ecr-iam-creds
            key: secret_access_key
  ecr-pull-secret: |
    apiVersion: external-secrets.io/v1
    kind: ExternalSecret
    metadata:
      name: ecr-regcred
      namespace: {{ include "app.namespace" $ }}
    spec:
      refreshInterval: 6h
      target:
        name: ecr-regcred
        creationPolicy: Owner
        template:
          type: kubernetes.io/dockerconfigjson
          data:
            .dockerconfigjson: |
              {
                "auths": {
                  "{{ `{{ .proxy_endpoint }}` }}": {
                    "username": "{{ `{{ .username }}` }}",
                    "password": "{{ `{{ .password }}` }}",
                    "auth": "{{ `{{ printf "%s:%s" .username .password | b64enc }}` }}"
                  }
                }
              }
      dataFrom:
        - sourceRef:
            generatorRef:
              apiVersion: generators.external-secrets.io/v1alpha1
              kind: ECRAuthorizationToken
              name: ecr-regcred-token
```

**`apps/aws-ecr-iam/envs/prod/values.yaml`**

```yaml
ecr:
  region: YOUR_PROD_REGION
  vaultPath: secret/aws-ecr-iam/prod/creds
```

**`apps/aws-ecr-iam/envs/stage/values.yaml`**

```yaml
ecr:
  region: YOUR_STAGE_REGION
  vaultPath: secret/aws-ecr-iam/stage/creds
```

:::note Two templating layers
`{{ .Values.ecr.region }}` and `{{ .Values.ecr.vaultPath }}` are resolved by **Helm** at render time (the chart runs `tpl` over `customResourcesMap`). The `.dockerconfigjson` block stays wrapped in a Helm raw string so its `{{ }}` reach **external-secrets** untouched. Both live in the same block without interfering.
:::

Then reference `ecr-regcred` from every app exactly as in the [shared pattern](#one-shared-pull-secret-for-the-cluster) — set `image.pullSecrets: ecr-regcred` in `common/common-values.yaml`.

## Troubleshooting

If the pod shows **`ImagePullBackOff`**, or the pull-secret ExternalSecret is unhealthy, click it in the Argo CD resource tree and check the events:

- `AccessDenied` / `UnrecognizedClientException` on the ExternalSecret — the IAM key pair is wrong, or the policy is missing `ecr:GetAuthorizationToken`.
- Pod pulls fail with `403 Forbidden` — the policy's repository ARN doesn't cover the image you're pulling.
- `SecretSyncedError` mentioning template — the double-brace escaping was altered; restore it exactly.
- `pull secret ... not found` — `image.pullSecrets` doesn't match the pull secret's name (`<app-name>-registry-cred` for the per-app pattern, `ecr-regcred` for the shared and per-environment patterns).

:::caution One owner per secret
Exactly one source of truth may manage a given pull secret. When migrating away from a separate config repo, remove that repo's `ecr-regcred` definition in the same window you introduce this one, or external-secrets and Argo CD will contend for ownership. A brief image-pull blip is expected while the secret is (re)generated.
:::
