---
id: creating-github-deployment-app
title: Creating the GlueOps Deployment GitHub App
---

# Creating the GlueOps Deployment GitHub App

GlueOps deploys your applications from a `deployment-configurations` repo — it reads that repo and rolls out whatever image tag is set there. Keeping those tags current as you ship new versions is what this app is for.

The **recommended (and optional) happy path** is to let your application repos' GitHub Actions bump the tags for you. Those Actions authenticate with a **dedicated GitHub App** ("GlueOps Deployment") that mints short-lived, narrowly-scoped tokens for each run. The rest of this page sets that app up.

:::note It's optional
This app is only the **write credential** the GlueOps deploy actions use to update `deployment-configurations`. If you'd rather update that repo with your **own tooling** (any CI that commits the new image tag), you can skip this app entirely — GlueOps only needs the repo kept up to date, not a particular way of doing it. It's also separate from the platform GitHub App you create during cluster onboarding.
:::

## Quick setup (recommended): one-click

The one-click setup page creates the app with exactly the right permissions and hands you the credentials to paste in:

**→ https://glueops.github.io/github-actions-bump-deployment-tag/**

This page always serves the latest app manifest (from the action repo's `main`), so a single click creates a correctly-scoped, up-to-date app in your org.

1. Enter your **organization login** (you must be an org **owner**) and click **Create GitHub App**. GitHub creates a private app named `glueops-deployment-<org>-v1` in your org with `Contents` + `Pull requests` write and `Metadata` read.
2. Back on the page, **copy the App ID and the private key** (the key is shown **once**). Use the provided links to add them as:
   - Org **variable** `GLUEOPS_DEPLOYMENT_APP_ID`
   - Org **secret** `GLUEOPS_DEPLOYMENT_APP_PRIVATE_KEY`
3. Click **Install** and **select your `deployment-configurations` repository** — the permissions do nothing until the app is installed there.

Then continue to [Reference them in workflows](#reference-them-in-workflows).

## Manual setup (fallback)

<details>
<summary>Prefer clicking through GitHub's UI? Expand.</summary>

### 1. Create the App
On your GitHub **organization**: **Settings → Developer settings → GitHub Apps → New GitHub App**.
- **Name**: `glueops-deployment-<org>-v1` (must be globally unique; ≤ 34 chars — shorten to `glueops-deploy-<org>` if needed).
- **Homepage URL**: `https://www.glueops.dev`.
- **Webhook**: uncheck **Active**.
- **Repository permissions** — grant only: **Contents** Read and write, **Pull requests** Read and write, **Metadata** Read-only.
- **Where can this GitHub App be installed?**: **Only on this account**.

Click **Create GitHub App**. Save the **App ID**.

### 2. Generate a private key
App page → **Private keys → Generate a private key** → keep the `.pem` secret.

### 3. Install the App
**Install App** → **Only select repositories** → select your **`deployment-configurations`** repo.

### 4. Store the credentials
**Org → Settings → Secrets and variables → Actions**:
- **Variables → New organization variable**: `GLUEOPS_DEPLOYMENT_APP_ID` = the App ID.
- **Secrets → New organization secret**: `GLUEOPS_DEPLOYMENT_APP_PRIVATE_KEY` = the full `.pem` contents.

Under **Repository access**, select the repos whose CD workflows need these credentials.
</details>

## Reference them in workflows

Your app repos' CD workflows pass these to the deploy action; nothing else to wire per repo. Pin the action to a specific commit SHA:

```yaml
- uses: GlueOps/github-actions-bump-deployment-tag@<commit-sha>
  with:
    ENV: prod
    CREATE_PR: true
    app-id: ${{ vars.GLUEOPS_DEPLOYMENT_APP_ID }}
    private-key: ${{ secrets.GLUEOPS_DEPLOYMENT_APP_PRIVATE_KEY }}
```

The action mints an installation token scoped to `deployment-configurations`, valid for about an hour.

## Updating the app's permissions later

Because each org owns its own app, you make permission changes yourself:

- **Adding/changing a permission (recommended):** edit the app's **Permissions & events**, then **approve** the request when GitHub prompts the org owner. The old permissions keep working until you approve (zero downtime), and the App ID + key don't change — **no secret updates needed**.
- **If GlueOps ships a new permissions generation:** the one-click page's app name bumps (`-v2`). Create the `-v2` app **alongside** the old one, add its new App ID + key to your org secrets, verify a deploy, then **delete the old `-v1` app**. A new app means a new App ID + key, so you re-set both secrets.

:::tip Rotating the key
Generate a new private key on the app, update `GLUEOPS_DEPLOYMENT_APP_PRIVATE_KEY`, then delete the old key. Because tokens are short-lived and per-run, there is nothing else to rotate.
:::
