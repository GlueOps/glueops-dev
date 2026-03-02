import React from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

type BuildInfo = {
  branch?: string;
  tag?: string;
  sha?: string;
  timestamp?: string;
  ref?: string;
  shortSha?: string;
  summary?: string;
};

export default function Version(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const buildInfo = (siteConfig.customFields?.buildInfo || {}) as BuildInfo;
  const branch = buildInfo.branch || "none";
  const tag = buildInfo.tag || "none";
  const displayRef = buildInfo.tag || buildInfo.branch || "local";
  const shortSha = buildInfo.shortSha || (buildInfo.sha ? buildInfo.sha.slice(0, 7) : "dev");
  const fullSha = buildInfo.sha || "unknown";
  const timestamp = buildInfo.timestamp || "unknown";
  const timestampUtc =
    timestamp === "unknown" ? "unknown" : timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`;
  const summary = buildInfo.summary || `${displayRef}@${shortSha} | ${timestampUtc}`;

  return (
    <Layout title="Version" description="Build version details for GlueOps documentation.">
      <main className="container margin-vert--lg">
        <h1>Build Version</h1>
        <p>
          Use this page to verify the exact build currently served and to spot caching issues.
        </p>
        <table className="table">
          <tbody>
            <tr>
              <th>Version</th>
              <td>{summary}</td>
            </tr>
            <tr>
              <th>Ref (tag or branch)</th>
              <td>{tag !== "none" ? tag : branch}</td>
            </tr>
            <tr>
              <th>Tag</th>
              <td>{tag}</td>
            </tr>
            <tr>
              <th>Branch</th>
              <td>{branch}</td>
            </tr>
            <tr>
              <th>Commit</th>
              <td>
                <code>{fullSha}</code>
              </td>
            </tr>
            <tr>
              <th>Commit (short)</th>
              <td>
                <code>{shortSha}</code>
              </td>
            </tr>
            <tr>
              <th>Build time (UTC)</th>
              <td>{timestampUtc}</td>
            </tr>
          </tbody>
        </table>
      </main>
    </Layout>
  );
}
