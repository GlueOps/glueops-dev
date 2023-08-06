---
id: create-github-oauth-for-glueops
title: Create GitHub OAuth App
type: tutorial
---

# Creating your GitHub OAuth App

GlueOps authenticate services deployed on the Platform using the GitHub OAuth app. The OAuth app is installed within your GitHub Organization to provide secure access to your applications.

To enable GlueOps authentication for your application, you need to provide the following values:

- [Client ID](#create-the-oauth-app): This is the Client ID of your GitHub OAuth app.
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

1. **Application name**: Enter a name for your OAuth app. This will start with `dex.` and end with your **captain domain**.
Assuming your **captain domain** is `nonprod.antoniostacos.onglueops.com`, your application name should be: `dex.nonprod.antoniostacos.onglueops.com`. 

:::info
The GlueOps team will provide you with the **captain domain**.
:::

1. **Homepage URL**: Specify the homepage URL for your OAuth app. The homepage URL contains the following
    - The URL suffix `https://dex`. Where `dex` is the service we manage.
    - The application name. In this case `dex.nonprod.antoniostacos.onglueops.com`
    - The tenant key identifying your organization. In this case `antoniostacos`
    - The top level domain for GlueOps services `onglueops.com` 

For the example cluster, the home page URL is `https://dex.nonprod.antoniostacos.onglueops.com`.

1. **Authorization callback URL**: Set the authorization callback URL for your OAuth app. Add `/callback` to the homepage URL. For the example cluster your authorization callback URL would be `https://dex.nonprod.antoniostacos.onglueops.com/callback`.

2. Once you have filled in the details, click on **Register application** to create the GitHub OAuth app.

<img width="75%" alt="register new github oauth application" src="/images/docs/v1/register-new-oauth-application.png"/>


Once your app is registered you'll receive your **OAuth App Client ID**. In the example above it's `f07f0ea7913b9341f20d`

## Generate Client Secret

The client secret is a confidential value that is used for secure communication. In the OAuth app settings page:

- Scroll down to the **Client Secrets** section
- Click on **Generate a new client secret**.

<img width="541" alt="get client secret github oauth application" src="/images/docs/v1/github-oauth-application-client-secret.png"/>

Once the client secret is generated, make sure to copy and securely store it. In the example above it's `4274f2e792e6c9d16f1d7c9bf22bdcfeafbd9c13`

## Retrieving values

By completing the above steps, you should have obtained the following values from the GitHub OAuth App:

- [Client ID](#create-the-oauth-app): This is the Client ID of your GitHub OAuth app.
- [Client Secret](#generate-client-secret): This is the Client Secret generated for your GitHub OAuth app.

These values will be required by the GlueOps team before they can deploy your cluster. Please use a temporary sharing passsword service like [Doppler](https://share.doppler.com/) or [OneTimeSecret](https://onetimesecret.com/).
