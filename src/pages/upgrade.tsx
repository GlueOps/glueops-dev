import HeroUpgrade from "@site/src/components/hero-upgrade";
import HowToUpgrade from "@site/src/components/how-to-upgrade";
import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";

export default function Upgrade(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Upgrade" description="GlueOps simplifies and optimizes your business’s DevOps and DataOps, allowing for efficient management and operation.">
      <Head>
        <meta property="og:image" content="https://docs.glueops.dev/images/glueops.png" />
      </Head>
      <main>
        <HeroUpgrade />
        <HowToUpgrade />
      </main>
    </Layout>
  );
}
