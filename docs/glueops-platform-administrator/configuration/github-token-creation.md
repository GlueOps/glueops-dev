---
id: creating-github-token
title: Creating a GitHub token
---

# Creating a GitHub token

:::info
Before you begin, we recommend you use a dedicated service account. It's not required but it is strongly recommended.
:::

To enable GitHub Actions to notify our platform of code changes, we need to configure a GitHub Token as a repository secret. This guide will walk you through setting it up and by the end you will have a GitHub Token that you will need to keep some place secure.


1. To get your token secret, go to [https://github.com/settings/tokens](https://github.com/settings/tokens) and click on **Generate new token(classic).**

<img width="927" alt="Screenshot 2023-07-28 at 02 51 03" src="https://cdn.glueops.dev/doc-assets/v1/old-github-uploads/6710-4933-b076-1efb8d6bdc02.png"/>

1. Use the onscreen information to generate your token. The only scope required is the **repo** scope. 

<img width="869" alt="Screenshot 2023-07-28 at 02 55 12" src="https://cdn.glueops.dev/doc-assets/v1/old-github-uploads/c4e4d8ef-1007-4f24-8bbd-75c4624831da.png"/>

3. Click on **Generate token** and copy your token some place secure.
