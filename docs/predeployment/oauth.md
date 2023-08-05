---
id: create-github-oauth-for-glueops
title: Create GitHub OAuth App
type: tutorial
---

# Creating your GitHub OAuth App

Glueops authenticate services deployed on the Platform using the GitHub OAuth app. The OAuth app is installed within your GitHub Organization to provide secure access to your applications.

To enable GlueOps authentication for your application, you need to provide the following values:

- [Client ID](#create-the-oauth-app-id): This is the Client ID of your GitHub OAuth app.
- [Client Secret](#generate-client-secret): This is the Client Secret generated for your GitHub OAuth app.

Follow the step-by-step guide below to obtain these values:

:::info
For each cluster you deploy with the GlueOps platform, you must create a new GitHub OAuth app.
:::

## Create the OAuth App

To create the OAuth App, follow these steps:

1. On your Github Organization page, go to the **Settings > Developers settings** and click on **Oauth Apps**.

<img width="370" alt="Screenshot 2023-07-26 at 13 51 37" src="https://github.com/GlueOps/glueops-dev-old/assets/39309699/282e5bfc-16b9-4715-b6ce-99a23f4887d2"/>

2. Click on **New Org OAuth App** button to create a new OAuth application.

<img width="995" alt="Screenshot 2023-07-26 at 20 28 27" src="https://github.com/GlueOps/glueops-dev-old/assets/39309699/b8348e31-1695-4b61-bd22-fd1513411034"/>

3. **Application name**: Enter a name for your OAuth app. It should match the cluster name which GlueOps 
will provide for you. Assuming your cluster domain is `order-api.nonprod.antoniostacos.onglueops.com`, your application name should match your cluster name `order-api`. 

:::info
You can also include the cluster identifier, in this case `nonprod` so this will be `order-api-nonprod`
:::

4. **Homepage URL**: Specify the homepage URL for your OAuth app. The homepage URL contains the following
    - The URL suffix `https://dex`. Where `dex` is the service we manage.
    - The application name. In this case `order-api-nonprod`
    - The subdomain identifying your organization. In this case `antoniostacos`
    - The core domain for GlueOps services `onglueops.com` 

For the example cluster, the home page URL is `https://dex.order-api-nonprod.antoniostacos.onglueops.com`.

5. **Authorization callback URL**: Set the authorization callback URL for your OAuth app. Add `/callback` to the homepage URL. For the example cluster your authorization callback URL would be `https://dex.order-api-nonprod.antoniostacos.onglueops.com/callback`.

6. Once you have filled in the details, click on **Register application** to create the GitHub OAuth app.

<img width="75%" alt="Screenshot 2023-07-27 at 13 43 00" src="https://github.com/GlueOps/glueops-dev-old/assets/39309699/6b048789-26cb-4f50-b980-1ecee69bcd63"/>


Once your app is registered you'll receive your **OAuth App Client ID**

## Generate Client Secret

The client secret is a confidential value that is used for secure communication. In the OAuth app settings page:

- Scroll down to the **Client Secrets** section
- Click on **Generate a new client secret**.

<img width="541" alt="register_oauth" src="https://github.com/GlueOps/glueops-dev-old/assets/39309699/6de6a13d-2a85-4dcf-b89d-e9c42ddda396"/>

Once the client secret is generated, make sure to copy and securely store it.

## Retrieving values

By completing the above steps, you should have obtained the following values from the GitHub OAuth App:

- [Client ID](#create-the-oauth-app-id): This is the Client ID of your GitHub OAuth app.
- [Client Secret](#generate-client-secret): This is the Client Secret generated for your GitHub OAuth app.

These values will be used when deploying your application with Glueops.
