import clsx from "clsx";
import React from "react";
import styles from "./publish-with-glueops.module.css";
import { logEvent } from "../../analytics/analytics.js";

export default function PublishWithGlueops(): JSX.Element {
  return (
    <section className="padding-vert--xl container">
      <div className={clsx("row row--no-gutters shadow--md", styles.item)}>
        <div className={clsx("col col--6", styles.item__inner)}>
          <div>
            <h1 className="margin-bottom--md"> Improve your data operations</h1>
            <p className="margin-bottom--md">
            Our experienced Data Operations Engineers will provide insights into the efficiency and effectiveness of your current data operations practices and help identify areas for improvement to ensure your infrastructure is optimized for all your data workloads.
            </p>
            <a className="button button--md button--block button--secondary" onClick={() => logEvent("Purchase DataOps")} href="https://aws.amazon.com/marketplace/pp/prodview-mfwjl2qdvhaes?sr=0-1&ref_=beagle&applicationId=AWSMPContessa">
            Purchase DataOps
            </a>
          </div>
        </div>
        <div
          className="col col--6"
          aria-hidden="true"
          style={{
            backgroundImage: "url('/images/gitops.avif')",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right",
          }}
        ></div>
      </div>
    </section>
  );
}
