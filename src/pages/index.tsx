import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HeroGlueops from "@site/src/components/hero-glueops";
import PublishWithGlueops from "@site/src/components/publish-with-glueops";
import PoweredByNx from "@site/src/components/powered-by-nx";
import AboutGlueops from "@site/src/components/about-glueops";
import HeroUpgrade from "../components/hero-upgrade";

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Documentation"
      description="GlueOps simplifies and optimizes your business’s DevOps and DataOps, allowing for efficient management and operation."
    >
      <main>
        <HeroGlueops />
        <PoweredByNx />
        <PublishWithGlueops />
        <AboutGlueops />
        <HeroUpgrade />
      </main>
    </Layout>
  );
}
