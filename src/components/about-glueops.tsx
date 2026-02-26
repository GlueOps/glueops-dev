import {
  ClockIcon,
  CogIcon,
  CubeTransparentIcon,
  RectangleGroupIcon,
  RectangleStackIcon,
  ShareIcon,
  SparklesIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import React from "react";
import styles from "./about-glueops.module.css";

interface Callout {
  title: string;
  text: string;
  icon: (props: React.ComponentProps<"svg">) => JSX.Element;
}

const callouts: Callout[] = [
  {
    title: "Seamless GitOps Deployment",
    text: "Effortlessly deploy production and staging applications with GlueOps' seamless, GitOps-driven workflow.",
    icon: CogIcon,
  },
  {
    title: "Ephemeral Preview Environments",
    text: "Explore and test your running applications in secure ephemeral preview environments before merging changes or deploying to production.",
    icon: ShareIcon,
  },
  {
    title: "Central Orchestration Point",
    text: "GlueOps Platform serves as the central orchestration point, monitoring repository activity and updating deployments and infrastructure.",
    icon: RectangleStackIcon,
  },
  {
    title: "Flexible Repository Management",
    text: "Manage application deployments through a central, application-stack repository, sourcing from multiple repositories containing application code.",
    icon: ClockIcon,
  },
  {
    title: "Secure and Automated Image Builds",
    text: "Automatically build and publish new images from application repositories with Dockerfile support and integration with container registries.",
    icon: SparklesIcon,
  },
  {
    title: "Encrypted Secret Management",
    text: "Ensure security with an encrypted secret store for confidential values, including seamless integration with popular options like OpenBao.",
    icon: ShareIcon,
  },
  {
    title: "Kubernetes Cluster Management",
    text: "Leverage GlueOps to manage Kubernetes clusters for deploying application, optimizing workload for production and non-production environments.",
    icon: UsersIcon,
  },
  {
    title: "Monitoring and Logging",
    text: "Gain insights with automated log collection, powerful metrics, and customizable alerts, allowing proactive monitoring and issue resolution.",
    icon: CubeTransparentIcon,
  },
  {
    title: "Scalable Infrastructure Deployment",
    text: "Deploy applications and infrastructure at scale, with GlueOps supporting Kubernetes clusters to accommodate your growing needs.",
    icon: RectangleGroupIcon,
  },
];

function Callout(props: Callout): JSX.Element {
  return (
    <div className={clsx("margin-top--xl card shadow--lw", styles.callout)}>
      <div className="card__header">
        <h3 className={styles.callout__title}>
          <props.icon className={styles.callout__icon} stroke="currentColor" aria-hidden="true" />
          {props.title}
        </h3>
      </div>
      <div className="card__body">
        <p>
          <a href={props.link} className={styles.callout__link}>
            <span className="link--inset" aria-hidden="true"></span>
            {props.text}
          </a>
        </p>
      </div>
      <div className={styles.callout__bottom} />
    </div>
  );
}

export default function AboutGlueops(): JSX.Element {
  return (
    <section className="padding-vert--xl container">
      <div className={clsx("row margin-bottom--xl", styles.hero)}>
        <div className="col col--8">
          <div>
            <h1 className={clsx("margin-bottom--lg", styles.hero__title)}>Why Glueops?</h1>
            <p className={clsx("margin-bottom--md", styles.hero__text)}>
           At Glueops, we offer a complete solution to enhance your DevOps and DataOps strategies, resulting in better outcomes with reduced time and effort. 
            Our advanced technology and skilled team eliminate the complexities of DevOps and DataOps, accelerating your company’s development and growth. 
            
            </p>
            <p className={clsx("margin-bottom--md", styles.hero__text)}>
            The GlueOps Platform enables a seamless, GitOps driven workflow for deploying production and staging applications.
            </p>
          </div>
        </div>
      </div>
      <div className="row">
        {callouts.map((c) => (
          <div key={c.title} className="col col--4">
            <Callout title={c.title} text={c.text} link={c.link} icon={c.icon} />
          </div>
        ))}
      </div>
    </section>
  );
}
