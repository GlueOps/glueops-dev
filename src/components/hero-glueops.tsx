import { ChevronRightIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { CopyToClipboard } from "react-copy-to-clipboard";
import React, { useEffect, useState } from "react";
import clsx from "clsx";

import styles from "./hero-glueops.module.css";
import { logEvent } from "../../analytics/analytics.js";


export default function HeroGlueops(): JSX.Element {

  return (
    <section className="padding-vert--xl">
      <div className="container">
        <div className="row">
          <div className="col col--8 margin-vert--xl">
            <h1 className={styles.slogan}>
              <span>Simplify and optimize your</span>
              <span className={styles.slogan__highlight}>DevOps and DataOps</span>
            </h1>
            <p className={styles.description}>
            GlueOps platform streamlines and maximizes your business's DevOps and DataOps, enabling efficient management and accelerated growth.
            </p>
            <div className="padding-vert--md row">
              <div className="col col--5">
                <a href="/introduction" className="button button--lg button--block button--primary" onClick={
                () => logEvent('get_started_event', { event_category: 'Docs', event_label: "Docs button event"  })
              }>
                  Get Started
                </a>
              </div>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.illustration}>
              <div
                className={styles.illustration__container}
                style={{ backgroundImage: 'url("https://cdn.glueops.dev/doc-assets/v1/vector.svg")', width: "100%", height: "100%"}}
              >
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
