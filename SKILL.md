---
name: glueops-deploy
description: Help a user deploy an application onto the GlueOps platform. Use whenever the user asks to deploy, ship, or onboard an app to GlueOps; create or edit files in a deployment-configurations repo; configure ingress, routing, secrets, or Traefik on GlueOps; or troubleshoot why a GlueOps deployment isn't reachable.
---

# GlueOps Deploy

This skill is a **stub**. The real instructions live in a single canonical `LLM.md` file hosted on GitHub. Fetch it, then follow it.

## What to do

1. Fetch the canonical guide:

   ```
   https://raw.githubusercontent.com/GlueOps/glueops-dev/main/LLM.md
   ```

   Use whatever fetch tool your harness exposes (e.g. `WebFetch`, `curl` via a shell tool, an HTTP tool). If fetching fails, tell the user and ask them to paste the contents of that URL.

2. Read the fetched document **in full** before generating any files or commands.

3. Follow it. The document specifies:
   - The two repos involved (`deployment-configurations` + the app source repo)
   - The directory layout under `apps/<app-name>/`
   - The shape of `base-values.yaml` and `envs/<env>/values.yaml`
   - When to use Standard Ingress vs Traefik IngressRoute CRDs
   - Helm template expressions to use instead of hardcoding
   - Secrets via `externalSecret` + OpenBao
   - Verification (no `kubectl` — use `curl` and the ArgoCD dashboard)
   - Common gotchas and the questions to ask the user before generating files

4. Do not generate raw Kubernetes manifests or `kubectl` commands. Everything goes through values files in the user's `deployment-configurations` repo.

## Notes

- The canonical guide is updated in-place on `main`. Always fetch fresh — do not rely on a cached copy from a previous session.
- This stub is harness-agnostic in spirit: any agent (Claude Code, Cursor, Continue, an OpenAI Assistant, a custom script) can be pointed at the same URL and get the same instructions. The `name` / `description` frontmatter above follows the Claude Code skill format; other harnesses may need their own equivalent wrapper around the same fetch step.
