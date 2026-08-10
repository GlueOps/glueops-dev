---
id: registry-github
title: "GitHub Container Registry (ghcr.io)"
---

# Pull Images from GitHub Container Registry

Deploy applications whose images live in a **private** GitHub Container Registry (`ghcr.io`) repository. You store a registry credential in your environment's vault once; the platform turns it into a Kubernetes image pull secret that your workloads use automatically.

## Step 1 — Create a GitHub token

Create a [personal access token (classic)](https://github.com/settings/tokens/new?scopes=read:packages&description=glueops-image-pull) with only the **`read:packages`** scope. If the image belongs to an organization that enforces SSO, authorize the token for that organization after creating it.

For organizations, a dedicated machine user (with read access to the package) is preferable to a personal token tied to an individual.

## Step 2 — Compose the Docker config JSON

Build the base64 auth string from `USERNAME:TOKEN` (your GitHub username and the token from Step 1):

```bash
printf '%s' 'my-github-user:ghp_XXXXXXXX' | base64 -w0
```

Then the credential document is:

```json
{
  "auths": {
    "ghcr.io": {
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

**`base/base-values.yaml`** — point at the private image and name the pull secret:

```yaml
image:
  registry: ghcr.io
  repository: my-org/my-app
  tag: v1.0.0
  port: 8080
  pullSecrets: my-app-registry-cred   # <app-name>-registry-cred
```

**`envs/prod/values.yaml`** — sync the credential from the vault:

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

Commit the values to your deployment-configurations repository and wait for Argo CD to sync (or click **Sync**). The `ExternalSecret` appears in the resource tree and turns **Healthy** once the credential is synced, and the application pod starts normally.

If the pod shows **`ImagePullBackOff`**, click it in the Argo CD resource tree and check the events:

- `unauthorized` / `denied` — the token lacks `read:packages`, isn't SSO-authorized for the organization, or the base64 auth string was built from the wrong `username:token` pair.
- `manifest unknown` — the image reference (repository/tag) doesn't exist.
- `pull secret ... not found` — `image.pullSecrets` doesn't match the ExternalSecret's target name (`<app-name>-registry-cred`).
