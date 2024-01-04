---
id: adding-github-token-to-organization-secrets
title: Adding GitHub token as an Organization secret
---

# Adding GitHub token as an Org secret

:::info
Before you begin, you must have completed the step where you created the GitHub token
:::

### Adding your GitHub Token as an Organization wide secret

1. Go to your GitHub Organization Home Page and navigate to **Settings > Security > Secrets and Variables > Actions**.
<img width="422" alt="Screenshot 2023-07-28 at 02 47 16" src="https://cdn.glueops.dev/doc-assets/v1/old-github-uploads/bd2d-4cd5-adfd-5b2537675401.png"/>

1. Click on **New organization secret** to add your token

<img width="798" alt="Screenshot 2023-08-03 at 01 34 34" src="https://cdn.glueops.dev/doc-assets/v1/old-github-uploads/95e48dd0-62d8-43ac-8972-68f9f0c16a4f.png"/>

2. Add your **secret name** as `GH_TOKEN` and paste your previously generated token in the `secret input field` and **before** clicking `Add secret` be sure to set the access to "All Repositories" or "Private and internal repositories" as applicable.

:::info
Given this is a privileged token, you may also want to consider selected repositories but this will create more overhead when onboarding a new application/repository.
:::

<img width="795" alt="Screenshot 2023-08-03 at 01 37 10" src="https://cdn.glueops.dev/doc-assets/v1/old-github-uploads/7e5769f2-4d4d-4e51-8adc-9a2f1b545682.png"/>
