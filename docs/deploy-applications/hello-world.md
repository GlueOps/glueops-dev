---
id: deploy-hello-world-to-glueops
title: Deploy a "Hello World" Application
type: tutorial
---

# Deploy a "Hello World" Application

In this guide, we will walk you through the process of deploying a "Hello World" application onto the GlueOps platform. We'll start from scratch and cover each step in detail to ensure you have a smooth deployment experience. You may see references to `antoniostacos`, this name is for demo purposes only and can be replaced with your actual project or company name where appropriate.

By the end of this guide, you will have deployed your antoniostacos application in a QA environment on the GlueOps platform.

## Create a New Repository

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

:::note

In the file structures shown below, we've used the `<`` symbol next to files or folders to indicate those you'll be working on or creating during this tutorial.

<Tabs>
<TabItem value="js" label="JavaScript">

```
app-antoniostacos <
├── Dockerfile
├── .github
│   └── workflows
│       ├── ghcr.yaml
│       └── qa-cd.yaml
├── app.js
├── README.md
```

</TabItem>
<TabItem value="py" label="Python">

```
app-antoniostacos <
├── Dockerfile
├── .github
│   └── workflows
│       ├── ghcr.yaml
│       └── qa-cd.yaml
├── app.py
├── README.md
```
</TabItem>
<TabItem value="ruby" label="Ruby">

```
app-antoniostacos <
├── Dockerfile
├── .github
│   └── workflows
│       ├── ghcr.yaml
│       └── qa-cd.yaml
├── app.rb
├── README.md
```
</TabItem>
</Tabs>

:::

