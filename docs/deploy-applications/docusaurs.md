---
id: deploy-docusarus-website-to-glueops
title: Deploy Docusaurus Website on GlueOps
type: tutorial
---

# Deploy Docusaurus Website on GlueOps
Docusaurus is a static site generator that allows you to create and deploy beautiful documentation websites quickly. In this tutorial, we will guide you through the process of deploying your Docusaurus website with GlueOps. 

## Prerequisites

Before you begin, you should have already set up your [Docusaurus website](https://docusaurus.io/) with all the necessary content and configurations.

## Set Up GitHub Actions for Docker Image Publishing
GlueOps relies on Docker images to deploy applications. We'll set up GitHub Actions to automatically build and publish a Docker image of your Docusaurus website to GitHub Container Registry (GHCR). As a happy path, we have provided this [Custom Action to push Docker images to GitHub Container Registry](https://github.com/marketplace/actions/build-docker-image-and-push-to-ghcr). Here's how you can set it up:

- Create a `.github/workflows` folder.
- Create a new file named `ghcr.yaml` in the workflows folder.
- Copy and paste the following code into `ghcr.yaml`:


```yaml
name: GlueOps Action
 
on: [push]

jobs:
  build_tag_push_to_ghcr:
    runs-on: ubuntu-latest
    steps:
      - name: Build, Tag and Push Docker Image to GHCR
        uses: GlueOps/github-actions-build-push-containers@v0.1.2
```

:::info
GlueOps only supports container images published to the supported registry. 
:::

### Create Dockerfile
Create a `Dockerfile` using the template below

```
FROM httpd:2.4.57

COPY index.html /usr/local/apache2/htdocs/index.html
```

:::info
Change `index.html` to the correct path of your index file.
:::

## Configure GitHub Workflows for Each Environment

In the `.github/workflows` directory of your application repository, we will add GitHub Actions workflow files for our environment: `prod-ci.yaml`, `stage-ci.yaml`, and `uat-ci.yaml`.

```
.
├── .github
│   └── workflows
│       ├── ghcr.yaml
│       ├── prod-ci.yaml
│       ├── stage-ci.yaml
│       └── uat-ci.yaml
├── Dockerfile
├── README.md
└── index.html
```

Each workflow file uses the `GlueOps/github-workflows/.github/workflows/argocd-tags-ci.yml` action to notify Argo CD about the new image tags and initiate the deployment process.

###  Sample Configuration for `prod` Environment:

In the `prod-ci.yaml` file add the following content:


```yaml
# .github/workflows/prod-ci.yaml

name: ArgoCD - Prod Tags CI

on:
  release:
    types:
      - created
jobs:
  update-tags:
    uses: GlueOps/github-workflows/.github/workflows/argocd-tags-ci.yml@main
    secrets:
      GH_TOKEN: ${{ secrets.GH_TOKEN }}
    with:
      STACK_REPO: 'deployment-configurations'
      ENV: 'prod'
      CREATE_PR: true
```
:::info
Replace `GH_TOKEN` with your secret name.
:::

###  Sample Configuration for `stage` Environment:

In the `stage-ci.yaml` file add the following content:

```yaml
# .github/workflows/stage-ci.yaml

name: ArgoCD - Staging Tags CI

on:
  pull_request:
    types:
      - closed
jobs:
  update-tags:
    uses: GlueOps/github-workflows/.github/workflows/argocd-tags-ci.yml@main
    if: github.event.pull_request.merged == true
    secrets:
      GH_TOKEN: ${{ secrets.GH_TOKEN }}
    with:
      STACK_REPO: 'deployment-configurations'
      ENV: 'stage'
      CREATE_PR: false
```
:::info
Replace `GH_TOKEN` with your secret name.
:::


###  Sample Configuration for `uat` Environment:

In the `uat-ci.yaml` file add the following content: 

```yaml
# .github/workflows/uat-ci.yaml

name: ArgoCD - QA Tags CI

on:
  release:
    types:
      - created
jobs:
  update-tags:
    uses: GlueOps/github-workflows/.github/workflows/argocd-tags-ci.yml@main
    secrets:
      GH_TOKEN: ${{ secrets.GH_TOKEN }}
    with:
      STACK_REPO: 'deployment-configurations'
      ENV: 'uat'
      CREATE_PR: true
```
:::info
Replace `GH_TOKEN` with your secret name.
:::

## Deploy the Application and Register Deployment Environments

Next, deploy the app and register the specified environments (prod, stage, uat) inside the GlueOps Argo CD. Here's what you need to do:

1. Go to the [deployment-configurations](https://github.com/GlueOps/deployment-configurations) repository.
2. In the `app` directory, duplicate one of the example demo apps and rename it to your repository name.
3. Your application directory should have the following structure:

```
├── docusaurus-website
├── base
│   └── base-values.yaml
├── envs
│   ├── previews
│   ├── prod
│   ├── stage
│   └── uat
```

4. In the `base-values.yaml` file inside the `base` directory, update the information to fit your application. For example, the `base-values.yaml` might look like this:

```yaml
image:
  registry: ghcr.io
  repository: venkata-tenant-test-1/docusaurus-website
  port: 80
```

Replace `venkata-tenant-test-1/docusaurus-website` with your organization and repository name.

5. Update the `values.yaml` file in the `prod`, `stage`, and `uat` folders accordingly. Change the image tag, hostnames, and other necessary details to match your application and GlueOps configuration.

###  `prod` Environment Sample Configuration:

Create a file named `values.yaml` in the `envs/prod` folder and add the following content:

```yaml
# envs/prod/values.yaml

image:
  tag: 'v0.2.0'

ingress:
  enabled: true
  ingressClassName: public
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  tls:
    - secretName: docusarus-website-prod.yolo.venkatamutyala.com
      hosts:
        - docusarus-website-prod.yolo.venkatamutyala.com
  entries:
    - name: public
      hosts:
        - hostname: docusarus-website-prod.apps.test-80-np.venkata.onglueops.rocks
        - hostname: docusarus-website-prod.yolo.venkatamutyala.com
```

:::important
Replace the placeholders as follows:
- Replace `docusarus-website` with your actual repository name.
- Replace `venkatamutyala.com` with your actual hosting name.
- Replace `test-80-np.venkata.onglueops.rocks` with the name of your GlueOps cluster provided by GlueOps.
:::

###  `stage` Environment Sample Configuration:

Create a file named `values.yaml` in the `envs/stage` folder and add the following content:

```yaml
# envs/stage/values.yaml

image:
  tag: 'latest'
ingress:
  enabled: true
  ingressClassName: public
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  tls:
    - secretName: docusarus-website-stage.yolo.venkatamutyala.com
      hosts:
        - docusarus-website-stage.yolo.venkatamutyala.com
  entries:
    - name: public
      hosts:
        - hostname: docusarus-website-stage.apps.test-80-np.venkata.onglueops.rocks
        - hostname: docusarus-website-stage.yolo.venkatamutyala.com
```

:::important
Replace the placeholders as follows:
- Replace `docusarus-website` with your actual repository name.
- Replace `venkatamutyala.com` with your actual hosting name.
- Replace `test-80-np.venkata.onglueops.rocks` with the name of your GlueOps cluster provided by GlueOps.
:::

### `uat` Environment Sample Configuration:

Create a file named `values.yaml` in the `envs/uat` folder and add the following content:

```yaml
# envs/uat/values.yaml

image:
  tag: 'v0.1.0'
ingress:
  enabled: true
  ingressClassName: public
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  tls:
    - secretName: docusarus-website-uat.yolo.venkatamutyala.com
      hosts:
        - docusarus-website-uat.yolo.venkatamutyala.com
  entries:
    - name: public
      hosts:
        - hostname: docusarus-website-uat.apps.test-80-np.venkata.onglueops.rocks
        - hostname: docusarus-website-uat.yolo.venkatamutyala.com
```

:::important
Replace the placeholders as follows:
- Replace `docusarus-website` with your actual repository name.
- Replace `venkatamutyala.com` with your actual hosting name.
- Replace `test-80-np.venkata.onglueops.rocks` with the name of your GlueOps cluster provided by GlueOps.
:::

6. Save and commit your changes to the deployment repository.


## Trigger GitHub Actions to Publish the Docker Image

Create a pull request (PR) to trigger the GitHub Action you set up for publishing the Docker image based on the latest code changes. The platform will automatically spin up a new environment and deploy the application.

To view the app click on the preview URL. You can check the status of the deployment on Argos CD, which will show metrics, logs, and more. The QR code will also lead you to the preview URL.

## Deploying to Environments

### Check application deployed to your Staging Enviroment

The staging enviroment is automatically deployed, to check your application:

1. Navigate to the `envs/stage` directory within the [deployment-configurations](https://github.com/GlueOps/deployment-configurations) repository.

2. In the `values.yaml` file located in the `stage` folder, check the `hostname` entry to view your application deployed to the staging environment.

### Deploying to `prod` and `uat` Environments

1. To deploy your application to the prod and UAT environments, you need to create a release in your application's repository (e.g., v0.1.0, v1.0.0, etc.). This release will mark the specific version of your application that you want to deploy to these environments.

2. Upon creating the release, GitHub will automatically generate pull requests into the deployment-configurations repository. These pull requests will contain the necessary changes for the prod and UAT environments, located in the `envs/prod` and `envs/uat` directories, respectively.

3. Review and merge the pull requests in the deployment-configurations repository. This will trigger the deployment process to both the `prod` and `uat` environments.

5. Once the deployment process is completed, your application will be accessible in both the `prod` and `uat` environments hostnames.

## Conclusion

Congratulations! You have successfully deployed a docusaurus website application onto the GlueOps platform.
