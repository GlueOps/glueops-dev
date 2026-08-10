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

## Step 1 — Create a scoped IAM credential (your AWS account)

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

## Step 2 — Upload the key pair to your vault

In your environment's OpenBao/Vault UI (see [Managing Environment Secrets](/deploy-applications/manage-environment-secrets)), create a secret at a dedicated path:

- Path: `secret/<your-app>-ecr-iam`
- Key `access_key_id`: the Access Key ID
- Key `secret_access_key`: the Secret Access Key

## Step 3 — Configure your application values

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
                  "{{ `{{ .proxy_endpoint | replace "https://" "" }}` }}": {
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
Everything inside `customResourcesMap` is rendered by Helm first, but the `.dockerconfigjson` template lines belong to **external-secrets' own** template engine. The `` {{ `...` }} `` wrappers make Helm emit those placeholders literally so external-secrets can process them. Keep them exactly as shown.
:::

## Step 4 — Deploy and verify

Commit the values to your deployment-configurations repository and wait for Argo CD to sync (or click **Sync**). In the resource tree you'll see both ExternalSecrets and the `ECRAuthorizationToken`; when they're **Healthy**, the pull secret exists and the application pod starts normally. The token refreshes itself every 6 hours from then on — nothing to renew manually.

If the pod shows **`ImagePullBackOff`**, or the `my-app-registry-cred` ExternalSecret is unhealthy, click it in the Argo CD resource tree and check the events:

- `AccessDenied` / `UnrecognizedClientException` on the ExternalSecret — the IAM key pair is wrong, or the policy is missing `ecr:GetAuthorizationToken`.
- Pod pulls fail with `403 Forbidden` — the policy's repository ARN doesn't cover the image you're pulling.
- `SecretSyncedError` mentioning template — the double-brace escaping above was altered; restore it exactly.
