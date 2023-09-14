---
id: deploy-python-app-to-glueops
title: Deploy Python Application with GlueOps
type: tutorial
---

#  Deploy Python Application with GlueOps
In this tutorial, we will walk you through the process of deploying a simple Python application built with Flask with GlueOps.

##  Create a New Repository and set up your application folder

1. Create a new repository for your application within your organization. For this example our repository name is `python-app`

2. Create an `app.py` file and add the following code:

```python
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
```

3. Create a `templates` folder and create a new file named `index.html` with the following content:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Simple Python Site</title>
</head>
<body>
    <h1>Welcome to the Simple Python Site!</h1>
    <p>This is a basic example of a Python web application using Flask.</p>
</body>
</html>
```


## Set Up GitHub Actions for Docker Image Publishing
GlueOps relies on Docker images to deploy applications. We'll set up GitHub Actions to automatically build and publish a Docker image of your Docusaurus website to GitHub Container Registry (GHCR). As a happy path, we have provided this [Custom Action to push Docker images to GitHub Container Registry](https://github.com/marketplace/actions/build-docker-image-and-push-to-ghcr). Here's how you can set it up:

- Create a `.github/workflows` folder.
- Create a new file named `ghcr.yaml` in the workflows folder.
- Copy and paste the following code into `ghcr.yaml`:


```yaml title=".github/workflows/ghcr.yaml"
name: GlueOps Action
 
on: [push]

jobs:
  build_tag_push_to_ghcr:
    runs-on: ubuntu-latest
    steps:
      - name: Build, Tag and Push Docker Image to GHCR
        uses: GlueOps/github-actions-build-push-containers@main
```

:::info
GlueOps only supports container images published to the supported registry. 
:::


### Create Dockerfile
Create a `Dockerfile` using the template below

```Dockerfile title="Dockerfile"
FROM httpd:2.4.57

COPY template/index.html /usr/local/apache2/htdocs/template/index.html
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

:::info
Replace `GH_TOKEN` with your secret name.
:::


```yaml title=".github/workflows/prod-ci.yaml"

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

###  Sample Configuration for `stage` Environment:

In the `stage-ci.yaml` file add the following content:

:::info
Replace `GH_TOKEN` with your secret name.
:::

```yaml title=".github/workflows/stage-ci.yaml"

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

###  Sample Configuration for `uat` Environment:

In the `uat-ci.yaml` file add the following content: 

```yaml title=".github/workflows/uat-ci.yaml"

name: ArgoCD - UAT Tags CI

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
2. Inside the `app` directory, duplicate one of the example demo apps and rename it to your repository name.
3. Your application directory should have the following structure:

```
├── python-app
├── base
│   └── base-values.yaml
├── envs
│   ├── previews
│   ├── prod
│   ├── stage
│   └── uat
```

. In the `base-values.yaml` file inside the `base` directory, update the information to fit your application. For example, the `base-values.yaml` might look like this:

```yaml
image:
  registry: ghcr.io
  repository: venkata-tenant-test-1/python-app
  port: 80
```

Replace `venkata-tenant-test-1/python-app` with your organization and repository name.

5. Update the `values.yaml` file in the `prod`, `stage`, and `uat` folders accordingly. Change the image tag, hostnames, and other necessary details to match your application and GlueOps configuration.

###  `prod` Environment Sample Configuration:

Create a file named `values.yaml` in the `envs/prod` folder and add the following content:

```yaml title="envs/prod/values.yaml"

image:
  tag: 'v0.2.0'

ingress:
  enabled: true
  ingressClassName: public
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  tls:
    - secretName: python-app-prod.nonprod.antoniostacos.net
      hosts:
        - python-app-prod.nonprod.antoniostacos.net
  entries:
    - name: public
      hosts:
        - hostname: python-app-prod.apps.nonprod.antoniostacos.onglueops.com
        - hostname: python-app-prod.nonprod.antoniostacos.net
```

:::important
Replace the placeholders as follows:
- Replace `python-app` with your actual repository name.
- Replace `antoniostacos.net` with your actual hosting name.
- Replace `nonprod.antoniostacos.onglueops.com` with the name of your GlueOps cluster provided by GlueOps.
:::

###  `stage` Environment Sample Configuration:

Create a file named `values.yaml` in the `envs/stage` folder and add the following content:

```yaml title="envs/stage/values.yaml"

image:
  tag: 'latest'
ingress:
  enabled: true
  ingressClassName: public
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  tls:
    - secretName: python-app-stage.nonprod.antoniostacos.net
      hosts:
        - python-app-stage.nonprod.antoniostacos.net
  entries:
    - name: public
      hosts:
        - hostname: python-app-stage.apps.nonprod.antoniostacos.onglueops.com
        - hostname: python-app-stage.nonprod.antoniostacos.net
```

:::important
Replace the placeholders as follows:
- Replace `python-app` with your actual repository name.
- Replace `antoniostacos.net` with your actual hosting name.
- Replace `nonprod.antoniostacos.onglueops.com` with the name of your GlueOps cluster provided by GlueOps.
:::

### `uat` Environment Sample Configuration:

Create a file named `values.yaml` in the `envs/uat` folder and add the following content:

```yaml title="envs/uat/values.yaml"

image:
  tag: 'v0.1.0'
ingress:
  enabled: true
  ingressClassName: public
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  tls:
    - secretName: python-app-uat.nonprod.antoniostacos.net
      hosts:
        - python-app-uat.nonprod.antoniostacos.net
  entries:
    - name: public
      hosts:
        - hostname: python-app-uat.apps.nonprod.antoniostacos.onglueops.com
        - hostname: python-app-uat.nonprod.antoniostacos.net
```

:::important
Replace the placeholders as follows:
- Replace `python-app` with your actual repository name.
- Replace `antoniostacos.net` with your actual hosting name.
- Replace `nonprod.antoniostacos.onglueops.com` with the name of your GlueOps cluster provided by GlueOps.
:::

6. Save and commit your changes to the deployment repository.


## Trigger GitHub Actions to Publish the Docker Image

Create a pull request (PR) to trigger the GitHub Action you set up for publishing the Docker image based on the latest code changes. The platform will automatically spin up a new environment and deploy the application.

<img width="953" alt="Screenshot 2023-08-01 at 17 05 26" src="https://github.com/venkata-tenant-test-1/python-app/assets/39309699/bf80dae2-5605-419d-9a2d-f4ccdc88e539"/>

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
