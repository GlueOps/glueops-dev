import {
  ArrowDownTrayIcon,
  Cog8ToothIcon,
  CogIcon,
  DocumentDuplicateIcon,
  InboxArrowDownIcon,
} from "@heroicons/react/24/outline";
import { CopyToClipboard } from "react-copy-to-clipboard";
import React, { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./hero-upgrade.module.css";
import { logEvent } from "../../analytics/analytics.js";

export default function HeroUpgrade(): JSX.Element {


  return (
    <section className="padding-vert--xl">
      <div className="container">
        <div className="row">
          <div className="col col--7--xl">
            <h1 className={styles.slogan}>
              <span>
                <span className={styles.slogan__highlight}>Upgrade</span> your
              </span>
              <span>Glueops experience</span>
            </h1>
            <p className={styles.description}>
            Reach out to us! We help buisness to make sure they get most out of their Glueops setup.
            </p>
            <div className={styles.reaching_out__link_container}>
                  <a href="mailto:hello@glueops.dev" target="_blank" 
                    onClick={
                      () => logEvent('email_event', { event_category: 'Email', event_label: "Email event"  })
                    }
                  >
                    <svg
                      style={{ height: "2rem", width: "2rem" }}
                      fill="currentColor"
                      role="img"
                      viewBox="0 0 8 6"
                      xmlns="http://www.w3.org/2000/svg"
                      className="margin-right--sm icon"
                    >
                      <title>Email</title>
                      <path d="m0 0h8v6h-8zm.75 .75v4.5h6.5v-4.5zM0 0l4 3 4-3v1l-4 3-4-3z" />
                    </svg>
          
                  </a>
                  <a href="https://github.com/GlueOps/glueops-dev" target="_blank"
                    onClick={
                      () => logEvent('github_event', { event_category: 'GitHub', event_label: "GitHub upgrade event"  })
                    }
                  >
                    
                    <svg
                      style={{ height: "2rem", width: "2rem",  }}
                      fill="currentColor"
                      role="img"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      className="margin-right--sm icon"
                    >
                      <title>GitHub</title>
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>

                  </a>
                </div>
          </div>
 
  
        </div>
      </div>
    </section>
  );
}
