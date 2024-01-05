---
id: adding-configurations-and-secrets-to-the-hello-world-app-glueops-platform
title: Adding Application Configurations
type: tutorial
---

# Adding Application Configurations/Secrets
:::caution
Before diving in, it's essential to have a [Hello World App Deployment](../deploy-applications/deploy-hello-world-to-glueops) running. Once that's in place, we can explore how to tweak its greeting using configurations and secrets.
:::

In this guide, you'll learn how to add configurations and secrets to your applications using the GlueOps platform. As an example, we'll update the default greeting of your existing 'Hello World' app to showcase this functionality.

## Let's create the new greeting message

:::info prerequisites

Before you get started we will begin referencing links located on your cluster information home page:
  `https://cluster-info.<MY_CAPTAIN_DOMAIN>`

_Using the URL above, replace `<MY_CAPTAIN_DOMAIN>` with the correct value provided by your Platform Administrator_
:::

Once you are on the cluster info home page, click on the `Resource/Link` for `Secrets Management`. You will then be taking our our secrets management system (Vault). For the role enter "editor" as you will need read/write access and then click on `Sign in with OIDC Provider`

![Alt text](https://cdn.glueops.dev/doc-assets/v1/vault/login.png)

To create our first configuration/secret, Click on "Create secret +`

![Alt text](https://cdn.glueops.dev/doc-assets/v1/vault/create-secret.png)

Finally, let's enter in the details for the new greeting message. For the field `Path for this secret` you will want to use `app-projectname` in our case our demo projectname as used in other tutorials is `antoniostacos`.
For the `key` enter `GREETING_MESSAGE` (this is indeed case sensitive) and for the value (left of the `key`) enter: `¡Hola Mundo!`. 

![Alt text](https://cdn.glueops.dev/doc-assets/v1/vault/create-secret-greeting-message.png)

Once complete, click Save!

You can expect the confirmation page to look like this:

![Alt text](https://cdn.glueops.dev/doc-assets/v1/vault/saved-secret.png)

## Let's wrap up and get this new greeting deployed!

:::info
You will need to go back to your `values.yaml` within your deployment configurations repository. In this case case it's the same repo/file you used when you initially deployed the "Hello World!" application.

```
deployment-configurations
├── apps
│   └── app-antoniostacos
│       └── envs
│           └── qa
│               └── values.yaml <
```
:::


We are going to add the following YAML to the very bottom of the existing file:

```yaml
externalSecret:
  enabled: true
  secrets:   
    <MY_APP_PROJECTNAME>:
      dataFrom:
        key: secret/<MY_APP_PROJECTNAME>
```

:::caution Replacements:

 `<MY_APP_PROJECTNAME>` with the name you used when adding the secret/configuration. In our case it's `app-antoniostacos`


```yaml
externalSecret:
  enabled: true
  secrets:   
    app-antoniostacos:
      dataFrom:
        key: secret/app-antoniostacos
```
:::

And that's it! Save the file, commit the changes and push them back up! Within a few moments you should see the greeting changed on the QA deployment of your "Hello World" website.

:::info Reference

In case you aren't sure where to place the `YAML` in this guide, it would look like this when appended to the previously provided `YAML`:


```yaml
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
  imagePullSecrets: <CONTAINER_REGISTRY_CREDENTIALS>
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

externalSecret:
  enabled: true
  secrets:   
    <MY_APP_PROJECTNAME>:
      dataFrom:
        key: secret/<MY_APP_PROJECTNAME>
```
:::
