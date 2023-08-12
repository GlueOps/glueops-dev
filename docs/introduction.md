---
id: introduction
title: GlueOps Platform Overview
type: explainer
---


GlueOps provides a full GitOps-driven workflow for deploying applications in production and nonprod environments. With the GlueOps Platform, developers can easily create ephemeral preview environments and manage their own deployments from dev all the way into production.

## Platform Components

The GlueOps Platform consists of several key components that work together to facilitate efficient and automated deployments. These components include:

1. **GlueOps Platform**: The central orchestration point of all GlueOps control plane services. The platform monitors repository activity and automatically updates application deployments and infrastructure based on changes within repositories.

2. **Repositories**: Application deployments are managed through repositories. The GlueOps Platform supports two main types of repositories:

   - **Deployment Configurations Repository**: A central repository that configures both production and non-production deployments within the GlueOps Platform. It defines the infrastructure, environments, and dependencies required for application deployments. Additionally, it generates ephemeral preview environments that allow developers to explore and validate their changes before merging their branches into a shared branch or before deploying to production.
   
   - **Application Repositories**: These repositories contain the actual application code, configurations, and Dockerfiles. Each application repository must include a Dockerfile or a Containerfile, which defines the build process for creating the application's container image. Application repositories enable developers to manage and version control their applications independently, allowing for flexibility in deploying and scaling different applications.

3. **Encrypted Secret Store**: The GlueOps Platform provides an encrypted secret store for securely storing secret values. The encrypted secret store ensures that sensitive information, such as API keys or database credentials, is stored securely and accessible only to authorized applications.

4. **Metrics, Logs, and Alerts**: The GlueOps Platform automatically collects logs from deployed applications, offering centralized access and visibility into your application(s). It also provides dashboards for monitoring various services, enabling developers and operations teams to track metrics and identify any potential issues. Custom alerts can be provisioned to notify stakeholders about aberrant service behavior that requires attention or remediation.

The GlueOps Platform's comprehensive set of components simplifies the deployment process, enables efficient collaboration, and promotes best practices. By leveraging these components, developers and operations teams can accelerate application development, ensure consistent deployments, and achieve higher levels of productivity and reliability.
