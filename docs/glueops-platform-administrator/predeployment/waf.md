---
id: create-a-waf-aws-account
title: Enabling WAF Support
---



# Enabling WAF Support for your GlueOps Platform

Regardless of the cloud you are using we support adding a WAF to your platform. So whether you are on Linode, DigitalOcean, AWS, Google Cloud, Azure, etc. We use the robust features of Amazon Web Sevices Web Application Firewall to protect your applications. Using their globally distributed, low latency offering, we can help you protect your L7 Web Apps from being abused by bots, abusive amounts of requests and much more. To enable support for a WAF you need to create an AWS account solely for the WAF. This is independent of your existing AWS account that will be used to deploy the kubernetes cluster. As usualy we recommend creating another AWS sub account, also known as a member account. As mentioned for cloud deployments into AWS, this will require you setup an AWS Organization which will own all your accounts. By using an AWS Organization you can easily create dozens of AWS sub accounts. We won't go into great detail on how to do this as this is very AWS specific but if you need help just reach out to the GlueOps team and we can provide you with additional guidance for your use case.


:::info
For each cluster you deploy with the GlueOps platform, you must provide a separate AWS account.
:::

Follow the step-by-step guide below to:
- Verify your AWS accounts and increase service quotas
- Create an AWS IAM user


## Verifications


### Phone verification

1. Login to your AWS Sub/member account and open a [Support Case](http://aws.amazon.com/support).
2. Choose **Account and Billing Support.**
3. For **Type**, select **Account.**
4. For **Category**, select **Activation.**
5. In the **Case description** section, provide a date and time when you can be reached.
6. In the **Contact options section**, select **Chat** for **Contact methods**
7. Choose **Submit.**

### Payment Verification (Setting a default payment method)

1. Login to your AWS Sub/member account
2. Follow the directions as outlined on the [AWS Documentation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-payment-method.html#manage-designate-default)
   
:::info
Adding the default should have no direct impact on any consolidated Organizational Billing that you may have setup. Since this is a sub account all your bills should still aggregate to the root account. So if you have invoice billing, this should have no impact to that. However, it's always best to check with your AWS account representative on your particular situation.
:::

### Service Quotas

:::info
If you have more than 200 distinct applications in a single cluster then you may need a quota increase. The upper limit at this time would be 10,000 distinct L7 based applications.
:::

## Creating an AWS IAM User and Credentials

### Creating an AWS IAM User
1. Login to the AWS Sub/member account
2. Create an IAM user, we recommend naming it `captain-deployment-svc-account` and assign it the Policy named `AdministratorAccess`.
3. Copy the full ARN for the user and securely store it.

:::info
If you need help creating a user, please contact the GlueOps team or reference the AWS Documentation here: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console
:::

### Creating AWS IAM User Credentials

1. Create Security Credentials for the IAM user you just created and securely save the Access Key ID and Secret Access Key.
   
:::info
If you need help creating credentials, please contact the GlueOps team or reference the AWS Documentation here: https://docs.aws.amazon.com/powershell/latest/userguide/pstools-appendix-sign-up.html
:::

## Retrieving values

By completing the above steps, you should have verified your AWS accounts and obtained the following values:
- [IAM User ARN](#creating-an-AWS-iam-user-and-credentials)
- [IAM User Credentials](#creating-aws-iam-user-credentials)

These values will be required by the GlueOps team before they can deploy your cluster. Please use a temporary sharing passsword service like [Doppler](https://share.doppler.com/).
