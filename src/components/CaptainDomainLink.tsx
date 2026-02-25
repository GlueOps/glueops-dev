import React from 'react';
import type { ReactNode } from 'react';
import { useCaptainDomain } from '@site/src/contexts/CaptainDomainContext';

interface CaptainDomainLinkProps {
  /** URL template with {domain} placeholder, e.g. "https://cluster-info.{domain}" */
  to: string;
  /** Optional link text. If omitted, displays the resolved URL. */
  children?: ReactNode;
}

export default function CaptainDomainLink({ to, children }: CaptainDomainLinkProps) {
  const { captainDomain, isDefault } = useCaptainDomain();
  const resolvedUrl = to.replace('{domain}', captainDomain);
  const display = children ?? resolvedUrl;

  if (isDefault) {
    return (
      <span
        className="captain-domain-link captain-domain-link-disabled"
        title="Set your Captain Domain in the navigation bar to enable this link"
      >
        {display}
      </span>
    );
  }

  return (
    <a
      href={resolvedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="captain-domain-link captain-domain-custom"
    >
      {display}
    </a>
  );
}
