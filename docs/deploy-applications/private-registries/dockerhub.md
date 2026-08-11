---
id: registry-dockerhub
title: "Docker Hub (docker.io)"
---

# Pull Images from Docker Hub

Deploy applications whose images live in a **private** Docker Hub repository. You store a registry credential in your environment's vault once; the platform turns it into a Kubernetes image pull secret that your workloads use automatically.

:::tip Also useful for public images
Authenticated pulls get much higher Docker Hub rate limits than anonymous ones. If your cluster pulls many public `docker.io` images and hits `429 Too Many Requests`, this same setup solves that.
:::

## Step 1 — Create an access token

In Docker Hub, go to **Account Settings → Personal access tokens → Generate new token** with **Read-only** access permissions. Use a service account rather than a personal Docker ID for team-owned applications.

## Step 2 — Compose the Docker config JSON

Build the base64 auth string from `USERNAME:TOKEN` (your Docker ID and the token from Step 1):

```bash
printf '%s' 'my-docker-id:dckr_pat_XXXXXXXX' | base64 -w0
```

Then the credential document is (note Docker Hub's legacy auth host):

```json
{
  "auths": {
    "https://index.docker.io/v1/": {
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
  registry: docker.io
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

- `unauthorized: incorrect username or password` — wrong Docker ID/token pair, or the auth entry isn't under `https://index.docker.io/v1/` (Docker Hub does not match on `docker.io`).
- `toomanyrequests` — rate limiting; confirm the pull is actually authenticated (the pull secret name matches).
- `pull secret ... not found` — `image.pullSecrets` doesn't match the ExternalSecret's target name (`<app-name>-registry-cred`).