Go to GitHub and create a [new repository](https://github.com/new). When naming your repository, you can use a format like `app-yourprojectname`, for example: `app-antoniostacos`.

## Add your application code and Dockerfile

:::info
Marked below are the files we will be adding:

<Tabs>
<TabItem value="js" label="JavaScript">

```
app-antoniostacos
├── Dockerfile <
├── .github
│   └── workflows
│       ├── ghcr.yaml
│       └── qa-cd.yaml
├── app.js <
├── README.md
```

</TabItem>
<TabItem value="py" label="Python">

```
app-antoniostacos
├── Dockerfile <
├── .github
│   └── workflows
│       ├── ghcr.yaml
│       └── qa-cd.yaml
├── app.py <
├── README.md
```
</TabItem>
<TabItem value="ruby" label="Ruby">

```
app-antoniostacos
├── Dockerfile <
├── .github
│   └── workflows
│       ├── ghcr.yaml
│       └── qa-cd.yaml
├── app.rb <
├── README.md
```
</TabItem>
</Tabs>
:::

### Application Code

Within your repo create the file that contains your code:

<Tabs>
<TabItem value="js" label="JavaScript">

```js title="<MY_REPO>/app.js"
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    const greeting = process.env.GREETING_MESSAGE || 'Hello, World!';
    res.send(greeting);
});

app.listen(8080, () => {
    console.log('Server running on http://localhost:8080');
});
```

</TabItem>
<TabItem value="py" label="Python">

```py title="<MY_REPO>/app.py"
import os
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello_world():
    greeting = os.environ.get('GREETING_MESSAGE', 'Hello, World!')
    return greeting

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```
</TabItem>
<TabItem value="ruby" label="Ruby">

```ruby title="<MY_REPO>/app.rb"
require 'sinatra'

set :bind, '0.0.0.0'  # This binds the server to all network interfaces.
set :port, 8080       # This sets the default port to 8080.

get '/' do
  greeting = ENV['GREETING_MESSAGE'] || 'Hello, World!'
  greeting
end
```
</TabItem>
</Tabs>


Save the file and commit your changes.

### Dockerfile

Next, within your application repository, create a new file named `Dockerfile`. Populate this file using the template provided below based on your chosen programming language.

<Tabs>
<TabItem value="js" label="JavaScript">

```docker title="<MY_REPO>/Dockerfile"
FROM node:18-alpine

WORKDIR /app

COPY . /app

RUN npm install express

CMD ["node", "app.js"]
```
</TabItem>
<TabItem value="py" label="Python">

```docker title="<MY_REPO>/Dockerfile"
FROM python:3-alpine

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir Flask

CMD ["python", "app.py"]
```
</TabItem>
<TabItem value="ruby" label="Ruby">

```docker title="<MY_REPO>/Dockerfile"
FROM ruby:3-alpine

WORKDIR /app

COPY . /app

RUN gem install sinatra webrick

CMD ["ruby", "app.rb"]
```
</TabItem>
</Tabs>

Save the file and commit your changes.

## Add CI to publish a Docker image to GitHub Container Registry
:::info
Marked below are the files we will be adding:

<Tabs>
<TabItem value="js" label="JavaScript">

```
app-antoniostacos
├── Dockerfile
├── .github
│   └── workflows
│       ├── ghcr.yaml <
│       └── qa-cd.yaml
├── app.js
├── README.md
```

</TabItem>
<TabItem value="py" label="Python">

```
app-antoniostacos
├── Dockerfile
├── .github
│   └── workflows
│       ├── ghcr.yaml <
│       └── qa-cd.yaml
├── app.py
├── README.md
```
</TabItem>
<TabItem value="ruby" label="Ruby">

```
app-antoniostacos
├── Dockerfile
├── .github
│   └── workflows
│       ├── ghcr.yaml <
│       └── qa-cd.yaml
├── app.rb
├── README.md
```
</TabItem>
</Tabs>
:::

By creating and saving the following YAML configuration, you're setting up a GitHub Action that will automatically publish a Docker image of your application to the GitHub Container Registry (GHCR.io). This will allow the GlueOps platform to use the latest version of your app in it's deployments. As a happy path, we have provided this [custom action to push Docker images to your GitHub Container Registry (GHCR.io)](https://github.com/marketplace/actions/build-docker-image-and-push-to-ghcr). 

To use it, Simply create the file below

```yaml title="<MY_REPO>/.github/workflows/ghcr.yaml"
name: Publish to GHCR.io
 
on: [push]

jobs:
  build_tag_push_to_ghcr:
    runs-on: ubuntu-latest
    steps:
      - name: Build, Tag and Push Docker Image to GHCR
        uses: GlueOps/github-actions-build-push-containers@main
```

Save the file and commit your changes and push up your changes.

:::tip

Once you push up your changes visit your github repository actions page to view the status. You can find it at: https://github.com/<MY_ORG>/<MY_REPO>/actions. If all the circles next to your actions are "Green", it indicates that the processes completed successfully. If you see any "Red" circles then you may need to revisit the steps above before continuing. In the end you should see an artifact(s) published to: https://github.com/<MY_ORG>/<MY_REPO>/packages.
:::

## Let's deploy your app!

:::info
**Deployment Configuration Repository:**

Think of this repository as your application's deployment instruction manual. It contains all the essential rules and settings that determine how and where your application should be launched. You don't need to delve into the nitty-gritty of these configurations. Just follow the steps below, and our system will handle the deployment seamlessly.
::::danger important
 The exact name and location of this "deployment configurations" repository will be provided by your Platform Administrators.
::::
```
deployment-configurations
├── apps
│   └── app-antoniostacos
│       └── envs
│           └── qa
│               └── values.yaml <
```

:::

Now, within your "deployment configurations" repository, create the following file:

```yaml title="apps/<MY_REPO>/envs/qa/values.yaml"
image:
  repository: '<MY_ORG>/<MY_REPO>'
  registry: ghcr.io
  pullPolicy: Always
  port: 8080
  tag: main
service:
  enabled: true
deployment:
  replicas: 1
  enabled: true
  imagePullPolicy: Always
  imagePullSecrets: regcred
  resources:
    requests:
      cpu: 100m
      memory: 128Mi

ingress:
  enabled: true
  ingressClassName: public
  entries:
    - name: public
      hosts:
        - hostname: '<MY_APP_NAME>-qa.apps.<MY_CAPTAIN_DOMAIN>'
```

:::tip
Ensure you replace the placeholders appropriately:

- `<MY_ORG>` and `<MY_REPO>` with your GitHub organization and application repository names.
- Replace `<MY_APP_NAME>`  with your chosen app name.
- Replace `<MY_CAPTAIN_DOMAIN>` with your assigned captain domain, provided by the Platform Administrators.
:::

Once you've done the above, commit your changes to the deployment configurations repository and push the changes. In a short while, you should be able to access your app at the URL: `https://<MY_APP_NAME>-qa.apps.<MY_CAPTAIN_DOMAIN>`
