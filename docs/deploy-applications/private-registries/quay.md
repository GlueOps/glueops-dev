---
id: registry-quay
title: "Quay (quay.io)"
---

# Pull Images from Quay

Deploy applications whose images live in a **private** Quay repository. You store a registry credential in your environment's vault once; the platform turns it into a Kubernetes image pull secret that your workloads use automatically.

## Step 1 — Create a robot account

In Quay, open your organization → **Robot Accounts → Create Robot Account**, then grant it **Read** permission on the repositories your application pulls. Robot account usernames look like `my-org+my-robot`.

(Quay also lets you download a pre-built Kubernetes secret for a robot account — its `.dockerconfigjson` value is exactly what you'll store in the vault in Step 3.)

## Step 2 — Compose the Docker config JSON

Build the base64 auth string from `USERNAME:TOKEN` (the robot account name and its token):

```bash
printf '%s' 'my-org+my-robot:ROBOT_TOKEN' | base64 -w0
```

Then the credential document is:

```json
{
  "auths": {
    "quay.io": {
      "auth": "<output of the command above>"
    }
  }
}
```

## Step 3 — Upload to your vault

In your environment's OpenBao/Vault UI (see [Managing Environment Secrets](/deploy-applications/manage-environment-secrets)), create a secret at a dedicated path:

- Path: `secret/<your-app>-registry-cred`
- Key `.dockerconfigjson`: the JSON document from Step 2 (as a single value, including the braces)

## Step 4 — Configure your application values

**`base/base-values.yaml`**

```yaml
image:
  registry: quay.io
  repository: my-org/my-app
  tag: v1.0.0
  port: 8080
  pullSecrets: my-app-registry-cred   # <app-name>-registry-cred
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
    registry-cred:                     # creates Secret <app-name>-registry-cred
      type: kubernetes.io/dockerconfigjson
      dataFrom:
        key: secret/<your-app>-registry-cred
```

`image.pullSecrets` is inherited by every pod template (Deployment, StatefulSet, Job, CronJob); individual workloads can override it with their own `imagePullSecrets` key if needed.

## Step 5 — Deploy and verify

Commit the values to your deployment-configurations repository and wait for Argo CD to sync (or click **Sync**). The `ExternalSecret` turns **Healthy** once the credential is synced, and the application pod starts normally.

If the pod shows **`ImagePullBackOff`**, click it in the Argo CD resource tree and check the events:

- `unauthorized: access to the requested resource is not authorized` — the robot account lacks Read on that repository, or the auth string was built from the wrong `robot:token` pair.
- `pull secret ... not found` — `image.pullSecrets` doesn't match the ExternalSecret's target name (`<app-name>-registry-cred`).
