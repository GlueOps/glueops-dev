import React from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import isInternalUrl from '@docusaurus/isInternalUrl';
import IconExternalLink from '@theme/Icon/ExternalLink';
import { logEvent } from "../../../../analytics/analytics.js";
export default function FooterLinkItem({item}) {
  const {to, href, label, prependBaseUrlToHref, analytics, ...props} = item;
  const toUrl = useBaseUrl(to);
  const normalizedHref = useBaseUrl(href, {forcePrependBaseUrl: true});

  // gtag addition
  const handleClick = () => {
    logEvent(analytics.event_name, {event_category: analytics.event_category, event_label: analytics.event_label});
  }

  return (
    <Link
      className="footer__link-item"
      onClick={analytics && handleClick}
      {...(href
        ? {
            href: prependBaseUrlToHref ? normalizedHref : href,
          }
        : {
            to: toUrl,
          })}
      {...props}>
      {label}
      {href && !isInternalUrl(href) && <IconExternalLink />}
    </Link>
  );
}
